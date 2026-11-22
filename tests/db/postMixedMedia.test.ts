// Photos and videos together on a post (round 450): up to 2 videos per post, each in its own place in
// the post's order, alongside photos. Only the server writes these tables, so the test uses the admin
// client the way the server does.
import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { admin, cleanup, hasDb, makeUser } from "./helpers";

describe.skipIf(!hasDb)("mixed media on posts", () => {
  afterAll(cleanup);

  it("takes up to 2 videos per post, in their own places, next to photos", async () => {
    const u = await makeUser("MmPoster");
    const { data: post, error } = await u.c.from("posts").insert({ author_id: u.id, body: "photos and videos" }).select("id").single();
    expect(error).toBeNull();
    const video = (position: number) => ({
      user_id: u.id, post_id: post!.id, position, status: "ready", raw_path: `${u.id}/${randomUUID()}.mp4`,
      path: `${u.id}/${randomUUID()}.mp4`, poster_path: `${u.id}/${randomUUID()}.webp`, width: 640, height: 360, duration_ms: 5000,
    });
    expect((await admin.from("post_images").insert({ user_id: u.id, post_id: post!.id, position: 0, path: `${u.id}/${randomUUID()}.webp`, width: 10, height: 10 })).error).toBeNull();
    expect((await admin.from("post_videos").insert(video(1))).error).toBeNull();
    expect((await admin.from("post_videos").insert(video(1))).error).not.toBeNull(); // same place twice
    expect((await admin.from("post_videos").insert(video(2))).error).toBeNull();
    const third = await admin.from("post_videos").insert(video(3));
    expect(third.error?.message).toMatch(/at most 2 videos/);

    // Readers see both videos with their places (the post is public).
    const { data } = await u.c.from("posts").select("videos:post_videos ( position ), images:post_images ( position )").eq("id", post!.id).single();
    expect((data!.videos as { position: number }[]).map((v) => v.position).sort()).toEqual([1, 2]);
    expect((data!.images as { position: number }[]).map((i) => i.position)).toEqual([0]);

    await admin.from("post_videos").delete().eq("post_id", post!.id);
    await admin.from("post_images").delete().eq("post_id", post!.id);
  });
});
