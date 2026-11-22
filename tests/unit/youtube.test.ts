import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { guessGame, isoDuration } = await import("@/lib/youtube");
const { clipUrl, embedUrl, channelUrl, parseClipLink } = await import("@/lib/reelLinks");

describe("isoDuration", () => {
  it("reads YouTube's durations", () => {
    expect(isoDuration("PT45S")).toBe(45);
    expect(isoDuration("PT1M5S")).toBe(65);
    expect(isoDuration("PT3M")).toBe(180);
    expect(isoDuration("PT1H2M3S")).toBe(3723);
    expect(isoDuration(undefined)).toBeNull();
    expect(isoDuration("P1D")).toBeNull();
  });
});

describe("guessGame", () => {
  const v = (title: string, tags: string[] = []) => ({ title, tags });

  it("uses the title when it names one game", () => {
    expect(guessGame(v("Insane Fox combo #melee"), null)).toBe("melee");
    expect(guessGame(v("Steve is broken | SSBU"), "melee")).toBe("ultimate");
    expect(guessGame(v("Marth chaingrab in Project+"), null)).toBe("pplus");
    expect(guessGame(v("P+ Lucas read"), null)).toBe("pplus");
    expect(guessGame(v("Smash 64 Pikachu"), null)).toBe("smash64");
    expect(guessGame(v("sm4sh Bayo ladder"), null)).toBe("smash4");
  });

  it("reads hashtags in the description", () => {
    expect(guessGame({ title: "THE CRAZIEST WIZZROBE SDI EVER?", description: "A masterclass. #shorts #ssbm #supersmashbros", tags: [] }, null)).toBe("melee");
    expect(guessGame({ title: "One hit = One stock", description: "#shorts #supersmashbros #smashultimate", tags: [] }, null)).toBe("ultimate");
    // Says Melee but tagged Ultimate: can't tell without the channel's usual game.
    expect(guessGame({ title: "When Hbox pops off", description: "The Melee meta. #shorts #smashultimate", tags: [] }, null)).toBeNull();
  });

  it("falls back to the tags, then the channel's usual game", () => {
    expect(guessGame(v("this read was crazy", ["fox", "ssbm"]), null)).toBe("melee");
    expect(guessGame(v("this read was crazy"), "ultimate")).toBe("ultimate");
    expect(guessGame(v("this read was crazy"), null)).toBeNull();
  });

  it("doesn't guess between several games unless the channel's game is one of them", () => {
    expect(guessGame(v("Melee vs Ultimate: which is harder?"), null)).toBeNull();
    expect(guessGame(v("Melee vs Ultimate: which is harder?"), "melee")).toBe("melee");
  });

  it("doesn't mistake ordinary words", () => {
    expect(guessGame(v("Ultimately a clean set"), null)).toBeNull();
    expect(guessGame(v("A brawler's dream"), null)).toBeNull();
  });
});

describe("parseClipLink", () => {
  it("reads Twitch clip links", () => {
    const tw = { platform: "twitch", clipId: "PlayfulFaintStorkMau5-Em3ZNFrq7xrhKh13" };
    expect(parseClipLink("https://clips.twitch.tv/PlayfulFaintStorkMau5-Em3ZNFrq7xrhKh13")).toEqual(tw);
    expect(parseClipLink("https://www.twitch.tv/vgbootcamp/clip/PlayfulFaintStorkMau5-Em3ZNFrq7xrhKh13?filter=clips")).toEqual(tw);
    expect(parseClipLink("m.twitch.tv/clip/PlayfulFaintStorkMau5-Em3ZNFrq7xrhKh13")).toEqual(tw);
  });
  it("reads YouTube links", () => {
    const yt = { platform: "youtube", clipId: "TifE-qQtqWg" };
    expect(parseClipLink("https://youtube.com/shorts/TifE-qQtqWg?si=abc")).toEqual(yt);
    expect(parseClipLink("https://youtu.be/TifE-qQtqWg")).toEqual(yt);
    expect(parseClipLink("https://m.youtube.com/watch?v=TifE-qQtqWg&t=3")).toEqual(yt);
  });
  it("refuses other links", () => {
    expect(parseClipLink("https://www.twitch.tv/vgbootcamp")).toBeNull();
    expect(parseClipLink("https://youtube.com/@VGBootcamp")).toBeNull();
    expect(parseClipLink("https://evil.example/shorts/TifE-qQtqWg")).toBeNull();
    expect(parseClipLink("not a link at all")).toBeNull();
  });
});

describe("reel links", () => {
  it("builds Twitch and YouTube addresses", () => {
    expect(clipUrl({ platform: "twitch", clipId: "FunnyClip-abc" })).toBe("https://clips.twitch.tv/FunnyClip-abc");
    expect(clipUrl({ platform: "youtube", clipId: "dQw4w9WgXcQ" })).toBe("https://www.youtube.com/shorts/dQw4w9WgXcQ");
    expect(channelUrl({ platform: "youtube", login: "UC1234567890123456789012" })).toBe("https://www.youtube.com/channel/UC1234567890123456789012");
    expect(embedUrl({ platform: "twitch", clipId: "X" }, "smashy.gg", true)).toContain("parent=smashy.gg");
    const yt = embedUrl({ platform: "youtube", clipId: "dQw4w9WgXcQ" }, "smashy.gg", true);
    expect(yt.startsWith("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?")).toBe(true);
    expect(yt).toContain("mute=1");
  });
});
