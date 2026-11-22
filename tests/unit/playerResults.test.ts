// A player's career view: the placements summary, ordinals, and searching their sets.
import { describe, expect, it } from "vitest";
import { filterSets, mergeResults, ordinal, summarizeResults, type PlayerResult } from "@/lib/playerResults";
import type { PlayerSet } from "@/lib/playerStats";

const result = (placement: number, entrants: number, o: Partial<PlayerResult> = {}): PlayerResult => ({
  eventId: String(placement * 1000 + entrants),
  eventName: "Singles",
  tournament: `T${entrants}`,
  tournamentSlug: null,
  entrants,
  startAt: 1,
  game: "ultimate",
  placement,
  doubles: false,
  ...o,
});

describe("the results summary", () => {
  it("counts singles events, wins and top 8s, and finds the best finish at a big event", () => {
    const s = summarizeResults([result(1, 24), result(7, 125), result(1, 343), result(2, 512), result(1, 8, { doubles: true }), result(17, 64)]);
    expect([s.events, s.wins, s.top8]).toEqual([5, 2, 4]);
    expect(s.bestBig?.placement).toBe(1);
    expect(s.bestBig?.result.entrants).toBe(343);
  });

  it("has no best finish without a big event", () => {
    expect(summarizeResults([result(1, 24)]).bestBig).toBeNull();
    expect(summarizeResults([])).toEqual({ events: 0, wins: 0, top8: 0, bestBig: null });
  });

  it("writes places as people say them", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 33, 101].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "33rd", "101st"]);
  });
});

describe("searching sets", () => {
  const set = (id: string, opp: string, tournament: string, mine: string[], theirs: string[]): PlayerSet => ({
    id,
    completedAt: 1,
    game: "melee",
    tournamentName: tournament,
    tournamentSlug: null,
    eventName: "Singles",
    round: "R1",
    myScore: 2,
    oppScore: 0,
    opp: { playerId: id, tag: opp },
    won: true,
    dq: false,
    myCharacters: mine,
    oppCharacters: theirs,
  });
  const sets = [set("1", "Zain", "Genesis", ["Fox"], ["Marth"]), set("2", "Cody", "Big House", ["Fox"], ["Fox"]), set("3", "Hbox", "Genesis", ["Falco"], ["Jigglypuff"])];

  it("finds sets by opponent, character (either side) or tournament, any case", () => {
    expect(filterSets(sets, "zain").map((s) => s.id)).toEqual(["1"]);
    expect(filterSets(sets, "marth").map((s) => s.id)).toEqual(["1"]);
    expect(filterSets(sets, "FOX").map((s) => s.id)).toEqual(["1", "2"]);
    expect(filterSets(sets, "genesis").map((s) => s.id)).toEqual(["1", "3"]);
    expect(filterSets(sets, "  ")).toHaveLength(3);
    expect(filterSets(sets, "nobody")).toEqual([]);
  });
});

describe("a claimed career", () => {
  it("joins saved and fresh results, fresh winning for the same event, newest first", () => {
    const saved = [result(3, 100, { eventId: "1", startAt: 100 }), result(9, 50, { eventId: "2", startAt: 300 })];
    const fresh = [result(1, 100, { eventId: "1", startAt: 100 }), result(5, 40, { eventId: "3", startAt: 200 })];
    expect(mergeResults(saved, fresh).map((r) => [r.eventId, r.placement])).toEqual([["2", 9], ["3", 5], ["1", 1]]);
    expect(mergeResults([], [])).toEqual([]);
  });
});
