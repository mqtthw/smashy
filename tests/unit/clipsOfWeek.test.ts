import { describe, expect, it } from "vitest";
import { clipLinkThumbnail, isClipPost, pickClipsOfWeek, type ClipCandidate } from "@/lib/clipsOfWeek";

const row = (id: string, over: Partial<ClipCandidate> = {}): ClipCandidate => ({
  id,
  authorId: `author-${id}`,
  body: "look at this https://youtu.be/dQw4w9WgXcQ",
  likes: 1,
  createdAt: "2026-11-20T00:00:00Z",
  hasVideo: false,
  ...over,
});

describe("clips of the week", () => {
  it("counts an uploaded video or a link that plays in the post, not plain text or other links", () => {
    expect(isClipPost({ body: "no link", hasVideo: true })).toBe(true);
    expect(isClipPost({ body: "https://clips.twitch.tv/SomeClipName", hasVideo: false })).toBe(true);
    expect(isClipPost({ body: "https://streamable.com/abc123", hasVideo: false })).toBe(true);
    expect(isClipPost({ body: "just words", hasVideo: false })).toBe(false);
    expect(isClipPost({ body: "https://x.com/someone/status/123", hasVideo: false })).toBe(false);
    expect(isClipPost({ body: "||https://youtu.be/dQw4w9WgXcQ||", hasVideo: false })).toBe(false);
  });

  it("puts the most liked first, the newer one first on a tie", () => {
    const picks = pickClipsOfWeek([
      row("a", { likes: 2 }),
      row("b", { likes: 5 }),
      row("c", { likes: 2, createdAt: "2026-11-21T00:00:00Z" }),
    ]);
    expect(picks).toEqual(["b", "c", "a"]);
  });

  it("leaves out clips nobody liked and posts that aren't clips", () => {
    expect(pickClipsOfWeek([row("a", { likes: 0 }), row("b", { body: "words only", likes: 9 }), row("c")])).toEqual(["c"]);
  });

  it("gives each player one spot and stops at the limit", () => {
    const rows = [
      row("a", { likes: 9, authorId: "same" }),
      row("b", { likes: 8, authorId: "same" }),
      row("c", { likes: 7 }),
      row("d", { likes: 6 }),
      row("e", { likes: 5 }),
    ];
    expect(pickClipsOfWeek(rows)).toEqual(["a", "c", "d"]);
    expect(pickClipsOfWeek(rows, 2)).toEqual(["a", "c"]);
  });

  it("finds YouTube's still picture for a link, and nothing for other sites", () => {
    expect(clipLinkThumbnail("gg https://www.youtube.com/watch?v=MEgh8p-CZU8")).toBe("https://i.ytimg.com/vi/MEgh8p-CZU8/hqdefault.jpg");
    expect(clipLinkThumbnail("https://clips.twitch.tv/SomeClipName")).toBeNull();
    expect(clipLinkThumbnail("nothing here")).toBeNull();
  });
});
