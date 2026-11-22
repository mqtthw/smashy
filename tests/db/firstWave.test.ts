// First wave: discussion threads, replies to replies, spoilers, matchup tags, push subscriptions.
import { afterAll, describe, expect, it } from "vitest";
import { admin, cleanup, guest, hasDb, makeUser } from "./helpers";

describe.skipIf(!hasDb)("first wave", () => {
  afterAll(cleanup);

  it("threads: a title and flair, up to 5000 characters; normal posts stay at 500", async () => {
    const u = await makeUser("FwThread");
    const long = "x".repeat(2000);
    const ok = await u.c.from("posts").insert({ author_id: u.id, game: "melee", title: "How do you beat Marth?", flair: "question", body: long }).select("id").single();
    expect(ok.error).toBeNull();
    expect((await u.c.from("posts").insert({ author_id: u.id, game: "melee", body: long })).error).not.toBeNull(); // no title: 500 max
    expect((await u.c.from("posts").insert({ author_id: u.id, game: "melee", title: "Bad", flair: "rant", body: "hi" })).error).not.toBeNull(); // unknown flair
    expect((await u.c.from("posts").insert({ author_id: u.id, parent_id: ok.data!.id, title: "Reply title", body: "hi" })).error).not.toBeNull(); // replies can't have titles
    // Search finds the title.
    const { data: found } = await u.c.from("posts").select("id").textSearch("search_vec", "Marth", { type: "websearch", config: "english" });
    expect(found?.some((r) => r.id === ok.data!.id)).toBe(true);
  });

  it("replies to replies: same thread only, and the replied-to author is notified", async () => {
    const [op, a, b] = await Promise.all([makeUser("FwOp"), makeUser("FwA"), makeUser("FwB")]);
    const { data: thread } = await op.c.from("posts").insert({ author_id: op.id, game: "melee", title: "Best Fox tips?", flair: "discussion", body: "Share yours" }).select("id").single();
    const { data: other } = await op.c.from("posts").insert({ author_id: op.id, game: "melee", body: "another post" }).select("id").single();
    const { data: r1 } = await a.c.from("posts").insert({ author_id: a.id, parent_id: thread!.id, body: "Shine OOS" }).select("id").single();
    const nested = await b.c.from("posts").insert({ author_id: b.id, parent_id: thread!.id, reply_to: r1!.id, body: "Agreed" }).select("id").single();
    expect(nested.error).toBeNull();
    // reply_to from another thread is refused.
    expect((await b.c.from("posts").insert({ author_id: b.id, parent_id: other!.id, reply_to: r1!.id, body: "wrong thread" })).error).not.toBeNull();
    const { data: notes } = await admin.from("notifications").select("type, post_id").eq("user_id", a.id);
    expect(notes?.some((n) => n.type === "reply" && n.post_id === nested.data!.id)).toBe(true);
  });

  it("spoiler flag and matchup tags save", async () => {
    const u = await makeUser("FwSpoil");
    const { data, error } = await u.c.from("posts").insert({ author_id: u.id, game: "melee", character: "fox", vs_character: "marth", spoiler: true, body: "Top 8 thoughts" }).select("spoiler, vs_character").single();
    expect(error).toBeNull();
    expect(data).toEqual({ spoiler: true, vs_character: "marth" });
    const h = await u.c.from("highlights").insert({ author_id: u.id, type: "vod", title: "Fox vs Marth set", game: "melee", character: "fox", vs_character: "marth", url: "https://youtu.be/dQw4w9WgXcQ" }).select("type, vs_character").single();
    expect(h.error).toBeNull();
    expect(h.data).toEqual({ type: "vod", vs_character: "marth" });
  });

  it("push subscriptions: your own only; the push config is never readable", async () => {
    const [a, b] = await Promise.all([makeUser("FwPushA"), makeUser("FwPushB")]);
    const endpoint = `https://fcm.googleapis.com/fcm/send/test-${a.id}`; // only real push services are accepted
    expect((await a.c.from("push_subscriptions").insert({ user_id: a.id, endpoint, p256dh: "key", auth: "auth" })).error).toBeNull();
    expect((await b.c.from("push_subscriptions").insert({ user_id: a.id, endpoint: `${endpoint}/x`, p256dh: "k", auth: "a" })).error).not.toBeNull(); // not for someone else
    expect((await b.c.from("push_subscriptions").select("id").eq("endpoint", endpoint)).data).toEqual([]);
    expect((await a.c.from("push_subscriptions").select("id").eq("endpoint", endpoint)).data).toHaveLength(1);
    expect((await a.c.from("push_config").select("*")).data ?? []).toEqual([]);
    expect((await guest().from("push_config").select("*")).data ?? []).toEqual([]);
    await admin.from("push_subscriptions").delete().eq("endpoint", endpoint);
  });
});
