import { describe, expect, it } from "vitest";
import { mixPage, postsBefore, rankPostVideos } from "@/lib/reelMix";

const posts = ["P1", "P2", "P3"];
const clips = (from: number, n: number) => Array.from({ length: n }, (_, i) => `C${from + i + 1}`);

describe("mixing post videos into Reels", () => {
  it("puts a post video in every 5th spot", () => {
    const page = mixPage(0, 10, posts, clips(0, 11), true);
    expect(page.items).toEqual(["C1", "C2", "C3", "C4", "P1", "C5", "C6", "C7", "C8", "P2"]);
    expect(page.hasMore).toBe(true);
  });

  it("pages fit together with no gaps or repeats", () => {
    const all: string[] = [];
    let offset = 0;
    for (let i = 0; i < 6; i++) {
      const clipOffset = offset - postsBefore(offset, posts.length);
      const page = mixPage(offset, 4, posts, clips(clipOffset, 5).filter((c) => Number(c.slice(1)) <= 18), clipOffset + 5 < 18);
      all.push(...page.items);
      offset += page.items.length;
      if (!page.hasMore) break;
    }
    expect(new Set(all).size).toBe(all.length);
    expect(all).toHaveLength(21); // 18 clips + 3 post videos
    expect(all.slice(0, 15)).toEqual(["C1", "C2", "C3", "C4", "P1", "C5", "C6", "C7", "C8", "P2", "C9", "C10", "C11", "C12", "P3"]);
  });

  it("after the post videos run out, only clips", () => {
    expect(mixPage(20, 3, posts, clips(17, 4), true).items).toEqual(["C18", "C19", "C20"]);
  });

  it("with few clips, the post videos still all show", () => {
    const page = mixPage(0, 10, posts, ["C1", "C2"], false);
    expect(page.items).toEqual(["C1", "C2", "P1", "P2", "P3"]);
    expect(page.hasMore).toBe(false);
  });

  it("no post videos: the clips unchanged", () => {
    expect(mixPage(5, 3, [], clips(5, 4), true).items).toEqual(["C6", "C7", "C8"]);
  });
});

describe("rankPostVideos", () => {
  const now = Date.parse("2026-11-14T12:00:00Z");
  const p = (id: string, days: number, likeCount = 0) => ({ id, createdAt: new Date(now - days * 86400e3).toISOString(), likeCount });
  it("newer first, likes help, watched ones last", () => {
    const out = rankPostVideos([p("old", 5, 2), p("new", 0.2), p("liked", 1, 10), p("seen", 0.1)], new Set(["seen"]), now).map((x) => x.id);
    expect(out[out.length - 1]).toBe("seen");
    expect(out.indexOf("liked")).toBeLessThan(out.indexOf("old"));
    expect(out.indexOf("new")).toBeLessThan(out.indexOf("old"));
  });
});
