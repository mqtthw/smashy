// Feed rules: what shows on the main feed, and what stays on its own page.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, cleanup, hasDb, makeUser, type TestUser } from "./helpers";

describe.skipIf(!hasDb)("feed rules", () => {
  let a: TestUser, b: TestUser;
  let refId: string;
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    a = await makeUser("FeedA");
    b = await makeUser("FeedB");
    refId = (await admin.from("set_refs").insert({ source: "startgg", external_id: `testdb-${Date.now()}`, p1_name: "A", p2_name: "B" }).select("id").single()).data!.id;
    const post = async (key: string, extra: object) =>
      (ids[key] = (await a.c.from("posts").insert({ author_id: a.id, body: key, game: "melee", ...extra }).select("id").single()).data!.id);
    await post("plain", {});
    await post("setComment", { set_ref_id: refId });
    await post("setQuote", { quote_set_id: refId });
    await b.c.from("follows").insert({ follower_id: b.id, followee_id: a.id });
  });
  afterAll(async () => {
    await cleanup();
    await admin.from("set_refs").delete().eq("id", refId);
  });

  const feedIds = async (view: "feed_items" | "following_feed_items") =>
    ((await b.c.from(view).select("post_id").is("ruleset_id", null).is("set_ref_id", null).is("reel_clip_id", null)).data ?? []).map((r) => r.post_id);

  it("set comments stay off the feed; posts sharing a set show", async () => {
    const feed = await feedIds("feed_items");
    expect(feed).toContain(ids.plain);
    expect(feed).toContain(ids.setQuote);
    expect(feed).not.toContain(ids.setComment);
  });

  it("Following shows people you follow", async () => {
    expect(await feedIds("following_feed_items")).toContain(ids.plain);
  });

  it("For You skips set comments", async () => {
    const { data, error } = await b.c.rpc("for_you_feed", { p_limit: 50 });
    expect(error).toBeNull();
    const got = (data ?? []).map((r: { post_id: string }) => r.post_id);
    expect(got).toContain(ids.plain);
    expect(got).not.toContain(ids.setComment);
  });

  it("liking one post about a character doesn't make that post 'Because you're into…'", async () => {
    const id = (await a.c.from("posts").insert({ author_id: a.id, body: "falco tech", game: "melee", character: "falco" }).select("id").single()).data!.id;
    await b.c.from("post_likes").insert({ post_id: id, user_id: b.id });
    const { data } = await b.c.rpc("for_you_feed", { p_limit: 50 });
    const row = (data ?? []).find((r: { post_id: string }) => r.post_id === id) as { reason: string | null } | undefined;
    expect(row?.reason).not.toBe("character");
  });

  it("'Not interested' removes a post from For You", async () => {
    await b.c.from("post_dismissals").insert({ user_id: b.id, post_id: ids.plain });
    const { data } = await b.c.rpc("for_you_feed", { p_limit: 50 });
    expect((data ?? []).map((r: { post_id: string }) => r.post_id)).not.toContain(ids.plain);
  });
});
