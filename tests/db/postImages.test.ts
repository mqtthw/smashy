// Photos on posts follow the post's privacy, and only the server can add them.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, cleanup, guest, hasDb, makeUser, type TestUser } from "./helpers";

describe.skipIf(!hasDb)("post images", () => {
  let adult: TestUser, teen: TestUser, other: TestUser;
  let adultPost = "", teenPost = "";

  async function postWithImage(user: TestUser, body: string) {
    const { data, error } = await user.c.from("posts").insert({ author_id: user.id, game: "melee", body }).select("id").single();
    if (error) throw error;
    const { error: ie } = await admin
      .from("post_images")
      .insert({ user_id: user.id, post_id: data.id, path: `test/${randomUUID()}.webp`, width: 10, height: 10, attached_at: new Date().toISOString() });
    if (ie) throw ie;
    return data.id as string;
  }

  beforeAll(async () => {
    [adult, teen, other] = await Promise.all([makeUser("ImgAdult"), makeUser("ImgTeen", { teen: true }), makeUser("ImgOther")]);
    [adultPost, teenPost] = await Promise.all([postWithImage(adult, "photo test"), postWithImage(teen, "teen photo test")]);
  });

  afterAll(async () => {
    await admin.from("post_images").delete().in("post_id", [adultPost, teenPost]);
    await cleanup();
  });

  const images = (c: ReturnType<typeof guest>, postId: string) => c.from("post_images").select("path").eq("post_id", postId);

  it("an adult's post photos are public", async () => {
    expect((await images(guest(), adultPost)).data).toHaveLength(1);
  });

  it("a teen's post photos are hidden from guests, shown to signed-in players", async () => {
    expect((await images(guest(), teenPost)).data).toHaveLength(0);
    expect((await images(other.c, teenPost)).data).toHaveLength(1);
  });

  it("players can't add photos or move them onto someone else's post", async () => {
    const insert = await other.c.from("post_images").insert({ user_id: other.id, post_id: adultPost, path: `test/${randomUUID()}.webp`, width: 1, height: 1 });
    expect(insert.error).not.toBeNull();
    await other.c.from("post_images").update({ post_id: null }).eq("post_id", adultPost);
    expect((await images(guest(), adultPost)).data).toHaveLength(1);
  });

  it("players can't upload straight into the photo storage", async () => {
    const { error } = await other.c.storage.from("post-images").upload(`${other.id}/sneaky.webp`, new Blob(["x"], { type: "image/webp" }));
    expect(error).not.toBeNull();
  });

  it("a deleted post's photos lose their post (so cleanup removes them)", async () => {
    const id = await postWithImage(other, "to delete");
    await other.c.from("posts").delete().eq("id", id);
    const { data } = await admin.from("post_images").select("post_id, attached_at").eq("user_id", other.id);
    expect(data?.every((r) => r.post_id === null && r.attached_at !== null)).toBe(true);
    await admin.from("post_images").delete().eq("user_id", other.id);
  });
});
