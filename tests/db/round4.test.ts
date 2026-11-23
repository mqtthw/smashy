// Round 4: polls, "I'm going", muted words, saved clips, profile fields, invite attempts.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, cleanup, guest, hasDb, makeUser, type TestUser } from "./helpers";

describe.skipIf(!hasDb)("round 4 rules", () => {
  let a: TestUser, b: TestUser, c: TestUser, teen: TestUser;
  let pollPost = "";
  const ref = `test/round4-${Date.now()}`;

  beforeAll(async () => {
    [a, b, c, teen] = await Promise.all([makeUser("R4A"), makeUser("R4B"), makeUser("R4C"), makeUser("R4Teen", { teen: true })]);
    // a and b follow each other; c follows a (one way).
    await admin.from("follows").insert([
      { follower_id: a.id, followee_id: b.id, status: "active" },
      { follower_id: b.id, followee_id: a.id, status: "active" },
      { follower_id: c.id, followee_id: a.id, status: "active" },
      { follower_id: a.id, followee_id: teen.id, status: "active" },
      { follower_id: teen.id, followee_id: a.id, status: "active" },
    ]);
    pollPost = (await a.c.from("posts").insert({ author_id: a.id, game: "melee", body: "Best Melee character?" }).select("id").single()).data!.id;
  });
  afterAll(cleanup);

  it("only the author adds a poll to their new post, with 2-4 choices", async () => {
    const closes = new Date(Date.now() + 24 * 3600e3).toISOString();
    expect((await b.c.from("polls").insert({ post_id: pollPost, options: ["Fox", "Marth"], closes_at: closes })).error).not.toBeNull();
    expect((await a.c.from("polls").insert({ post_id: pollPost, options: ["Fox"], closes_at: closes })).error).not.toBeNull();
    expect((await a.c.from("polls").insert({ post_id: pollPost, options: ["Fox", "Marth", "Puff"], closes_at: closes })).error).toBeNull();
  });

  it("people vote once, can't see who voted, and totals are shared", async () => {
    expect((await b.c.from("poll_votes").insert({ post_id: pollPost, user_id: b.id, choice: 1 })).error).toBeNull();
    expect((await b.c.from("poll_votes").insert({ post_id: pollPost, user_id: b.id, choice: 0 })).error).not.toBeNull();
    expect((await c.c.from("poll_votes").insert({ post_id: pollPost, user_id: c.id, choice: 3 })).error).not.toBeNull(); // no 4th choice
    expect((await c.c.from("poll_votes").insert({ post_id: pollPost, user_id: c.id, choice: 1 })).error).toBeNull();
    expect((await c.c.from("poll_votes").select("user_id").eq("post_id", pollPost)).data).toEqual([{ user_id: c.id }]); // only their own
    const { data } = await guest().rpc("poll_results", { posts: [pollPost] });
    expect(data).toEqual([{ post_id: pollPost, choice: 1, votes: 2 }]);
  });

  it("closed polls take no votes", async () => {
    // An hour ago, so a clock difference between this computer and the database doesn't matter.
    await admin.from("polls").update({ closes_at: new Date(Date.now() - 3600e3).toISOString() }).eq("post_id", pollPost);
    expect((await a.c.from("poll_votes").insert({ post_id: pollPost, user_id: a.id, choice: 0 })).error).not.toBeNull();
  });

  it("RSVPs are private; others see a total and only mutuals in their age group", async () => {
    const row = (u: TestUser) => ({ user_id: u.id, event_kind: "tournament", event_ref: ref, event_name: "Test event", starts_at: new Date(Date.now() + 86400e3).toISOString() });
    for (const u of [b, c, teen]) expect((await u.c.from("event_rsvps").insert(row(u))).error).toBeNull();
    expect((await b.c.from("event_rsvps").insert({ ...row(b), user_id: c.id })).error).not.toBeNull(); // not for someone else
    expect((await a.c.from("event_rsvps").select("user_id").eq("event_ref", ref)).data).toEqual([]); // can't list others
    const { data } = await a.c.rpc("event_going", { kind: "tournament", ref });
    expect(Number(data[0].total)).toBe(3);
    const names = (data[0].friends as { tag: string }[]).map((f) => f.tag);
    expect(names).toEqual(["TestDbR4B"]); // c isn't a mutual; the teen is a mutual but in another age group
    const anon = await guest().rpc("event_going", { kind: "tournament", ref });
    expect(anon.data[0].friends).toEqual([]);
  });

  // Round 730. Runs after the test above: b, c and the teen are going.
  it("an RSVP can be 'interested': counted apart from going, switchable by its owner only", async () => {
    const mine = () => c.c.from("event_rsvps").update({ status: "interested" }).eq("user_id", c.id).eq("event_kind", "tournament").eq("event_ref", ref).select("status");
    expect((await mine()).data).toEqual([{ status: "interested" }]);
    const { data } = await a.c.rpc("event_going", { kind: "tournament", ref });
    expect([Number(data[0].total), Number(data[0].interested)]).toEqual([2, 1]);
    // Not someone else's, not a made-up status, and no other column.
    expect((await a.c.from("event_rsvps").update({ status: "interested" }).eq("user_id", b.id).eq("event_ref", ref).select("status")).data).toEqual([]);
    expect((await c.c.from("event_rsvps").update({ status: "maybe" }).eq("user_id", c.id).eq("event_ref", ref)).error).not.toBeNull();
    expect((await c.c.from("event_rsvps").update({ event_name: "Renamed" }).eq("user_id", c.id).eq("event_ref", ref)).error).not.toBeNull();
    // A friend who is only interested isn't listed under "friends going".
    await b.c.from("event_rsvps").update({ status: "interested" }).eq("user_id", b.id).eq("event_kind", "tournament").eq("event_ref", ref);
    expect(((await a.c.rpc("event_going", { kind: "tournament", ref })).data[0].friends as unknown[]).length).toBe(0);
  });

  it("muted words and saved clips are private", async () => {
    expect((await a.c.from("muted_words").upsert({ user_id: a.id, words: ["spoilers"] })).error).toBeNull();
    expect((await b.c.from("muted_words").select("words").eq("user_id", a.id)).data).toEqual([]);
    const { data: clip } = await admin.from("reels").select("clip_id").limit(1).maybeSingle();
    if (clip) {
      expect((await a.c.from("saved_clips").insert({ user_id: a.id, clip_id: clip.clip_id })).error).toBeNull();
      expect((await b.c.from("saved_clips").select("clip_id").eq("user_id", a.id)).data).toEqual([]);
    }
  });

  it("people set their own crew and doubles status (40 characters max)", async () => {
    expect((await a.c.from("profiles").update({ crew: "UTSA Smash Club", lfg_doubles: true }).eq("id", a.id)).error).toBeNull();
    expect((await a.c.from("profiles").update({ crew: "x".repeat(41) }).eq("id", a.id)).error).not.toBeNull();
    await b.c.from("profiles").update({ crew: "hacked" }).eq("id", a.id);
    expect((await admin.from("profiles").select("crew").eq("id", a.id).single()).data!.crew).toBe("UTSA Smash Club");
  });
});
