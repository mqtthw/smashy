// Blocking hides posts and notifications both ways; mutes are private.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, cleanup, guest, hasDb, makeUser, type TestUser } from "./helpers";

describe.skipIf(!hasDb)("blocks and mutes", () => {
  let a: TestUser, b: TestUser, c: TestUser;
  let aPost = "", bPost = "";

  beforeAll(async () => {
    [a, b, c] = await Promise.all([makeUser("BlkA"), makeUser("BlkB"), makeUser("BlkC")]);
    aPost = (await a.c.from("posts").insert({ author_id: a.id, game: "melee", body: "a's post" }).select("id").single()).data!.id;
    bPost = (await b.c.from("posts").insert({ author_id: b.id, game: "melee", body: "b's post" }).select("id").single()).data!.id;
    await a.c.from("post_likes").insert({ post_id: bPost, user_id: a.id }); // b gets a like notification from a
  });
  afterAll(cleanup);

  const sees = async (u: TestUser, postId: string) => ((await u.c.from("posts").select("id").eq("id", postId)).data ?? []).length === 1;

  it("blocking hides each other's posts and the blocked person's notifications", async () => {
    expect(await sees(b, aPost)).toBe(true);
    expect((await b.c.from("notifications").select("id").eq("actor_id", a.id)).data?.length).toBeGreaterThan(0);

    expect((await b.c.from("blocks").insert({ blocker_id: b.id, blocked_id: a.id })).error).toBeNull();
    expect(await sees(b, aPost)).toBe(false);
    expect(await sees(a, bPost)).toBe(false);
    expect((await b.c.from("notifications").select("id").eq("actor_id", a.id)).data).toEqual([]);
    // Everyone else still sees both.
    expect(await sees(c, aPost)).toBe(true);
    expect(((await guest().from("posts").select("id").eq("id", bPost)).data ?? []).length).toBe(1);

    await b.c.from("blocks").delete().eq("blocker_id", b.id).eq("blocked_id", a.id);
    expect(await sees(b, aPost)).toBe(true);
  });

  it("you can only pin your own post; bookmarks are private", async () => {
    expect((await a.c.from("profiles").update({ pinned_post_id: aPost }).eq("id", a.id)).error).toBeNull();
    expect((await a.c.from("profiles").update({ pinned_post_id: bPost }).eq("id", a.id)).error?.message).toMatch(/only pin your own/);
    expect((await c.c.from("bookmarks").insert({ user_id: c.id, post_id: aPost })).error).toBeNull();
    expect((await a.c.from("bookmarks").select("*")).data).toEqual([]);
    expect((await c.c.from("bookmarks").insert({ user_id: a.id, post_id: bPost })).error).not.toBeNull();
  });

  it("posts can be edited by their author for 15 minutes", async () => {
    expect((await a.c.rpc("edit_post", { post: aPost, new_body: "a's post (fixed typo)" })).error).toBeNull();
    const { data } = await admin.from("posts").select("body, edited_at").eq("id", aPost).single();
    expect(data?.body).toBe("a's post (fixed typo)");
    expect(data?.edited_at).not.toBeNull();
    expect((await b.c.rpc("edit_post", { post: aPost, new_body: "hijacked" })).error?.message).toMatch(/your own posts/);
    await admin.from("posts").update({ created_at: new Date(Date.now() - 20 * 60e3).toISOString() }).eq("id", aPost);
    expect((await a.c.rpc("edit_post", { post: aPost, new_body: "too late" })).error?.message).toMatch(/15 minutes/);
  });

  it("@mentions notify the person; message requests notify the recipient", async () => {
    const { data: aProfile } = await admin.from("profiles").select("handle").eq("id", a.id).single();
    await c.c.from("posts").insert({ author_id: c.id, game: "melee", body: `gg @${aProfile!.handle}!` });
    expect((await a.c.from("notifications").select("type").eq("actor_id", c.id).eq("type", "mention")).data).toHaveLength(1);

    const { data: conv } = await b.c.rpc("start_direct", { other: c.id });
    await b.c.from("messages").insert({ conversation_id: conv, sender_id: b.id, body: "hi!" });
    expect((await c.c.from("notifications").select("type, conversation_id").eq("type", "message_request")).data).toEqual([{ type: "message_request", conversation_id: conv }]);
    await admin.from("conversations").delete().eq("id", conv);
  });

  it("mutes are private to the person muting", async () => {
    expect((await c.c.from("mutes").insert({ muter_id: c.id, muted_id: a.id })).error).toBeNull();
    expect((await a.c.from("mutes").select("*")).data).toEqual([]);
    expect((await c.c.from("mutes").insert({ muter_id: a.id, muted_id: c.id })).error).not.toBeNull();
    expect(await sees(c, aPost)).toBe(true); // muting doesn't hide their profile or posts, only feeds
    await admin.from("mutes").delete().eq("muter_id", c.id);
  });
});
