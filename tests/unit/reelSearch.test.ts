// Reels search (round 713): what people type becomes safe database filters.
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { LIVE_SEARCHES_PER_DAY, LIVE_SHORT_EVERY, cleanReelQuery, pauseLiveSearch, reelSearchFilters, reelSearchKey, reelSearchWords, resetLiveSearches, takeLiveSearch } from "@/lib/reelSearch";
import { mixPage, postsBefore, postsBeforeWhenClipsEnd } from "@/lib/reelMix";
import { guessGame } from "@/lib/youtube";

describe("live YouTube Shorts in search (round 716)", () => {
  it("share one cached search for the same words", () => {
    expect(reelSearchKey("  PLUP  sheik")).toBe(reelSearchKey("plup sheik"));
  });
  it("ask YouTube at most the daily number of times, then again the next day", () => {
    resetLiveSearches();
    const day1 = Date.parse("2026-11-22T10:00:00Z");
    for (let i = 0; i < LIVE_SEARCHES_PER_DAY; i++) expect(takeLiveSearch(day1)).toBe(true);
    expect(takeLiveSearch(day1)).toBe(false);
    expect(takeLiveSearch(day1 + 86400e3)).toBe(true);
  });
  it("pause for a few hours when YouTube says the allowance is used up", () => {
    resetLiveSearches();
    const now = Date.parse("2026-11-22T10:00:00Z");
    pauseLiveSearch(now);
    expect(takeLiveSearch(now + 3600e3)).toBe(false);
    expect(takeLiveSearch(now + 4 * 3600e3)).toBe(true);
  });
  it("take every third spot, and pages carry on where the last one stopped", () => {
    const shorts = ["s1", "s2"];
    const clips = ["c1", "c2", "c3", "c4", "c5", "c6"];
    const first = mixPage(0, 4, shorts, clips, false, LIVE_SHORT_EVERY);
    expect(first.items).toEqual(["c1", "c2", "s1", "c3"]);
    const before = postsBefore(4, shorts.length, LIVE_SHORT_EVERY);
    const second = mixPage(4, 4, shorts, clips.slice(4 - before), false, LIVE_SHORT_EVERY);
    expect(second.items).toEqual(["c4", "s2", "c5", "c6"]);
  });
  it("show every clip and Short exactly once, however few clips there are (round 717)", () => {
    for (const [clipCount, shortCount] of [[0, 25], [4, 25], [6, 2], [40, 25], [3, 0]]) {
      const clips = Array.from({ length: clipCount }, (_, i) => `c${i}`);
      const shorts = Array.from({ length: shortCount }, (_, i) => `s${i}`);
      const seen: string[] = [];
      let hasMore = true;
      for (let offset = 0, guard = 0; hasMore && guard < 20; guard++) {
        const before = offset > 0 && shorts.length ? postsBeforeWhenClipsEnd(offset, shorts.length, clips.length, LIVE_SHORT_EVERY) : 0;
        const from = clips.slice(offset - before, offset - before + 16); // one extra, like the database read
        const page = mixPage(offset, 15, shorts, from.slice(0, 15), from.length > 15, LIVE_SHORT_EVERY, before);
        seen.push(...page.items);
        offset += page.items.length;
        hasMore = page.hasMore;
      }
      expect(hasMore).toBe(false);
      expect(seen).toHaveLength(clipCount + shortCount);
      expect(new Set(seen).size).toBe(seen.length);
    }
  });
  it("read Japanese titles' game names", () => {
    expect(guessGame({ title: "ウルフの即死連携【スマブラSP】", tags: [] }, null)).toBe("ultimate");
    expect(guessGame({ title: "スマブラDX 名シーン", tags: [] }, null)).toBe("melee");
  });
});

describe("Reels search", () => {
  it("splits a search into words, letters and numbers only", () => {
    expect(reelSearchWords("Plup")).toEqual(["plup"]);
    expect(reelSearchWords("  Mang0 vs. Zain!! ")).toEqual(["mang0", "vs", "zain"]);
    expect(reelSearchWords("a")).toEqual([]); // one letter matches nearly everything
    expect(reelSearchWords("ザクレイ")).toEqual(["ザクレイ"]);
    expect(reelSearchWords("one two three four five")).toHaveLength(4);
  });
  it("never lets filter syntax through", () => {
    const [f] = reelSearchFilters("plup),title.eq.x,(%_*");
    expect(f).toBe("title.ilike.*plup*,channel_name.ilike.*plup*,channel_login.ilike.*plup*");
    expect(reelSearchFilters("plup),title.eq.x")).toHaveLength(3); // plup, title, eq ("x" is one letter)
    expect(reelSearchFilters("%%%")).toEqual([]);
  });
  it("tidies the search box text, or gives null when there's nothing to search", () => {
    expect(cleanReelQuery("  plup   sheik ")).toBe("plup sheik");
    expect(cleanReelQuery("!!")).toBeNull();
    expect(cleanReelQuery(["plup"])).toBeNull();
    expect(cleanReelQuery("x".repeat(100))).toHaveLength(60);
  });
});
