import { describe, expect, it } from "vitest";
import { SHIELD_GAP, ULT_MOVES, newShieldDuel, newUltDuel, newUltMoveGuess, shieldMoves } from "@/lib/ultimateFrames";

// A seeded random, so each run asks the same questions.
const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

describe("Ultimate's move frames (round 968)", () => {
  it("has every Ultimate fighter the calculator covers, with Mario's moves as ultimateframedata.com lists them", () => {
    expect(Object.keys(ULT_MOVES).length).toBeGreaterThanOrEqual(80);
    const m = ULT_MOVES.mario;
    // Checked by hand on 2026-11-27: startup, total frames, landing lag and on-shield numbers. On the ground the number
    // is the move at its safest (round 994): ultimateframedata.com's (counted from the first frame it can hit:
    // -13, -20, -20) plus the frames it stays out after that, as hitting on its last frame out.
    expect(m.ftilt).toMatchObject({ start: 5, end: 7, total: 25, shield: -13 + 2 });
    expect(m.fsmash).toMatchObject({ start: 15, end: 17, total: 47, shield: -20 + 2 });
    expect(m.usmash).toMatchObject({ start: 9, end: 12, total: 39, shield: -20 + 3 });
    expect(m.nair).toMatchObject({ start: 3, total: 45, landing: 6, shield: -2 });
    expect(m.fair).toMatchObject({ start: 16, total: 59, landing: 17, shield: -12 });
    expect(m.uair).toMatchObject({ start: 4, total: 30, landing: 6, shield: -3 });
    // Separate hits stay separate: down air's five hits and its final one.
    expect(m.dair!.hits.map(([a, b]) => `${a}-${b}`)).toEqual(["5-5", "7-7", "9-9", "11-11", "13-13", "23-23"]);
    expect(m.dair!.shield).toBeNull();
    expect(ULT_MOVES.fox.bair).toMatchObject({ start: 9, total: 48, landing: 9, shield: -4 });
    expect(ULT_MOVES.fox.usmash).toMatchObject({ start: 8, total: 55, shield: -35 }); // -36 from its first frame
  });

  it("asks Which is faster? and Guess the move from Ultimate's moves", () => {
    const rand = seeded(7);
    for (let i = 0; i < 50; i++) {
      const d = newUltDuel(rand);
      expect(d.a.data.start).not.toBe(d.b.data.start);
      expect(d[d.answer].data.start).toBeLessThan(d[d.answer === "a" ? "b" : "a"].data.start);
      const g = newUltMoveGuess(rand);
      expect(g.options).toHaveLength(4);
      expect(g.options).toContain(g.answer);
      expect(new Set(g.options).size).toBe(4);
    }
  });

  it("only compares moves at least three frames apart on shield, and the answer is the one less behind", () => {
    expect(shieldMoves().every((m) => m.move !== "jab" && m.move !== "grab" && m.move !== "dashGrab")).toBe(true);
    const rand = seeded(3);
    for (let i = 0; i < 100; i++) {
      const q = newShieldDuel(rand);
      const [win, lose] = q.answer === "a" ? [q.a, q.b] : [q.b, q.a];
      expect(win.data.shield! - lose.data.shield!).toBeGreaterThanOrEqual(SHIELD_GAP);
    }
  });

  it("gives on-shield numbers only for fighters whose data lists the hits' shield-stun multipliers", () => {
    // Mega Man's down air came out -9 with no multiplier to see; ultimateframedata.com has it at +1 (round 992).
    expect(Object.values(ULT_MOVES["mega-man"]).every((m) => m!.shield === null)).toBe(true);
    const fighters = new Set(shieldMoves().map((m) => m.char));
    expect(fighters.size).toBeLessThanOrEqual(20);
    expect(fighters.has("mario") && fighters.has("fox")).toBe(true);
    expect(shieldMoves().length).toBeGreaterThan(100); // still plenty for ten questions
  });
});
