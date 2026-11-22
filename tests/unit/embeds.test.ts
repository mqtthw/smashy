import { describe, expect, it } from "vitest";
import { toEmbed } from "@/lib/embeds";

describe("toEmbed", () => {
  it("embeds YouTube with privacy-enhanced domain and start time", () => {
    expect(toEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m30s")).toMatchObject({
      kind: "player",
      provider: "YouTube",
      src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=90",
    });
    expect(toEmbed("https://youtu.be/dQw4w9WgXcQ?t=42")).toMatchObject({ src: expect.stringContaining("start=42") });
    expect(toEmbed("https://youtube.com/shorts/abcDEF12345")).toMatchObject({ kind: "player", provider: "YouTube" });
  });

  it("embeds Twitch clips and VODs (needing the site hostname)", () => {
    expect(toEmbed("https://clips.twitch.tv/FunnyClipName-abc123")).toMatchObject({ provider: "Twitch", needsTwitchParent: true });
    expect(toEmbed("https://www.twitch.tv/someone/clip/CoolClip-XYZ")).toMatchObject({ provider: "Twitch" });
    expect(toEmbed("https://www.twitch.tv/videos/123456789")).toMatchObject({ src: expect.stringContaining("video=123456789") });
  });

  it("embeds Streamable", () => {
    expect(toEmbed("https://streamable.com/abc12")).toMatchObject({ src: "https://streamable.com/e/abc12" });
  });

  it("shows X, Medal, and other https links as link cards", () => {
    expect(toEmbed("https://x.com/someone/status/123")).toMatchObject({ kind: "link", provider: "X" });
    expect(toEmbed("https://medal.tv/games/x/clips/abc")).toMatchObject({ kind: "link", provider: "Medal" });
    expect(toEmbed("https://docs.google.com/document/d/abc")).toMatchObject({ kind: "link", provider: "Google Docs" });
  });

  it("rejects insecure and dangerous links", () => {
    expect(toEmbed("http://insecure.example.com/video")).toBeNull();
    expect(toEmbed("javascript:alert(1)")).toBeNull();
    expect(toEmbed("not a url")).toBeNull();
  });
});
