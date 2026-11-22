// Swiss pairing and standings (the rules in src/lib/swiss.ts).
import { describe, expect, it } from "vitest";
import { swissMaxRounds, swissPairings, swissRounds, swissStandings, type SwissPlayer, type SwissSet } from "@/lib/swiss";

/** Players "1".."n", seeded in that order. */
const field = (n: number): SwissPlayer[] => Array.from({ length: n }, (_, i) => ({ id: String(i + 1), seed: i + 1 }));
const won = (a: string, b: string, aGames = 2, bGames = 0): SwissSet => ({ a, b, winner: a, aGames, bGames });
const bye = (a: string): SwissSet => ({ a, b: null, winner: a });

/** A small repeatable random number generator, so "random" results are the same on every run. */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Play a whole event: each round is paired, checked, and decided by `pick` (which of the two wins). */
function play(n: number, rounds: number, pick: (a: string, b: string) => string) {
  const players = field(n);
  const sets: SwissSet[] = [];
  const perRound: ReturnType<typeof swissPairings>[] = [];
  for (let r = 0; r < rounds; r++) {
    const round = swissPairings(players, sets);
    // Everyone is at exactly one table (or has the bye).
    const seated = [...round.pairs.flat(), ...(round.bye ? [round.bye] : [])].sort();
    expect(seated).toEqual(players.map((p) => p.id).sort());
    for (const [a, b] of round.pairs) {
      const w = pick(a, b);
      sets.push({ a, b, winner: w, aGames: w === a ? 2 : 1, bGames: w === a ? 1 : 2 });
    }
    if (round.bye) sets.push(bye(round.bye));
    perRound.push(round);
  }
  return { players, sets, perRound };
}

describe("swissRounds", () => {
  it("gives the rounds needed for one undefeated player", () => {
    expect([1, 2, 3, 4, 8, 9, 16, 17, 32, 33, 130].map(swissRounds)).toEqual([0, 1, 2, 2, 3, 4, 4, 5, 5, 6, 8]);
  });
  it("knows when a field has run out of new opponents", () => {
    expect([2, 4, 5, 8].map(swissMaxRounds)).toEqual([1, 3, 5, 7]);
  });
});

describe("swissPairings: round 1", () => {
  it("pairs the top half against the bottom half by seed", () => {
    expect(swissPairings(field(8), []).pairs).toEqual([["1", "5"], ["2", "6"], ["3", "7"], ["4", "8"]]);
  });
  it("gives the lowest seed the bye when the field is odd", () => {
    const round = swissPairings(field(7), []);
    expect(round.bye).toBe("7");
    expect(round.pairs).toEqual([["1", "4"], ["2", "5"], ["3", "6"]]);
  });
  it("pairs two players, and has nothing to pair with one", () => {
    expect(swissPairings(field(2), []).pairs).toEqual([["1", "2"]]);
    expect(swissPairings(field(1), [])).toEqual({ pairs: [], bye: "1", rematches: 0 });
  });
});

