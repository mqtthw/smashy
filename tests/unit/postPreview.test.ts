import { describe, expect, it } from "vitest";
import { twitchClipIdIn, withoutLinks } from "@/lib/embeds";

describe("post link previews (round 459)", () => {
  it("finds the Twitch clip in a post, in both link styles", () => {
    expect(twitchClipIdIn("look https://www.twitch.tv/satellitemelee/clip/TiredHelpfulDolphinHotPokket-hNt4-prGFFa8Cy7d")).toBe("TiredHelpfulDolphinHotPokket-hNt4-prGFFa8Cy7d");
    expect(twitchClipIdIn("https://clips.twitch.tv/AbcDef123")).toBe("AbcDef123");
    expect(twitchClipIdIn("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBeNull();
  });
  it("skips a clip hidden behind a spoiler", () => {
    expect(twitchClipIdIn("||https://clips.twitch.tv/AbcDef123||")).toBeNull();
  });
  it("takes links out of preview text", () => {
    expect(withoutLinks("what a combo https://clips.twitch.tv/AbcDef123 !!")).toBe("what a combo !!");
    expect(withoutLinks("https://clips.twitch.tv/AbcDef123")).toBe("");
  });
});

describe("Also share to Reels: the clip link in a post (round 460)", () => {
  it("finds Twitch clips and YouTube links, skipping other links and spoilers", async () => {
    const { firstClipLinkIn } = await import("@/lib/reelLinks");
    expect(firstClipLinkIn("my clip! https://www.twitch.tv/mqtthw/clip/AbcDef123-xyz")).toBe("https://www.twitch.tv/mqtthw/clip/AbcDef123-xyz");
    expect(firstClipLinkIn("see https://smashy.gg then https://youtube.com/shorts/dQw4w9WgXcQ.")).toBe("https://youtube.com/shorts/dQw4w9WgXcQ");
    expect(firstClipLinkIn("||https://clips.twitch.tv/AbcDef123||")).toBeNull();
    expect(firstClipLinkIn("https://www.twitch.tv/mqtthw")).toBeNull();
  });
});
