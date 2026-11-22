import { describe, expect, it } from "vitest";
import { SOCIALS, parseSocial, profileSocials } from "@/lib/socials";

const site = (key: string) => SOCIALS.find((s) => s.key === key)!;

describe("parseSocial", () => {
  it("takes a handle, an @handle or a profile link", () => {
    expect(parseSocial(site("twitch"), "Mang0")).toBe("Mang0");
    expect(parseSocial(site("twitch"), "https://www.twitch.tv/mang0")).toBe("mang0");
    expect(parseSocial(site("twitch"), "twitch.tv/mang0?sr=a")).toBe("mang0");
    expect(parseSocial(site("x"), "@smashygg")).toBe("smashygg");
    expect(parseSocial(site("x"), "https://twitter.com/smashygg")).toBe("smashygg");
    expect(parseSocial(site("instagram"), "instagram.com/some.player_1/")).toBe("some.player_1");
    expect(parseSocial(site("bluesky"), "https://bsky.app/profile/Smashy.bsky.social")).toBe("smashy.bsky.social");
    expect(parseSocial(site("bluesky"), "@player.bsky.social")).toBe("player.bsky.social");
    expect(parseSocial(site("reddit"), "https://www.reddit.com/user/Some_Player/")).toBe("Some_Player");
    expect(parseSocial(site("reddit"), "old.reddit.com/u/some-player")).toBe("some-player");
    expect(parseSocial(site("reddit"), "u/SomePlayer")).toBe("SomePlayer");
  });

  it("understands the kinds of YouTube channel links", () => {
    expect(parseSocial(site("youtube"), "https://www.youtube.com/@VGBootCamp")).toBe("VGBootCamp");
    expect(parseSocial(site("youtube"), "youtube.com/channel/UCj1J3QuIftjOq9iv_rr7Egw")).toBe("UCj1J3QuIftjOq9iv_rr7Egw");
    expect(parseSocial(site("youtube"), "@btssmash")).toBe("btssmash");
  });

  it("refuses other sites, videos and odd text", () => {
    expect(parseSocial(site("twitch"), "https://evil.example/mang0")).toBe("bad");
    expect(parseSocial(site("twitch"), "https://www.twitch.tv/videos/123")).toBe("bad");
    expect(parseSocial(site("youtube"), "https://www.youtube.com/watch?v=abc")).toBe("bad");
    expect(parseSocial(site("x"), "this_name_is_way_too_long")).toBe("bad");
    expect(parseSocial(site("instagram"), "name with spaces")).toBe("bad");
    expect(parseSocial(site("bluesky"), "nodot")).toBe("bad");
    expect(parseSocial(site("reddit"), "https://www.reddit.com/r/SSBM")).toBe("bad");
    expect(parseSocial(site("twitch"), "javascript:alert(1)")).toBe("bad");
  });

  it("an empty box clears it", () => {
    expect(parseSocial(site("twitch"), "   ")).toBeNull();
  });
});

describe("profileSocials", () => {
  it("builds the links, in order, and skips empty or broken ones", () => {
    const out = profileSocials({ social_x: "smashygg", social_twitch: "mang0", social_youtube: "UCj1J3QuIftjOq9iv_rr7Egw", social_instagram: null, social_bluesky: "bad handle" });
    expect(out.map((s) => s.url)).toEqual(["https://www.twitch.tv/mang0", "https://www.youtube.com/channel/UCj1J3QuIftjOq9iv_rr7Egw", "https://x.com/smashygg"]);
    expect(profileSocials({ social_youtube: "VGBootCamp" })[0].url).toBe("https://www.youtube.com/@VGBootCamp");
  });
});

describe("Slippi connect code (round 690)", () => {
  const slippi = site("slippi");
  it("keeps codes as ABCD#123 whichever way they're typed or pasted", () => {
    expect(parseSocial(slippi, "abcd#123")).toBe("ABCD#123");
    expect(parseSocial(slippi, "ABCD-123")).toBe("ABCD#123");
    expect(parseSocial(slippi, "mang 0")).toBe("MANG#0");
    expect(parseSocial(slippi, "https://slippi.gg/user/hbox-305")).toBe("HBOX#305");
    expect(parseSocial(slippi, "slippi.gg/user/kore-1")).toBe("KORE#1");
  });
  it("refuses what isn't a connect code", () => {
    expect(parseSocial(slippi, "ABCD")).toBe("bad");
    expect(parseSocial(slippi, "#123")).toBe("bad");
    expect(parseSocial(slippi, "TOOLONGNAME#1")).toBe("bad");
    expect(parseSocial(slippi, "https://slippi.gg/leaderboards")).toBe("bad");
    expect(parseSocial(slippi, "https://evil.example/user/abcd-123")).toBe("bad");
  });
  it("links to the player's slippi.gg page", () => {
    expect(profileSocials({ social_slippi: "HBOX#305" })).toEqual([{ key: "slippi", label: "Slippi", handle: "HBOX#305", url: "https://slippi.gg/user/hbox-305" }]);
  });
  it("has no Melee Unlocked challenge link until the format is agreed", async () => {
    const { meleeUnlockedChallengeUrl } = await import("@/lib/meleeUnlocked");
    expect(meleeUnlockedChallengeUrl("HBOX#305")).toBeNull();
  });
});
