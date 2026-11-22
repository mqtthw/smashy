// Reels search (round 713): what people type becomes safe database filters.
import { describe, expect, it } from "vitest";
import { cleanReelQuery, reelSearchFilters, reelSearchWords } from "@/lib/reelSearch";

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
