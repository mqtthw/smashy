import { describe, expect, it } from "vitest";
import { allMoves, killPercent, killPercentBestDi, newDuel, newKillQuestion, newMoveGuess, shuffled } from "@/lib/frameGames";
import { MELEE_MOVES } from "@/lib/meleeMoves.data";

// A repeatable stream of 0..1 numbers.
const stream = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

describe("the moves read from the game", () => {
  it("has the numbers players know", () => {
    expect(MELEE_MOVES.fox.usmash).toEqual({ start: 7, end: 17, total: 41, damage: 18, hits: [[7, 17, 18]], kill: { damage: 18, angle: 80, base: 30, growth: 112 } });
    // Moves that stop hitting and start again keep their gap: Fox's up air is two hits, 8-9 and 11-14.
    expect(MELEE_MOVES.fox.uair!.hits).toEqual([[8, 9, 5], [11, 14, 13]]);
    expect(MELEE_MOVES.sheik.fsmash!.hits.length).toBe(2);
    expect(MELEE_MOVES.sheik.fsmash!.hits[1][0]).toBeGreaterThan(MELEE_MOVES.sheik.fsmash!.hits[0][1] + 1); // a gap between them
    for (const m of allMoves()) expect(m.data.hits[0][0], `${m.char} ${m.move}`).toBe(m.data.start);
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
  it("Which is faster?: never a tie, and the answer is the move that comes out sooner", () => {
    const rand = stream(11);
    for (let i = 0; i < 200; i++) {
      const d = newDuel(rand);
      expect(d.a.data.start).not.toBe(d.b.data.start);
      expect(d.answer).toBe(d.a.data.start < d.b.data.start ? "a" : "b");
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
        return JSON.stringify(o.hits.map((h) => [h[0], h[1]])) === JSON.stringify(g.data.hits.map((h) => [h[0], h[1]])) && o.total === g.data.total;
      });
      expect(same).toEqual([]);
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

  it("Does it kill? on hard: judged with the best DI an analog stick allows, which never dies sooner than no DI", () => {
    const usmash = MELEE_MOVES.fox.usmash!.kill!;
    expect(killPercentBestDi(usmash, "marth", "fd")!).toBeGreaterThan(killPercent(usmash, "marth", "fd")!); // DI buys percent
    const rand = stream(21);
    for (let i = 0; i < 12; i++) {
      const q = newKillQuestion(rand, true);
      if (!q.kills && q.percent >= q.noDiFrom) expect(q.stickAngle).not.toBeNull(); // saved by DI: there's a direction to show
      expect(q.hard).toBe(true);
      expect(q.flight.ko !== null).toBe(q.kills);
      expect(q.killsFrom).toBeGreaterThanOrEqual(q.noDiFrom);
      if (q.kills) expect(q.noDi.ko).not.toBeNull(); // if the best DI dies, so does none
    }
  });

  it("shuffles without losing anything", () => {
    expect(shuffled([1, 2, 3, 4], stream(2)).sort()).toEqual([1, 2, 3, 4]);
  });
});