describe("swissPairings: later rounds", () => {
  it("pairs winners with winners and losers with losers, top half against bottom half", () => {
    const sets = [won("1", "5"), won("2", "6"), won("3", "7"), won("4", "8")];
    expect(swissPairings(field(8), sets).pairs).toEqual([["1", "3"], ["2", "4"], ["5", "7"], ["6", "8"]]);
  });

  it("never repeats a pairing when it can be avoided, whoever wins", () => {
    for (const n of [6, 7, 8, 9, 12, 13, 16, 24, 33, 47]) {
      const random = rng(n);
      const { sets, perRound } = play(n, swissRounds(n), (a, b) => (random() < 0.5 ? a : b));
      expect(perRound.map((r) => r.rematches), `${n} players`).toEqual(perRound.map(() => 0));
      const pairs = sets.filter((s) => s.b).map((s) => [s.a, s.b].sort().join("v"));
      expect(new Set(pairs).size, `${n} players`).toBe(pairs.length);
    }
  });

  it("leaves exactly one undefeated player after the recommended rounds when the better seed always wins", () => {
    const { players, sets } = play(16, 4, (a, b) => (Number(a) < Number(b) ? a : b));
    const table = swissStandings(players, sets);
    expect(table.filter((s) => s.losses === 0).map((s) => s.id)).toEqual(["1"]);
    expect(table[0]).toMatchObject({ id: "1", wins: 4, losses: 0, rank: 1 });
    expect(table.map((s) => s.wins).sort()).toEqual([0, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 4]);
  });

  it("moves a player down a group when their own group has an odd number", () => {
    // After round 1 of 6: three winners (1, 2, 3) and three losers (4, 5, 6).
    const round = swissPairings(field(6), [won("1", "4"), won("2", "5"), won("3", "6")]);
    expect(round.pairs).toHaveLength(3);
    expect(round.rematches).toBe(0);
    // Two of the winners meet; the third plays a loser they haven't played yet.
    const winners = new Set(["1", "2", "3"]);
    expect(round.pairs.filter(([a, b]) => winners.has(a) && winners.has(b))).toHaveLength(1);
    expect(round.pairs.filter(([a, b]) => winners.has(a) !== winners.has(b))).toHaveLength(1);
  });

  it("gives each player at most one bye until everyone has had one", () => {
    const random = rng(5);
    const { perRound } = play(5, 5, (a, b) => (random() < 0.5 ? a : b));
    expect(perRound.map((r) => r.bye).sort()).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("still pairs everyone when a rematch can't be avoided, and says how many there are", () => {
    // 4 players have all met after 3 rounds.
    const { players, sets } = play(4, 3, (a, b) => (Number(a) < Number(b) ? a : b));
    const round = swissPairings(players, sets);
    expect(round.pairs).toHaveLength(2);
    expect(round.rematches).toBe(2);
  });

  it("leaves out players who dropped, and counts a set in progress as 'already met'", () => {
    const sets: SwissSet[] = [won("1", "3"), { a: "2", b: "4", winner: null }];
    const round = swissPairings(field(4).filter((p) => p.id !== "4"), sets);
    expect(round.pairs.flat()).not.toContain("4");
    expect(round.bye).not.toBeNull(); // three left: one sits out
    const again = swissPairings(field(4), sets);
    expect(again.pairs.map((p) => [...p].sort().join("v")).sort()).not.toContain("2v4");
  });

  it("handles a big field quickly", () => {
    const random = rng(256);
    const started = Date.now();
    const { perRound } = play(256, 8, (a, b) => (random() < 0.5 ? a : b));
    expect(perRound.every((r) => r.rematches === 0 && r.pairs.length === 128)).toBe(true);
    expect(Date.now() - started).toBeLessThan(3000);
  });
});

describe("swissStandings", () => {
  it("ranks by wins, then fewest losses, then stronger opponents, then game difference, then seed", () => {
    const players = field(6);
    const sets: SwissSet[] = [
      // Round 1
      won("1", "4", 2, 0),
      won("5", "2", 2, 1),
      won("3", "6", 2, 0),
      // Round 2
      won("1", "5", 2, 1),
      won("3", "2", 2, 0),
      won("4", "6", 2, 1),
    ];
    const table = swissStandings(players, sets);
    // 1 and 3 are 2-0. 1 beat a 1-1 player and a 1-1 player (2 opponent wins); 3 beat two 0-2 players (0).
    expect(table.slice(0, 2).map((s) => [s.id, s.wins, s.opponentWins])).toEqual([["1", 2, 2], ["3", 2, 0]]);
    // 4 and 5 are 1-1 with the same opponents' wins (2): 5 has the better game difference (+0 v -1).
    expect(table.slice(2, 4).map((s) => [s.id, s.gameDiff])).toEqual([["5", 0], ["4", -1]]);
    // 2 and 6 are 0-2: same opponents' wins? 2 lost to 5 (1) and 3 (2) = 3; 6 lost to 3 (2) and 4 (1) = 3; then game difference -3 v -3; then seed.
    expect(table.slice(4).map((s) => s.id)).toEqual(["2", "6"]);
    expect(table.map((s) => s.rank)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("counts a bye as a win with no opponent, and ranks it under a played win record with fewer losses the same", () => {
    const table = swissStandings(field(3), [won("1", "2"), bye("3")]);
    expect(table.find((s) => s.id === "3")).toMatchObject({ wins: 1, losses: 0, byes: 1, opponentWins: 0, gameDiff: 0 });
    // 1 and 3 are both 1-0 with no opponent wins: 1 has the better game difference.
    expect(table.map((s) => s.id)).toEqual(["1", "3", "2"]);
  });

  it("doesn't count a set that hasn't finished", () => {
    const table = swissStandings(field(2), [{ a: "1", b: "2", winner: null }]);
    expect(table.map((s) => [s.wins, s.losses])).toEqual([[0, 0], [0, 0]]);
  });
});
