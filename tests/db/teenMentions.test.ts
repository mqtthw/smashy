// Under-18s can @mention people on Smashy; everything else in their posts is still checked for
// contact info (20261201100000_teen_mentions.sql).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, cleanup, hasDb, makeUser, type TestUser } from "./helpers";

describe.skipIf(!hasDb)("teen @mentions", () => {
  let teen: TestUser, adult: TestUser;
  let handle = "";
  let postId = "";
  const post = (body: string) => teen.c.from("posts").insert({ author_id: teen.id, game: "melee", body }).select("id").single();

  beforeAll(async () => {
    [teen, adult] = await Promise.all([makeUser("TmTeen", { teen: true }), makeUser("TmAdult")]);
    handle = (await admin.from("profiles").select("handle").eq("id", adult.id).single()).data!.handle;
  });
  afterAll(cleanup);

  it("a teen can mention someone who is on Smashy, and they're notified", async () => {
    const { data, error } = await post(`gg @${handle}! and @${handle.toUpperCase()}, rematch next week?`);
    expect(error).toBeNull();
    postId = data!.id;
    expect((await adult.c.from("notifications").select("type").eq("actor_id", teen.id).eq("type", "mention")).data).toHaveLength(1);
  });

  it("an @name that isn't a Smashy handle is still refused, and so is contact info around a real mention", async () => {
    expect((await post("follow @zz_not_a_smashy_user")).error?.message).toMatch(/contact info/);
    expect((await post(`add @${handle} on insta`)).error?.message).toMatch(/contact info/);
    expect((await post(`@${handle} text me 210-555-0142`)).error?.message).toMatch(/contact info/);
    expect((await post(`@${handle} check example.com`)).error?.message).toMatch(/contact info/);
  });

  it("editing follows the same rule", async () => {
    expect((await teen.c.rpc("edit_post", { post: postId, new_body: `ggs @${handle}, see you next week` })).error).toBeNull();
    expect((await teen.c.rpc("edit_post", { post: postId, new_body: `ggs @${handle}, my discord is tealeaf` })).error?.message).toMatch(/social handles/);
    expect((await teen.c.rpc("edit_post", { post: postId, new_body: "ggs @zz_not_a_smashy_user" })).error?.message).toMatch(/social handles/);
  });
});
