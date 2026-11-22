// Pick'em for majors: checking picks, scoring them, ranking, and what the crowd picked.
import { describe, expect, it } from "vitest";
import { checkPicks, crowdPicks, MAX_POINTS, rankScores, scorePicks, type Seed } from "@/lib/pickem";

const seeds: Seed[] = Array.from({ length: 12 }, (_, i) => ({ playerId: String(100 + i), tag: `P${i + 1}`, prefix: null, seed: i + 1 }));

describe("checking picks", () => {
  it("keeps the champion in the top 8, first, and drops repeats", () => {
    expect(checkPicks("101", ["100", "101", "102", "102"], seeds)).toEqual({ champion: "101", top8: ["101", "100", "102"] });
    expect(checkPicks("100", [], seeds)).toEqual({ champion: "100", top8: ["100"] });
  });

  it("refuses players outside the list, a missing champion, or more than 8", () => {
    expect(checkPicks("999", [], seeds)).toEqual({ error: "play.pickem.err.champion" });
    expect(checkPicks(undefined, ["100"], seeds)).toEqual({ error: "play.pickem.err.champion" });
    expect(checkPicks("100", ["999"], seeds)).toEqual({ error: "play.pickem.err.top8List" });
    expect(checkPicks("100", ["101", "102", "103", "104", "105", "106", "107", "108"], seeds)).toEqual({ error: "play.pickem.err.top8Count" });
    expect(checkPicks("100", "not a list", seeds)).toEqual({ champion: "100", top8: ["100"] });
  });
});

describe("scoring", () => {
  const placements = new Map([["100", 1], ["101", 2], ["102", 3], ["103", 4], ["104", 5], ["105", 5], ["106", 7], ["107", 7], ["108", 9]]);

  it("gives 5 for the champion and 1 for each top 8 finisher picked", () => {
    expect(scorePicks({ champion: "100", top8: ["100", "101", "108", "999"] }, placements)).toEqual({ points: 7, championRight: true, inTop8: ["100", "101"] });
    expect(scorePicks({ champion: "101", top8: ["101", "106", "107"] }, placements)).toEqual({ points: 3, championRight: false, inTop8: ["101", "106", "107"] });
  });

  it("tops out at 13 for a perfect top 8 with the right champion", () => {
    expect(scorePicks({ champion: "100", top8: ["100", "101", "102", "103", "104", "105", "106", "107"] }, placements).points).toBe(MAX_POINTS);
  });

  it("scores nothing before there are standings", () => {
    expect(scorePicks({ champion: "100", top8: ["100"] }, new Map()).points).toBe(0);
  });
});

describe("the leaderboard", () => {
  it("ranks best first, shares ranks on equal points, earlier picks first among them", () => {
    const rows = [
      { id: "a", points: 5, pickedAt: "2026-11-12T10:00:00Z" },
      { id: "b", points: 8, pickedAt: "2026-11-12T12:00:00Z" },
      { id: "c", points: 5, pickedAt: "2026-11-12T09:00:00Z" },
      { id: "d", points: 1, pickedAt: "2026-11-12T08:00:00Z" },
    ];
    expect(rankScores(rows).map((r) => [r.id, r.rank])).toEqual([["b", 1], ["c", 2], ["a", 2], ["d", 4]]);
  });

  it("shows what the crowd picked, champions first", () => {
    const picks = [
      { champion: "100", top8: ["100", "101"] },
      { champion: "100", top8: ["100", "102"] },
      { champion: "101", top8: ["101", "100"] },
    ];
    expect(crowdPicks(picks)).toEqual([
      { playerId: "100", champion: 2, top8: 3 },
      { playerId: "101", champion: 1, top8: 2 },
      { playerId: "102", champion: 0, top8: 1 },
    ]);
  });
});
