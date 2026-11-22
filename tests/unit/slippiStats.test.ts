// Slippi replay stats: whose replays they are, and adding a player's numbers up across games.
import { describe, expect, it } from "vitest";
import { likelyMe, playerKey, totalsFor, type ReplayGame, type ReplayPlayer } from "@/lib/slippiStats";

const p = (code: string, character: string, won: boolean | null, o: Partial<ReplayPlayer> = {}): ReplayPlayer => ({
  index: 0,
  code,
  name: null,
  character,
  won,
  kills: 4,
  damage: 300,
  openingsPerKill: { count: 20, total: 4 },
  damagePerOpening: { count: 300, total: 20 },
  neutralWins: { count: 20, total: 40 },
  counterHits: { count: 5, total: 40 },
  inputsPerMinute: { count: 1500, total: 5 },
  lCancels: { success: 8, fail: 2 },
  ...o,
});
const game = (a: ReplayPlayer, b: ReplayPlayer, stage = "Battlefield", frames = 18000): ReplayGame => ({ file: "x.slp", startAt: null, stage, frames, players: [a, b] });

describe("whose replays", () => {
  it("puts the player in the most games first", () => {
    const games = [game(p("ME#1", "Fox", true), p("A#1", "Marth", false)), game(p("B#2", "Sheik", true), p("ME#1", "Fox", false)), game(p("A#1", "Marth", true), p("C#3", "Peach", false))];
    expect(likelyMe(games)).toEqual([
      { key: "A#1", games: 2 },
      { key: "ME#1", games: 2 },
      { key: "B#2", games: 1 },
      { key: "C#3", games: 1 },
    ]);
  });

  it("falls back to the name when there's no connect code", () => {
    expect(playerKey({ code: "", name: "Mango" })).toBe("Mango");
    expect(playerKey({ code: null, name: "  " })).toBeNull();
  });
});

describe("a player's totals", () => {
  const games = [
    game(p("ME#1", "Fox", true), p("A#1", "Marth", false), "Battlefield", 18000),
    game(p("B#2", "Sheik", true), p("ME#1", "Falco", false, { kills: 2, openingsPerKill: { count: 16, total: 2 }, lCancels: { success: 0, fail: 10 } }), "Yoshi's Story", 7200),
    game(p("ME#1", "Fox", null), p("A#1", "Marth", null), "Battlefield", 3600),
    game(p("X#9", "Peach", true), p("Y#8", "Puff", false)),
  ];

  it("counts games, record and time, and works rates out from the summed counts", () => {
    const t = totalsFor(games, "ME#1")!;
    expect([t.games, t.wins, t.losses, t.kills]).toEqual([3, 1, 1, 10]);
    expect(t.minutes).toBe(8);
    expect(t.openingsPerKill).toBe(56 / 10); // not the average of 5, 8 and 5
    expect(t.neutralWinRate).toBe(0.5);
    expect(t.lCancelRate).toBe(16 / 30);
  });

  it("splits the record by character, opponents' characters, stage and opponent", () => {
    const t = totalsFor(games, "ME#1")!;
    expect(t.byCharacter).toEqual([
      { name: "Fox", games: 2, wins: 1, losses: 0 },
      { name: "Falco", games: 1, wins: 0, losses: 1 },
    ]);
    expect(t.byOpponentCharacter[0]).toEqual({ name: "Marth", games: 2, wins: 1, losses: 0 });
    expect(t.byStage.map((s) => s.name)).toEqual(["Battlefield", "Yoshi's Story"]);
    expect(t.opponents).toEqual([
      { name: "A#1", games: 2, wins: 1, losses: 0 },
      { name: "B#2", games: 1, wins: 0, losses: 1 },
    ]);
  });

  it("has nothing for a player in none of the games, and no rate without a total", () => {
    expect(totalsFor(games, "NOBODY#0")).toBeNull();
    const t = totalsFor([game(p("ME#1", "Fox", true, { kills: 0, openingsPerKill: { count: 3, total: 0 }, lCancels: { success: 0, fail: 0 } }), p("A#1", "Marth", false))], "ME#1")!;
    expect(t.openingsPerKill).toBeNull();
    expect(t.lCancelRate).toBeNull();
  });
});
