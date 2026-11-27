import { describe, expect, it } from "vitest";
import { PUNISH_MOVES, allMoves, killPercent, lagAfter, newDuel, newKillQuestion, newMoveGuess, newPunish, shuffled } from "@/lib/frameGames";
import { MELEE_MOVES } from "@/lib/meleeMoves.data";

// A repeatable stream of 0..1 numbers.
const stream = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

describe("the moves read from the game", () => {
  it("has the numbers players know", () => {
    expect(MELEE_MOVES.fox.usmash).toEqual({ start: 7, end: 17, total: 41, damage: 18, kill: { damage: 18, angle: 80, base: 30, growth: 112 } });
    expect(MELEE_MOVES.marth.fsmash).toMatchObject({ start: 10, end: 13, kill: { damage: 20, angle: 361, base: 80, growth: 70 } }); // the tipper
    expect(MELEE_MOVES.marth.dtilt).toMatchObject({ start: 7, end: 9, total: 19 });
    expect(MELEE_MOVES.marth.grab).toMatchObject({ start: 7, end: 8, total: 30 });
    expect(MELEE_MOVES["captain-falcon"].fair).toMatchObject({ start: 14, kill: { damage: 18, angle: 32, base: 24, growth: 100 } }); // the knee
    expect(MELEE_MOVES.sheik.fair).toMatchObject({ start: 5, end: 7, kill: { damage: 13, angle: 25, base: 0, growth: 100 } });
    expect(MELEE_MOVES.fox.jab).toMatchObject({ start: 2, end: 3 });
    expect(allMoves().length).toBeGreaterThan(150);
    for (const m of allMoves()) expect(m.data.start <= m.data.end && m.data.end <= m.data.total, `${m.char} ${m.move}`).toBe(true);
  });
});

describe("the Arcade's Melee knowledge games", () => {
  it("Which is faster?: never a tie, and the answer is the sooner move or the bigger hit", () => {
    const rand = stream(11);
    for (let i = 0; i < 200; i++) {
      const d = newDuel(rand);
      const [x, y] = d.kind === "startup" ? [d.a.data.start, d.b.data.start] : [d.a.data.damage, d.b.data.damage];
      expect(x).not.toBe(y);
      expect(d.answer).toBe(d.kind === "startup" ? (x < y ? "a" : "b") : x > y ? "a" : "b");
      if (d.kind === "damage") expect([d.a.move, d.b.move].some((m) => m === "grab" || m === "dashGrab")).toBe(false);
    }
  });

  it("Guess the move: four of one character's moves, the answer among them, none with the same frames", () => {
    const rand = stream(5);
    for (let i = 0; i < 100; i++) {
      const g = newMoveGuess(rand);
      expect(new Set(g.options).size).toBe(4);
      expect(g.options).toContain(g.answer);
      const same = g.options.filter((m) => m !== g.answer).filter((m) => {
        const o = MELEE_MOVES[g.char][m]!;
        return o.start === g.data.start && o.end === g.data.end && o.total === g.data.total;
      });
      expect(same).toEqual([]);
    }
  });

  it("Punish it: the answer comes out in time and nothing that also does hits harder; something offered is too slow", () => {
    const rand = stream(3);
    expect(lagAfter({ start: 10, end: 13, total: 47, damage: 20, kill: null })).toBe(34);
    for (let i = 0; i < 100; i++) {
      const p = newPunish(rand);
      const mine = (m: (typeof PUNISH_MOVES)[number]) => MELEE_MOVES[p.me][m]!;
      expect(p.window).toBe(lagAfter(p.whiff.data));
      expect(mine(p.answer).start).toBeLessThanOrEqual(p.window);
      const inTime = p.options.filter((m) => mine(m).start <= p.window);
      expect(inTime.every((m) => m === p.answer || mine(m).damage < mine(p.answer).damage)).toBe(true);
      expect(inTime.length).toBeLessThan(p.options.length);
    }
  });

  it("Does it kill?: the answer is what the flight says, around the percent the move starts to kill", () => {
    // Fox's up smash on Marth in the middle of Final Destination: dies from some percent up, and not just below it.
    const from = killPercent(MELEE_MOVES.fox.usmash!.kill!, "marth", "fd")!;
    expect(from).toBeGreaterThan(60);
    expect(from).toBeLessThan(140);
    expect(killPercent(MELEE_MOVES.fox.usmash!.kill!, "marth", "yoshis")!).toBeLessThan(from); // a lower ceiling
    expect(killPercent(MELEE_MOVES.fox.jab!.kill!, "marth", "fd")).toBeNull(); // a jab never kills
    const rand = stream(9);
    for (let i = 0; i < 40; i++) {
      const q = newKillQuestion(rand);
      expect(q.flight.ko !== null).toBe(q.kills);
      expect(q.kills).toBe(q.percent >= q.killsFrom);
      expect(q.percent).toBeGreaterThanOrEqual(0);
    }
  });

  it("shuffles without losing anything", () => {
    expect(shuffled([1, 2, 3, 4], stream(2)).sort()).toEqual([1, 2, 3, 4]);
  });
});
