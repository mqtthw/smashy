// Clips shared for Reels: who can see submissions, and what an approved shared clip shows.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, cleanup, guest, hasDb, makeUser, type TestUser } from "./helpers";

describe.skipIf(!hasDb)("shared clips", () => {
  let sharer: TestUser, other: TestUser, teen: TestUser;
  const tag = randomUUID().slice(0, 6);
  const channel = `testdb_ch_${tag}`;
  const sharedClip = `TestDbShared-${tag}`;
  const teenClip = `TestDbTeen-${tag}`;
  const collectedClip = `TestDbCollected-${tag}`;
  let submissionId = "";

  beforeAll(async () => {
    [sharer, other, teen] = await Promise.all([makeUser("ClipSharer"), makeUser("ClipOther"), makeUser("ClipTeen", { teen: true })]);
    const { data, error } = await admin
      .from("reel_submissions")
      .insert({ user_id: sharer.id, platform: "twitch", clip_id: sharedClip, game: "melee", channel_login: channel, clip_created_at: new Date().toISOString() })
      .select("id")
      .single();
    if (error) throw error;
    submissionId = data.id;
    // A channel nobody approved for collecting, with one shared (approved) clip from a teen and one collected clip.
    await admin.from("reel_channels").insert({ login: channel, platform: "twitch", source: "submitted" });
    const base = { platform: "twitch", channel_login: channel, game: "melee", created_at: new Date().toISOString() };
    const { error: re } = await admin.from("reels").insert([
      { ...base, clip_id: teenClip, submitted_by: teen.id, submitted_at: new Date().toISOString() },
      { ...base, clip_id: collectedClip },
    ]);
    if (re) throw re;
  });

  afterAll(async () => {
    await admin.from("reels").delete().in("clip_id", [teenClip, collectedClip]);
    await admin.from("reel_channels").delete().eq("login", channel);
    await cleanup(); // deletes the submission with its account
  });

  it("only the person who shared a clip can see their submission", async () => {
    expect((await sharer.c.from("reel_submissions").select("id").eq("id", submissionId)).data).toHaveLength(1);
    expect((await other.c.from("reel_submissions").select("id").eq("id", submissionId)).data).toHaveLength(0);
    expect((await guest().from("reel_submissions").select("id").eq("id", submissionId)).error?.message ?? "").toMatch(/permission denied/);
  });

  it("players can't add or approve submissions themselves", async () => {
    const insert = await other.c
      .from("reel_submissions")
      .insert({ user_id: other.id, platform: "twitch", clip_id: `TestDbSneaky-${tag}`, game: "melee", channel_login: channel, clip_created_at: new Date().toISOString() });
    expect(insert.error).not.toBeNull();
    await sharer.c.from("reel_submissions").update({ status: "approved" }).eq("id", submissionId);
    const { data } = await admin.from("reel_submissions").select("status").eq("id", submissionId).single();
    expect(data?.status).toBe("pending");
  });

  it("an approved shared clip shows even if its channel isn't approved; collected clips from it don't", async () => {
    const { data } = await guest().from("reels").select("clip_id").in("clip_id", [teenClip, collectedClip]);
    expect(data?.map((r) => r.clip_id)).toEqual([teenClip]);
  });

  it("a teen's name on a shared clip is hidden from guests, shown to signed-in players", async () => {
    const q = (c: ReturnType<typeof guest>) =>
      c.from("reels").select("clip_id, sharer:profiles!reels_submitted_by_fkey ( tag )").eq("clip_id", teenClip).single();
    expect((await q(guest())).data?.sharer).toBeNull();
    expect((await q(other.c)).data?.sharer).not.toBeNull();
  });

  it("a blocked channel hides shared clips too", async () => {
    await admin.from("reel_channels").update({ blocked: true }).eq("login", channel);
    const { data } = await other.c.from("reels").select("clip_id").eq("clip_id", teenClip);
    expect(data).toHaveLength(0);
    await admin.from("reel_channels").update({ blocked: false }).eq("login", channel);
  });
});
