// Socials on player pages (migration 20261227100000_profile_socials.sql).
import { afterAll, describe, expect, it } from "vitest";
import { cleanup, guest, hasDb, makeUser } from "./helpers";

describe.skipIf(!hasDb)("profile socials", () => {
  afterAll(cleanup);

  it("adults set handles; only real handle shapes; everyone can see them", async () => {
    const a = await makeUser("SocialsAdult");
    expect((await a.c.from("profiles").update({ social_twitch: "mang0", social_x: "smashygg", social_bluesky: "smashy.bsky.social", social_youtube: "VGBootCamp", social_reddit: "Some_Player" }).eq("id", a.id)).error).toBeNull();
    expect((await a.c.from("profiles").update({ social_twitch: "https://evil.example" }).eq("id", a.id)).error).not.toBeNull();
    expect((await a.c.from("profiles").update({ social_instagram: "has spaces" }).eq("id", a.id)).error).not.toBeNull();
    expect((await a.c.from("profiles").update({ social_bluesky: "nodot" }).eq("id", a.id)).error).not.toBeNull();
    expect((await a.c.from("profiles").update({ social_reddit: "r/SSBM" }).eq("id", a.id)).error).not.toBeNull();
    const { data } = await guest().from("profiles").select("social_twitch, social_x").eq("id", a.id).single();
    expect(data).toEqual({ social_twitch: "mang0", social_x: "smashygg" });
    // Clearing works.
    expect((await a.c.from("profiles").update({ social_twitch: null }).eq("id", a.id)).error).toBeNull();
  });

  it("under-18 accounts can't add socials", async () => {
    const teen = await makeUser("SocialsTeen", { teen: true });
    const { error } = await teen.c.from("profiles").update({ social_reddit: "someteen" }).eq("id", teen.id);
    expect(error?.message).toMatch(/18 and older/);
    // Their other profile edits still work.
    expect((await teen.c.from("profiles").update({ crew: "UTSA" }).eq("id", teen.id)).error).toBeNull();
  });
});
