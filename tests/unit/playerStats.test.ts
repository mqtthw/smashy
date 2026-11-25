import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: () => {} }));

const { computeStats, headToHead, portraitCharacters } = await import("@/lib/playerStats");
type PlayerSet = Parameters<typeof computeStats>[0][number];

const set = (id: string, opp: string, won: boolean, chars: string[] = [], dq = false): PlayerSet => ({
  id, completedAt: 0, game: "melee", tournamentName: "T", tournamentSlug: "t", eventName: "Singles", round: "R1",
  myScore: dq ? -1 : won ? 3 : 1, oppScore: dq ? 0 : won ? 1 : 3, opp: { playerId: opp, tag: `P${opp}` },
  won, dq, myCharacters: chars, oppCharacters: [],
});

describe("player stats", () => {
  const sets = [
    set("1", "a", true, ["Fox"]),
    set("2", "a", false, ["Fox", "Falco"]),
    set("3", "a", true, ["Fox"]),
    set("4", "b", true),
    set("5", "b", false, [], true), // DQ: not counted
    set("6", "c", true, ["Marth"]),
  ];

  it("counts wins and losses, leaving DQs out", () => {
    expect(computeStats(sets)).toMatchObject({ sets: 5, wins: 4, losses: 1 });
  });

  it("ranks characters by the share of sets with character data", () => {
    const { characters } = computeStats(sets);
    expect(characters[0]).toMatchObject({ name: "Fox", sets: 3, share: 75 }); // 3 of the 4 sets with characters
    expect(characters.map((c) => c.name)).toEqual(["Fox", "Falco", "Marth"]);
  });

  it("lists rivals played at least twice (counted sets)", () => {
    expect(computeStats(sets).rivals).toEqual([{ playerId: "a", tag: "Pa", wins: 2, losses: 1 }]);
  });

  it("never makes a rival of an opponent who hides their stats (no id, round 633)", () => {
    const hiddenOpp = [set("7", "", true), set("8", "", false), set("9", "", true)];
    expect(computeStats([...sets, ...hiddenOpp]).rivals.map((r) => r.playerId)).toEqual(["a"]);
    expect(computeStats([...sets, ...hiddenOpp])).toMatchObject({ sets: 8, wins: 6 }); // their sets still count
  });

  it("head-to-head against one opponent, optionally skipping the set being viewed", () => {
    expect(headToHead(sets, "a")).toMatchObject({ wins: 2, losses: 1 });
    expect(headToHead(sets, "a", "3")).toMatchObject({ wins: 1, losses: 1 });
    expect(headToHead(sets, "b")).toMatchObject({ wins: 1, losses: 0 }); // the DQ doesn't count
    expect(headToHead(sets, "zzz").sets).toEqual([]);
  });
});

describe("portraitCharacters (round 838)", () => {
  const c = (name: string, share: number) => ({ name, share });
  it("shows only the main when the others are occasional picks", () => {
    expect(portraitCharacters([c("Marth", 88), c("Falco", 7), c("Fox", 3)]).map((x) => x.name)).toEqual(["Marth"]);
  });
  it("keeps second and third characters played in at least a fifth of sets", () => {
    expect(portraitCharacters([c("Fox", 55), c("Falco", 30), c("Marth", 20), c("Sheik", 10)]).map((x) => x.name)).toEqual(["Fox", "Falco", "Marth"]);
    expect(portraitCharacters([c("Sheik", 70), c("Marth", 19)]).map((x) => x.name)).toEqual(["Sheik"]);
  });
  it("always keeps the most played, and handles none", () => {
    expect(portraitCharacters([c("Peach", 12)]).map((x) => x.name)).toEqual(["Peach"]);
    expect(portraitCharacters([])).toEqual([]);
  });
});
