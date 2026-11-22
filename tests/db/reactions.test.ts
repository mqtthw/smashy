// Emoji reactions, scene membership and scene emojis.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, cleanup, guest, hasDb, makeUser, type TestUser } from "./helpers";

describe.skipIf(!hasDb)("reactions, membership and scene emojis", () => {
  let author: TestUser, fan: TestUser, teen: TestUser;
  let post: string, sceneId: string, approved: string, pending: string, pendingScene: string;

  beforeAll(async () => {
    author = await makeUser("RxAuthor");
    fan = await makeUser("RxFan");
    teen = await makeUser("RxTeen", { teen: true });
    post = (await author.c.from("posts").insert({ author_id: author.id, body: "react to me", game: "melee" }).select("id").single()).data!.id;
    const stamp = Date.now();
    sceneId = (await admin.from("scenes").insert({ slug: `testdb-scene-${stamp}`, name: "TestDb Scene", status: "active", cities: ["Test"] }).select("id").single()).data!.id;
    pendingScene = (await admin.from("scenes").insert({ slug: `testdb-pending-${stamp}`, name: "TestDb Pending", status: "pending", cities: ["Test"] }).select("id").single()).data!.id;
    approved = (await admin.from("scene_emojis").insert({ scene_id: sceneId, name: "testdb_hype", image_path: "test/none.png", status: "approved" }).select("id").single()).data!.id;
    pending = (await admin.from("scene_emojis").insert({ scene_id: sceneId, name: "testdb_wait", image_path: "test/none2.png" }).select("id").single()).data!.id;
  });
  afterAll(async () => {
    await cleanup();
    await admin.from("scenes").delete().in("id", [sceneId, pendingScene]);
  });

  const react = (u: TestUser, emoji: string) => u.c.from("post_reactions").insert({ post_id: post, user_id: u.id, emoji });

  it("allows emojis from the list and refuses anything else", async () => {
    expect((await react(fan, "🔥")).error).toBeNull();
    expect((await react(fan, "lol")).error?.message).toMatch(/isn't available/);
    expect((await react(fan, "❤️")).error).not.toBeNull(); // the heart is the separate like
  });

  it("keeps the post's reaction total and notifies the author", async () => {
    const { data: p } = await admin.from("posts").select("reaction_count").eq("id", post).single();
    expect(p!.reaction_count).toBe(1);
    const { data: n } = await author.c.from("notifications").select("type, emoji").eq("post_id", post);
    expect(n).toEqual([{ type: "reaction", emoji: "🔥" }]);
  });

  it("caps each person at 5 different reactions per post", async () => {
    for (const e of ["😂", "😮", "💀", "👏"]) expect((await react(fan, e)).error).toBeNull();
    expect((await react(fan, "🐐")).error?.message).toMatch(/up to 5/);
  });

  it("hides teen reactions from guests", async () => {
    expect((await react(teen, "🔥")).error).toBeNull();
    const { data } = await guest().from("post_reactions").select("user_id").eq("post_id", post);
    expect((data ?? []).map((r) => r.user_id)).not.toContain(teen.id);
    const { data: signedIn } = await author.c.from("post_reactions").select("user_id").eq("post_id", post);
    expect((signedIn ?? []).map((r) => r.user_id)).toContain(teen.id);
  });

  it("scene emojis: members only, approved only", async () => {
    expect((await react(author, `scene:${approved}`)).error?.message).toMatch(/Join that scene/);
    expect((await author.c.from("scene_members").insert({ scene_id: sceneId, user_id: author.id })).error).toBeNull();
    expect((await react(author, `scene:${approved}`)).error).toBeNull();
    expect((await react(author, `scene:${pending}`)).error?.message).toMatch(/isn't available/);
  });

  it("can't join a scene that isn't approved, or join as someone else", async () => {
    expect((await fan.c.from("scene_members").insert({ scene_id: pendingScene, user_id: fan.id })).error).not.toBeNull();
    expect((await fan.c.from("scene_members").insert({ scene_id: sceneId, user_id: author.id })).error).not.toBeNull();
  });

  it("players can't add or approve scene emojis themselves", async () => {
    expect((await fan.c.from("scene_emojis").insert({ scene_id: sceneId, name: "sneaky", image_path: "x.png", status: "approved" })).error).not.toBeNull();
    const { data } = await fan.c.from("scene_emojis").update({ status: "approved" }).eq("id", pending).select("id");
    expect(data ?? []).toEqual([]);
  });

  it("guests see approved scene emojis but not pending ones", async () => {
    const { data } = await guest().from("scene_emojis").select("id").eq("scene_id", sceneId);
    expect((data ?? []).map((e) => e.id)).toEqual([approved]);
  });

  it("removing a reaction updates the total and removes its notification", async () => {
    await fan.c.from("post_reactions").delete().eq("post_id", post).eq("user_id", fan.id).eq("emoji", "🔥");
    const { data: n } = await author.c.from("notifications").select("emoji").eq("post_id", post).eq("emoji", "🔥");
    expect((n ?? []).length).toBe(1); // the teen's 🔥 is still there
    const { data: p } = await admin.from("posts").select("reaction_count").eq("id", post).single();
    expect(p!.reaction_count).toBe(6); // fan's 4 left + teen's 1 + author's scene emoji 1
  });
});
