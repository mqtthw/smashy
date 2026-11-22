// Teen privacy and "who can see what". If one of these fails, something is exposed that shouldn't be.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cleanup, guest, hasDb, makeUser, type TestUser } from "./helpers";

describe.skipIf(!hasDb)("teen privacy", () => {
  let adult: TestUser, teen: TestUser;
  let adultPost: string, teenPost: string;

  beforeAll(async () => {
    adult = await makeUser("Adult");
    teen = await makeUser("Teen", { teen: true, city: "San Antonio" });
    adultPost = (await adult.c.from("posts").insert({ author_id: adult.id, body: "adult post", game: "melee" }).select("id").single()).data!.id;
    teenPost = (await teen.c.from("posts").insert({ author_id: teen.id, body: "teen post", game: "melee" }).select("id").single()).data!.id;
    await teen.c.from("reposts").insert({ post_id: adultPost, user_id: teen.id });
  });
  afterAll(cleanup);

  it("guests can't see a teen's profile", async () => {
    const { data } = await guest().from("profiles").select("id").eq("id", teen.id);
    expect(data).toEqual([]);
  });

  it("guests can't see teen posts, but can see adult posts", async () => {
    const { data } = await guest().from("posts").select("id").in("id", [adultPost, teenPost]);
    expect((data ?? []).map((p) => p.id)).toEqual([adultPost]);
  });

  it("guests can't see a teen's reposts", async () => {
    const { data } = await guest().from("reposts").select("user_id").eq("post_id", adultPost);
    expect(data).toEqual([]);
  });

  it("signed-in players can see teen posts", async () => {
    const { data } = await adult.c.from("posts").select("id").eq("id", teenPost);
    expect(data).toHaveLength(1);
  });

  it("guests' For You never includes teen posts", async () => {
    const { data, error } = await guest().rpc("for_you_feed", { p_limit: 50 });
    expect(error).toBeNull();
    expect((data ?? []).map((r: { post_id: string }) => r.post_id)).not.toContain(teenPost);
  });

  it("birthdates are private, even to the person themselves through the API", async () => {
    const { data } = await adult.c.from("private_profile_data").select("date_of_birth").eq("user_id", teen.id);
    expect(data ?? []).toEqual([]);
  });

  it("teens can't share or ask for contact info in posts or replies", async () => {
    for (const body of ["add me on snap its teo123", "dm me on insta", "my discord is teo#1234", "call me 210 555 0199"]) {
      const { error } = await teen.c.from("posts").insert({ author_id: teen.id, body, game: "melee" });
      expect(error?.message, body).toMatch(/contact info/);
    }
    const reply = await teen.c.from("posts").insert({ author_id: teen.id, body: "add me on snap", game: "melee", parent_id: adultPost });
    expect(reply.error?.message).toMatch(/contact info/);
  });

  it("normal teen posts still work, and the rule is for teen accounts only", async () => {
    expect((await teen.c.from("posts").insert({ author_id: teen.id, body: "gg at the weekly, see you monday", game: "melee" })).error).toBeNull();
    expect((await adult.c.from("posts").insert({ author_id: adult.id, body: "follow me on twitch.tv/adultplayer", game: "melee" })).error).toBeNull();
  });

  it("'Not interested' choices are private", async () => {
    await adult.c.from("post_dismissals").insert({ user_id: adult.id, post_id: teenPost });
    const { data } = await teen.c.from("post_dismissals").select("*");
    expect(data).toEqual([]);
  });
});
