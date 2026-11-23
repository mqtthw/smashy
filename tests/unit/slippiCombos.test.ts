// Combos from Slippi replays: which of the library's combos are kept, and a player's best across games.
import { describe, expect, it } from "vitest";
import { bestCombos, comboScore, keepCombos, type RawCombo, type ReplayCombo, type ReplayGame, type ReplayPlayer } from "@/lib/slippiStats";

const NAMES: Record<number, string> = { 13: "nair", 9: "utilt", 16: "uair", 17: "dair", 2: "jab" };
const name = (id: number) => NAMES[id] ?? "?";
// The library's shape: playerIndex is the player being hit, lastHitBy the attacker.
const raw = (by: number, victim: number, moveIds: number[], o: Partial<RawCombo> = {}): RawCombo => ({
  playerIndex: victim,
  lastHitBy: by,
  startFrame: 600,
  startPercent: 10,
  currentPercent: 10 + moveIds.length * 12,
  endPercent: 10 + moveIds.length * 12,
  didKill: false,
  moves: moveIds.map((moveId) => ({ playerIndex: by, moveId, damage: 12 })),
  ...o,
});

describe("keeping a game's combos", () => {
  it("credits the attacker, names the moves and adds up the damage", () => {
    const [c] = keepCombos([raw(0, 1, [13, 9, 16], { didKill: true, startFrame: 3600 })], name, () => "07:00");
    expect(c).toEqual({ by: 0, moves: ["nair", "utilt", "uair"], damage: 36, startPercent: 10, endPercent: 46, killed: true, seconds: 60, timer: "07:00" });
  });

  it("leaves out anything under three moves", () => {
    expect(keepCombos([raw(0, 1, [13, 9]), raw(1, 0, [2])], name)).toEqual([]);
  });

  it("counts only the attacker's moves, and skips a combo with no attacker", () => {
    const mixed = raw(0, 1, [13, 9, 16]);
    mixed.moves[1].playerIndex = 2; // someone else's hit in between
    expect(keepCombos([mixed], name)).toEqual([]);
    expect(keepCombos([raw(0, 1, [13, 9, 16], { lastHitBy: 1 })], name)).toEqual([]); // "hit by" themselves
  });

  it("uses the current percent when the combo never ended, and never a negative time", () => {
    const [c] = keepCombos([raw(0, 1, [13, 9, 16], { endPercent: null, currentPercent: 80, startFrame: -30 })], name);
    expect(c.endPercent).toBe(80);
    expect(c.seconds).toBe(0);
    expect(c.timer).toBeNull();
  });

  it("keeps the best eight of a game, a kill counting as 25% more", () => {
    const many = Array.from({ length: 12 }, (_, i) => raw(0, 1, [13, 9, 16], { startFrame: i * 100, moves: [13, 9, 16].map((moveId) => ({ playerIndex: 0, moveId, damage: i + 1 })) }));
    const kept = keepCombos(many, name);
    expect(kept).toHaveLength(8);
    expect(kept[0].damage).toBe(36);
    expect(comboScore({ damage: 40, killed: true })).toBeGreaterThan(comboScore({ damage: 60, killed: false }));
    expect(comboScore({ damage: 40, killed: true })).toBeLessThan(comboScore({ damage: 70, killed: false }));
  });
});

const player = (index: number, code: string, character: string): ReplayPlayer => ({
  index, code, name: null, character, won: null, kills: 0, damage: 0,
  openingsPerKill: { count: 0, total: 0 }, damagePerOpening: { count: 0, total: 0 }, neutralWins: { count: 0, total: 0 },
  counterHits: { count: 0, total: 0 }, inputsPerMinute: { count: 0, total: 0 }, lCancels: { success: 0, fail: 0 },
});
const combo = (by: number, damage: number, killed = false): ReplayCombo => ({ by, moves: ["nair", "utilt", "uair"], damage, startPercent: 0, endPercent: damage, killed, seconds: 30, timer: null });

describe("a player's best combos", () => {
  const games: ReplayGame[] = [
    { file: "a.slp", startAt: null, stage: "Battlefield", frames: 9000, players: [player(0, "ME#1", "Fox"), player(1, "A#1", "Marth")], combos: [combo(0, 40), combo(1, 90), combo(0, 55, true)] },
    // "Me" is on the other port here.
    { file: "b.slp", startAt: null, stage: "Yoshi's Story", frames: 9000, players: [player(2, "B#2", "Sheik"), player(3, "ME#1", "Falco")], combos: [combo(3, 70), combo(2, 99)] },
    { file: "c.slp", startAt: null, stage: "Dream Land", frames: 9000, players: [player(0, "ME#1", "Fox"), player(1, "C#3", "Peach")] }, // no combos read (Slippipedia)
  ];

  it("takes only my combos, from whichever port I was on, best first", () => {
    const best = bestCombos(games, "ME#1");
    expect(best.map((c) => [c.file, c.damage, c.killed])).toEqual([["a.slp", 55, true], ["b.slp", 70, false], ["a.slp", 40, false]]);
    expect(best[1]).toMatchObject({ character: "Falco", opponentCharacter: "Sheik", opponent: "B#2", stage: "Yoshi's Story" });
  });

  it("stops at the limit and is empty for someone not in the games", () => {
    expect(bestCombos(games, "ME#1", 1)).toHaveLength(1);
    expect(bestCombos(games, "NOBODY#0")).toEqual([]);
  });
});
