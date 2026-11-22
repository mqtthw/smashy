// Reels upgrade: clip likes (public counts, private likers) and junk clips left out of the feed.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, cleanup, guest, hasDb, makeUser, type TestUser } from "./helpers";

describe.skipIf(!hasDb)("reels upgrade", () => {
  let a: TestUser, b: TestUser;
  let clip = "";
  beforeAll(async () => {
    [a, b] = await Promise.all([makeUser("RLA"), makeUser("RLB")]);
    const { data } = await guest().rpc("reels_page", { p_games: ["melee", "ultimate"], p_limit: 1 });
    clip = data[0].clip_id;
  });
  afterAll(async () => {
    await admin.from("reel_likes").delete().in("user_id", [a.id, b.id]);
    await cleanup();
  });

  it("likes are counted once per person, privately", async () => {
    const before = (await admin.from("reels").select("like_count").eq("clip_id", clip).single()).data!.like_count;
    expect((await a.c.from("reel_likes").insert({ user_id: a.id, clip_id: clip })).error).toBeNull();
    expect((await a.c.from("reel_likes").insert({ user_id: a.id, clip_id: clip })).error).not.toBeNull(); // once
    expect((await b.c.from("reel_likes").insert({ user_id: b.id, clip_id: clip })).error).toBeNull();
    expect((await admin.from("reels").select("like_count").eq("clip_id", clip).single()).data!.like_count).toBe(before + 2);
    expect((await b.c.from("reel_likes").select("user_id").eq("clip_id", clip)).data).toEqual([{ user_id: b.id }]); // only your own
    expect((await b.c.from("reel_likes").insert({ user_id: a.id, clip_id: clip })).error).not.toBeNull(); // not for someone else
    await b.c.from("reels").update({ like_count: 9999 }).eq("clip_id", clip); // no direct edits
    await a.c.from("reel_likes").delete().eq("user_id", a.id).eq("clip_id", clip);
    expect((await admin.from("reels").select("like_count").eq("clip_id", clip).single()).data!.like_count).toBe(before + 1);
  });

  it("junk clips stay out of the feed", async () => {
    const { data: junk } = await admin.from("reels").select("clip_id").eq("low_quality", true).limit(50);
    const { data: page } = await guest().rpc("reels_page", { p_games: ["melee", "ultimate", "pplus", "smash64", "brawl", "smash4"], p_limit: 50 });
    const shown = new Set((page ?? []).map((r: { clip_id: string }) => r.clip_id));
    expect((junk ?? []).some((j) => shown.has(j.clip_id))).toBe(false);
  });
});
