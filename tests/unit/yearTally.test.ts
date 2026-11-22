import { describe, expect, it } from "vitest";
import { rankingsFor } from "@/lib/communityRankings";
import type { MajorEvent } from "@/lib/majorEvents";
import { yearTally } from "@/lib/yearTally";

const ev = (over: Partial<MajorEvent> & { top8: MajorEvent["top8"] }): MajorEvent => ({
  majorSlug: "m",
  eventId: "1",
  game: "melee",
  name: "Melee Singles",
  entrants: 1000,
  teams: false,
  online: false,
  ...over,
});
const p = (place: number, name: string, playerId: string | null) => ({ place, name, playerId });

describe("yearTally", () => {
  const year = [
    // newest major first: its names are the ones kept
    [
      ev({ top8: [p(1, "PG | Plup", "1000"), p(2, "Hungrybox", "1004"), p(5, "A", "7")] }),
      ev({ eventId: "2", name: "Amateur Bracket", entrants: 200, top8: [p(1, "Side winner", "9")] }), // not the main bracket
      ev({ eventId: "3", name: "Melee Doubles", teams: true, top8: [p(1, "Team", null)] }),
    ],
    [ev({ top8: [p(1, "Liquid | Hungrybox", "1004"), p(2, "Plup", "1000"), p(7, "A", "7")] })],
    [ev({ game: "smash4", top8: [p(1, "MKLeo", "2000")] })], // another game
    [], // a major with nothing saved yet
  ];

  it("counts wins, 2nd places and top 8s in each major's main singles bracket", () => {
    const { majors, rows } = yearTally(year, "melee");
    expect(majors).toBe(2);
    expect(rows.map((r) => [r.name, r.wins, r.seconds, r.top8s])).toEqual([
      ["Hungrybox", 1, 1, 2], // a tie: by name
      ["PG | Plup", 1, 1, 2],
      ["A", 0, 0, 2],
    ]);
  });

  it("leaves out a bracket smaller than the game's major size", () => {
    const small = [[ev({ entrants: 101, top8: [p(1, "Small winner", "5")] })], ...year];
    expect(yearTally(small, "melee", 250).rows.map((r) => r.name)).not.toContain("Small winner");
    expect(yearTally(small, "melee", 250).majors).toBe(2);
    expect(yearTally(small, "melee").majors).toBe(3);
  });

  it("counts results added by hand (no player id) by name", () => {
    const hand = [[ev({ top8: [p(1, "Ken", null), p(2, "Azen", null)] })], [ev({ top8: [p(1, "ken ", null), p(2, "Isai", null)] })]];
    expect(yearTally(hand, "melee").rows.map((r) => [r.name, r.playerId, r.wins, r.top8s])).toEqual([
      ["Ken", null, 2, 2],
      ["Azen", null, 0, 1],
      ["Isai", null, 0, 1],
    ]);
  });

  it("counts majors added by hand whatever their size", () => {
    const old = [[ev({ eventId: "manual-melee-1", entrants: 143, top8: [p(1, "PC Chris", null), p(2, "Ken", null)] })]];
    expect(yearTally(old, "melee", 250).majors).toBe(1);
  });

  it("counts only the game asked for", () => {
    expect(yearTally(year, "smash4").rows.map((r) => r.name)).toEqual(["MKLeo"]);
    expect(yearTally(year, "ultimate")).toEqual({ majors: 0, rows: [] });
  });
});

describe("rankingsFor", () => {
  const names = (year: number, game: Parameters<typeof rankingsFor>[1]) => rankingsFor(year, game).map((r) => r.name);
  it("links the community rankings that cover the year", () => {
    expect(names(2015, "melee")).toEqual(["SSBMRank"]);
    expect(names(2019, "melee")).toEqual(["MPGR"]);
    expect(names(2022, "melee")).toEqual(["MPGR", "SSBMRank"]);
    expect(names(2020, "ultimate")).toEqual(["PGRU"]);
    expect(names(2024, "ultimate")).toEqual(["UltRank / LumiRank"]);
    expect(names(2005, "melee")).toEqual([]);
  });
  it("lists every game's for all games, each series once", () => {
    expect(names(2017, null)).toEqual(["SSBMRank", "Panda Global Rankings", "SSBBRank", "64 League Rankings", "PMRank"]);
  });
});
