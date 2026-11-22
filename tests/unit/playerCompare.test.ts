// Comparing two players: their sets against each other (from both histories), and shared opponents.
import { describe, expect, it } from "vitest";
import { combinedHeadToHead, sharedOpponents } from "@/lib/playerCompare";
import type { PlayerSet } from "@/lib/playerStats";

const set = (id: string, opp: string, won: boolean, at: number, o: Partial<PlayerSet> = {}): PlayerSet => ({
  id,
  completedAt: at,
  game: "melee",
  tournamentName: `T${id}`,
  tournamentSlug: null,
  eventName: "Singles",
  round: "Winners Final",
  myScore: won ? 2 : 0,
  oppScore: won ? 0 : 2,
  opp: { playerId: opp, tag: `Tag ${opp}` },
  won,
  dq: false,
  myCharacters: [],
  oppCharacters: [],
  ...o,
});

describe("head-to-head from both histories", () => {
  // A's history has sets 1 and 2 against B; B's (reaching further back) has 2 and an older 3.
  const aSets = [set("1", "B", true, 300), set("2", "B", false, 200), set("9", "C", true, 250)];
  const bSets = [set("2", "A", true, 200), set("3", "A", true, 100), set("8", "C", false, 150)];

  it("counts each set once, from A's side, newest first", () => {
    const h = combinedHeadToHead(aSets, bSets, "A", "B");
    expect(h.meetings.map((m) => [m.id, m.aWon, m.aScore, m.bScore])).toEqual([
      ["1", true, 2, 0],
      ["2", false, 0, 2],
      ["3", false, 0, 2], // only in B's history: flipped to A's side
    ]);
    expect([h.aWins, h.bWins]).toEqual([1, 2]);
  });

  it("lists a DQ without counting it", () => {
    const h = combinedHeadToHead([set("1", "B", true, 300, { dq: true })], [], "A", "B");
    expect(h.meetings).toHaveLength(1);
    expect([h.aWins, h.bWins]).toEqual([0, 0]);
  });

  it("is empty when they've never met", () => {
    expect(combinedHeadToHead(aSets.filter((s) => s.opp.playerId !== "B"), [], "A", "B")).toEqual({ aWins: 0, bWins: 0, meetings: [] });
  });
});

describe("shared opponents", () => {
  it("lists opponents both played, with each one's record, most played first", () => {
    const aSets = [set("1", "C", true, 1), set("2", "C", true, 2), set("3", "D", false, 3), set("4", "B", true, 4), set("5", "E", true, 5)];
    const bSets = [set("6", "C", false, 1), set("7", "D", true, 2), set("8", "D", true, 3), set("9", "A", false, 4)];
    expect(sharedOpponents(aSets, bSets, "A", "B")).toEqual([
      { playerId: "C", tag: "Tag C", a: { wins: 2, losses: 0 }, b: { wins: 0, losses: 1 } },
      { playerId: "D", tag: "Tag D", a: { wins: 0, losses: 1 }, b: { wins: 2, losses: 0 } },
    ]);
  });

  it("leaves out DQs and each other", () => {
    expect(sharedOpponents([set("1", "C", true, 1, { dq: true }), set("2", "B", true, 2)], [set("3", "C", true, 1), set("4", "A", false, 2)], "A", "B")).toEqual([]);
  });
});
