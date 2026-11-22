// Rate limits and running totals.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, cleanup, hasDb, makeUser, type TestUser } from "./helpers";

describe.skipIf(!hasDb)("rate limits", () => {
  let spammer: TestUser, author: TestUser;
  let post: string;

  beforeAll(async () => {
    spammer = await makeUser("Spam");
    author = await makeUser("Author");
    post = (await author.c.from("posts").insert({ author_id: author.id, body: "rate test", game: "melee" }).select("id").single()).data!.id;
  });
  afterAll(cleanup);

  it("like/unlike loops are capped (60 likes per 5 minutes)", async () => {
    let blockedAt = -1;
    for (let i = 0; i < 62; i++) {
      const { error } = await spammer.c.from("post_likes").insert({ post_id: post, user_id: spammer.id });
      if (error) {
        blockedAt = i;
        expect(error.message).toMatch(/too fast/);
        break;
      }
      await spammer.c.from("post_likes").delete().eq("post_id", post).eq("user_id", spammer.id);
    }
    expect(blockedAt).toBe(60);
  });

  it("reports are capped at 10 an hour", async () => {
    // 11 posts to report, made by the server and dated a few minutes ago so they don't trip the
    // author's own "5 posts a minute" limit.
    const rows = Array.from({ length: 11 }, (_, i) => ({
      author_id: author.id,
      body: `report target ${i}`,
      game: "melee",
      created_at: new Date(Date.now() - (i + 2) * 60_000).toISOString(),
    }));
    const posts = ((await admin.from("posts").insert(rows).select("id")).data ?? []).map((r) => r.id);
    expect(posts).toHaveLength(11);
    const results = [];
    for (const id of posts) {
      results.push((await spammer.c.from("post_reports").insert({ post_id: id, reporter_id: spammer.id, reason: "spam" })).error?.code ?? "ok");
    }
    expect(results.slice(0, 10).every((r) => r === "ok")).toBe(true);
    expect(results[10]).toBe("P0429");
  });

  it("new accounts can make 10 posts an hour; older accounts aren't held to that", async () => {
    const fresh = await makeUser("Fresh");
    // 9 posts made by the server, dated 5–45 minutes ago (server inserts aren't limited).
    const rows = Array.from({ length: 9 }, (_, i) => ({
      author_id: fresh.id,
      body: `new account ${i}`,
      game: "melee",
      created_at: new Date(Date.now() - (i + 1) * 5 * 60_000).toISOString(),
    }));
    expect((await admin.from("posts").insert(rows)).error).toBeNull();
    const post = () => fresh.c.from("posts").insert({ author_id: fresh.id, body: "one more", game: "melee" });
    expect((await post()).error).toBeNull(); // the 10th this hour
    const blocked = (await post()).error;
    expect(blocked?.code).toBe("P0429");
    expect(blocked?.message).toMatch(/^New accounts can post 10 times an hour/);
    // Once the account is over a week old, the hourly limit no longer applies.
    const eightDaysAgo = new Date(Date.now() - 8 * 86_400_000).toISOString();
    expect((await admin.from("profiles").update({ created_at: eightDaysAgo }).eq("id", fresh.id)).error).toBeNull();
    expect((await post()).error).toBeNull();
  });

  it("other people aren't affected by someone else's limit", async () => {
    expect((await author.c.from("post_likes").insert({ post_id: post, user_id: author.id })).error).toBeNull();
  });
});

describe.skipIf(!hasDb)("running totals used by For You", () => {
  let a: TestUser, b: TestUser;
  beforeAll(async () => {
    a = await makeUser("TotA");
    b = await makeUser("TotB");
  });
  afterAll(cleanup);

  it("likes, replies, reposts and quotes keep the post's totals right", async () => {
    const id = (await a.c.from("posts").insert({ author_id: a.id, body: "totals", game: "melee" }).select("id").single()).data!.id;
    await b.c.from("post_likes").insert({ post_id: id, user_id: b.id });
    await b.c.from("posts").insert({ author_id: b.id, body: "reply", game: "melee", parent_id: id });
    await b.c.from("reposts").insert({ post_id: id, user_id: b.id });
    const t1 = (await admin.from("posts").select("like_count, reply_count, repost_count").eq("id", id).single()).data;
    expect(t1).toEqual({ like_count: 1, reply_count: 1, repost_count: 1 });
    await b.c.from("post_likes").delete().eq("post_id", id).eq("user_id", b.id);
    await b.c.from("reposts").delete().eq("post_id", id).eq("user_id", b.id);
    const t2 = (await admin.from("posts").select("like_count, repost_count").eq("id", id).single()).data;
    expect(t2).toEqual({ like_count: 0, repost_count: 0 });
  });

  it("players can't set their own totals", async () => {
    const { error } = await a.c.from("posts").insert({ author_id: a.id, body: "fake", game: "melee", like_count: 9999 });
    expect(error).not.toBeNull();
  });
});
