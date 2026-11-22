// The VOD library: which video links are accepted, and where a VOD's set page is.
import { describe, expect, it } from "vitest";
import { readVodLink, vodSearchPattern, vodSetPath } from "@/lib/vods";

describe("a VOD link", () => {
  it("accepts videos from YouTube, Twitch and Streamable", () => {
    expect(readVodLink("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90")).toEqual({ url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90", provider: "YouTube" });
    expect(readVodLink("youtu.be/dQw4w9WgXcQ")?.provider).toBe("YouTube"); // no https:// typed
    expect(readVodLink("http://youtu.be/dQw4w9WgXcQ")?.url.startsWith("https://")).toBe(true);
    expect(readVodLink("https://www.twitch.tv/videos/2290000000")?.provider).toBe("Twitch");
    expect(readVodLink("https://clips.twitch.tv/SomeClipName-abc123")?.provider).toBe("Twitch");
    expect(readVodLink("https://streamable.com/abc12")?.provider).toBe("Streamable");
  });

  it("refuses anything that isn't a playable video", () => {
    for (const bad of [
      "",
      "not a link",
      "https://www.youtube.com/@somechannel", // a channel
      "https://www.twitch.tv/somechannel", // a live channel, not a VOD
      "https://x.com/someone/status/1",
      "https://evil.example/watch?v=dQw4w9WgXcQ",
      "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
      "javascript:alert(1)",
      `https://www.youtube.com/watch?v=dQw4w9WgXcQ&x=${"a".repeat(300)}`, // too long
    ]) {
      expect(readVodLink(bad), bad).toBeNull();
    }
  });
});

describe("where a VOD's set is", () => {
  it("links to the set's page", () => {
    expect(vodSetPath("smashy", "3f2a")).toBe("/host/set/3f2a");
    expect(vodSetPath("startgg", "12345")).toBe("/sets/startgg/12345");
  });
});

describe("searching the list", () => {
  it("matches a name anywhere, with typed % and _ taken as they are", () => {
    expect(vodSearchPattern("  MkLeo ")).toBe("%MkLeo%");
    expect(vodSearchPattern("100%_x")).toBe("%100\\%\\_x%");
    expect(vodSearchPattern("a")).toBeNull();
  });
});
