// Round 3: blocked reposts, mains, notification settings, message replies and reactions.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, cleanup, hasDb, makeUser, type TestUser } from "./helpers";

describe.skipIf(!hasDb)("round 3 rules", () => {
  let a: TestUser, b: TestUser, c: TestUser;
  let cPost = "";
  const convs: string[] = [];

  beforeAll(async () => {
    [a, b, c] = await Promise.all([makeUser("R3A"), makeUser("R3B"), makeUser("R3C")]);
    await admin.from("follows").insert([
      { follower_id: a.id, followee_id: b.id, status: "active" },
      { follower_id: b.id, followee_id: a.id, status: "active" },
    ]);
    cPost = (await c.c.from("posts").insert({ author_id: c.id, game: "melee", body: "c's post" }).select("id").single()).data!.id;
  });
  afterAll(async () => {
    if (convs.length) await admin.from("conversations").delete().in("id", convs);
    await cleanup();
  });

  it("a blocked person's reposts are hidden", async () => {
    expect((await a.c.from("reposts").insert({ post_id: cPost, user_id: a.id })).error).toBeNull();
    const seen = async () => ((await b.c.from("reposts").select("user_id").eq("post_id", cPost)).data ?? []).map((r) => r.user_id);
    expect(await seen()).toContain(a.id);
    await b.c.from("blocks").insert({ blocker_id: b.id, blocked_id: a.id });
    expect(await seen()).not.toContain(a.id);
    await b.c.from("blocks").delete().eq("blocker_id", b.id).eq("blocked_id", a.id);
    // (the block also removed their follows; put them back for the chat tests)
    await admin.from("follows").upsert([
      { follower_id: a.id, followee_id: b.id, status: "active" },
      { follower_id: b.id, followee_id: a.id, status: "active" },
    ]);
  });

  it("mains: up to 3, saved on your own profile", async () => {
    const three = [{ game: "melee", character: "fox" }, { game: "melee", character: "falco" }, { game: "ultimate", character: "cloud" }];
    expect((await a.c.from("profiles").update({ mains: three }).eq("id", a.id)).error).toBeNull();
    expect((await a.c.from("profiles").update({ mains: [...three, { game: "melee", character: "marth" }] }).eq("id", a.id)).error).not.toBeNull();
  });

  it("switched-off notification types don't show", async () => {
    expect((await b.c.from("post_likes").insert({ post_id: cPost, user_id: b.id })).error).toBeNull();
    const likes = async () => ((await c.c.from("notifications").select("type").eq("type", "like")).data ?? []).length;
    expect(await likes()).toBe(1);
    await c.c.from("profiles").update({ notification_mutes: ["like"] }).eq("id", c.id);
    expect(await likes()).toBe(0);
    expect((await c.c.from("profiles").update({ notification_mutes: ["not-a-type"] }).eq("id", c.id)).error).not.toBeNull();
  });

  it("replies stay in the same chat; reactions are for chat members only", async () => {
    const { data: conv } = await a.c.rpc("start_direct", { other: b.id });
    convs.push(conv);
    const first = (await a.c.from("messages").insert({ conversation_id: conv, sender_id: a.id, body: "gg" }).select("id").single()).data!.id;
    expect((await b.c.from("messages").insert({ conversation_id: conv, sender_id: b.id, body: "ggs!", reply_to_id: first })).error).toBeNull();

    const { data: other } = await c.c.rpc("start_direct", { other: b.id });
    convs.push(other);
    expect((await c.c.from("messages").insert({ conversation_id: other, sender_id: c.id, body: "hi", reply_to_id: first })).error?.message).toMatch(/same chat/);

    expect((await b.c.from("message_reactions").insert({ message_id: first, user_id: b.id, emoji: "🔥" })).error).toBeNull();
    expect((await b.c.from("message_reactions").insert({ message_id: first, user_id: b.id, emoji: "💩" })).error).not.toBeNull();
    expect((await c.c.from("message_reactions").insert({ message_id: first, user_id: c.id, emoji: "👍" })).error).not.toBeNull();
    expect((await c.c.from("message_reactions").select("*").eq("message_id", first)).data).toEqual([]);
    expect((await a.c.from("message_reactions").select("emoji").eq("message_id", first)).data).toEqual([{ emoji: "🔥" }]);
  });
});
