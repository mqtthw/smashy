import { describe, expect, it } from "vitest";
import { bracketPath, playerName, setPath, setWatchMoment, toRounds, type BracketSet, type SetPlayer } from "@/lib/brackets/types";

const set = (id: string, round: number, label: string): BracketSet => ({
  id, identifier: id, round, roundLabel: label, winnersSide: round >= 0, state: "done",
  players: [null, null], waitingOn: [null, null], completedAt: null,
});

describe("toRounds", () => {
  it("groups sets by round, winners first in order, then losers", () => {
    const rounds = toRounds([
      set("L2", -2, "Losers Round 2"), set("W2", 2, "Winners Semi-Final"), set("W1a", 1, "Winners Round 1"),
      set("L1", -1, "Losers Round 1"), set("W1b", 1, "Winners Round 1"), set("GF", 3, "Grand Final"),
    ]);
    expect(rounds.map((r) => r.label)).toEqual(["Winners Round 1", "Winners Semi-Final", "Grand Final", "Losers Round 1", "Losers Round 2"]);
    expect(rounds[0].sets.map((s) => s.id)).toEqual(["W1a", "W1b"]);
  });
});

describe("links and names", () => {
  it("builds Smashy paths", () => {
    expect(bracketPath("startgg", "123")).toBe("/brackets/startgg/123");
    expect(bracketPath("parrygg", "abc", "g1")).toBe("/brackets/parrygg/abc?group=g1");
    expect(setPath("startgg", "99")).toBe("/sets/startgg/99");
  });
  it("shows sponsor prefixes", () => {
    expect(playerName({ name: "AZ", prefix: "ZFN" })).toBe("ZFN | AZ");
    expect(playerName({ name: "AZ", prefix: null })).toBe("AZ");
  });
});

describe("setWatchMoment", () => {
  const players = (a: number, b: number) =>
    [
      { entrantId: "1", name: "A", prefix: null, seed: 1, score: a, won: a > b },
      { entrantId: "2", name: "B", prefix: null, seed: 2, score: b, won: b > a },
    ] as [SetPlayer, SetPlayer];
  it("starts 30 seconds before the recorded start", () => {
    expect(setWatchMoment({ startedAt: 1000, completedAt: 2000, games: [], players: players(3, 1) })).toEqual({ at: 970, estimated: false });
  });
  it("estimates from the end time when there's no start time (5½ min per game)", () => {
    expect(setWatchMoment({ startedAt: null, completedAt: 10_000, games: [], players: players(3, 1) })).toEqual({ at: 10_000 - 4 * 330, estimated: true });
  });
  it("gives up when neither time is known", () => {
    expect(setWatchMoment({ startedAt: null, completedAt: null, games: [], players: players(0, 0) })).toBeNull();
  });
});
