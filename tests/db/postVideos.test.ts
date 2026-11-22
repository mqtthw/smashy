// Videos on posts follow the post's privacy, only finished ones show, and only the server can add them.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, cleanup, guest, hasDb, makeUser, type TestUser } from "./helpers";

describe.skipIf(!hasDb)("post videos", () => {
  let adult: TestUser, teen: TestUser, other: TestUser;
  let adultPost = "", teenPost = "", pendingPost = "";

  async function postWithVideo(user: TestUser, body: string, status: "ready" | "uploading" = "ready") {
    const { data, error } = await user.c.from("posts").insert({ author_id: user.id, game: "melee", body }).select("id").single();
    if (error) throw error;
    const name = `test/${randomUUID()}`;
    const finished = status === "ready" ? { path: `${name}.mp4`, poster_path: `${name}.webp`, width: 720, height: 1280, duration_ms: 10000 } : {};
    const { error: ve } = await admin
      .from("post_videos")
      .insert({ user_id: user.id, post_id: data.id, status, raw_path: `${name}.mov`, attached_at: new Date().toISOString(), ...finished });
    if (ve) throw ve;
    return data.id as string;
  }

  beforeAll(async () => {
    [adult, teen, other] = await Promise.all([makeUser("VidAdult"), makeUser("VidTeen", { teen: true }), makeUser("VidOther")]);
    [adultPost, teenPost, pendingPost] = await Promise.all([
      postWithVideo(adult, "video test"),
      postWithVideo(teen, "teen video test"),
      postWithVideo(adult, "unfinished video test", "uploading"),
    ]);
  });

  afterAll(async () => {
    await admin.from("post_videos").delete().in("post_id", [adultPost, teenPost, pendingPost]);
    await cleanup();
  });

  const videos = (c: ReturnType<typeof guest>, postId: string) => c.from("post_videos").select("path").eq("post_id", postId);

  it("an adult's post video is public", async () => {
    expect((await videos(guest(), adultPost)).data).toHaveLength(1);
  });

  it("a teen's post video is hidden from guests, shown to signed-in players", async () => {
    expect((await videos(guest(), teenPost)).data).toHaveLength(0);
    expect((await videos(other.c, teenPost)).data).toHaveLength(1);
  });

  it("a video that isn't finished never shows", async () => {
    expect((await videos(guest(), pendingPost)).data).toHaveLength(0);
    expect((await videos(adult.c, pendingPost)).data).toHaveLength(0);
  });

  it("players can't add videos or move them onto someone else's post", async () => {
    const insert = await other.c.from("post_videos").insert({ user_id: other.id, post_id: adultPost, status: "ready", raw_path: `test/${randomUUID()}.mov` });
    expect(insert.error).not.toBeNull();
    await other.c.from("post_videos").update({ post_id: null }).eq("post_id", adultPost);
    expect((await videos(guest(), adultPost)).data).toHaveLength(1);
  });

  it("players can't upload straight into either video storage spot", async () => {
    const finished = await other.c.storage.from("post-videos").upload(`${other.id}/sneaky.mp4`, new Blob(["x"], { type: "video/mp4" }));
    expect(finished.error).not.toBeNull();
    const raw = await other.c.storage.from("post-video-uploads").upload(`${other.id}/sneaky.mp4`, new Blob(["x"], { type: "video/mp4" }));
    expect(raw.error).not.toBeNull();
  });

  it("a post has at most one video", async () => {
    const { error } = await admin.from("post_videos").insert({ user_id: adult.id, post_id: adultPost, status: "uploading", raw_path: `test/${randomUUID()}.mov` });
    expect(error).not.toBeNull();
  });

  it("a deleted post's video loses its post (so cleanup removes it)", async () => {
    const id = await postWithVideo(other, "to delete");
    await other.c.from("posts").delete().eq("id", id);
    const { data } = await admin.from("post_videos").select("post_id, attached_at").eq("user_id", other.id);
    expect(data?.every((r) => r.post_id === null && r.attached_at !== null)).toBe(true);
    await admin.from("post_videos").delete().eq("user_id", other.id);
  });
});
