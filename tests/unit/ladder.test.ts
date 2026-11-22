// The online ladder: seasons, rating changes, reading scores and the standings.
import { describe, expect, it } from "vitest";
import { previousSeason, rankStandings, ratingChange, readScore, seasonEnds, seasonName, seasonOf } from "@/lib/ladder";

describe("seasons", () => {
  it("are calendar quarters in UTC, named for the time of year", () => {
    expect(seasonOf(new Date("2026-11-13T05:00:00Z"))).toBe("2026-Q4");
    expect(seasonOf(new Date("2027-01-01T00:00:00Z"))).toBe("2027-Q1");
    expect(seasonOf(new Date("2026-06-30T23:59:59Z"))).toBe("2026-Q2");
    expect(seasonName("2026-Q4")).toBe("Fall 2026");
    expect(seasonName("2027-Q1")).toBe("Winter 2027");
    expect(seasonEnds("2026-Q4")?.toISOString()).toBe("2027-01-01T00:00:00.000Z");
    expect(previousSeason("2027-Q1")).toBe("2026-Q4");
    expect(previousSeason("2026-Q3")).toBe("2026-Q2");
  });
});

describe("ratings", () => {
  it("moves 16 between equals and less for an expected win", () => {
    expect(ratingChange(1000, 1000, true)).toBe(16);
    expect(ratingChange(1000, 1000, false)).toBe(-16);
    expect(ratingChange(1200, 1000, true)).toBe(8);
    expect(ratingChange(1000, 1200, true)).toBe(24);
  });
});

describe("scores", () => {
  it("takes 2-0 and 2-1 either way and nothing else", () => {
    expect(readScore("2", "1")).toEqual({ mine: 2, theirs: 1 });
    expect(readScore(0, 2)).toEqual({ mine: 0, theirs: 2 });
    for (const [a, b] of [[2, 2], [1, 1], [3, 0], [2, -1], ["x", 2]]) expect(readScore(a, b)).toHaveProperty("error");
  });
});

describe("standings", () => {
  it("leaves out players with under 3 matches and shares places on equal ratings", () => {
    const rows = [
      { userId: "a", rating: 1040, wins: 3, losses: 1 },
      { userId: "b", rating: 1100, wins: 2, losses: 0 },
      { userId: "c", rating: 1040, wins: 5, losses: 3 },
      { userId: "d", rating: 980, wins: 1, losses: 2 },
    ];
    expect(rankStandings(rows).map((r) => [r.userId, r.rank])).toEqual([["c", 1], ["a", 1], ["d", 3]]);
  });
});
