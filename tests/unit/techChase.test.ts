import { describe, expect, it } from "vitest";
import { TECH_OPTIONS, average, judgeGrab, moveSlot, newRound, reactionMs, techSlot, techTimings, type TechRound } from "@/lib/techChase";

const round = (over: Partial<TechRound> = {}): TechRound => ({ option: "left", waitMs: 600, rollMs: 500, openMs: 400, ...over });

describe("the tech-chase trainer", () => {
  it("sends each get-up to its spot", () => {
    expect(TECH_OPTIONS.map(techSlot)).toEqual([-1, 1, 0, 0]);
  });

  it("gets harder as grabs add up, down to a floor", () => {
    const easy = techTimings(0);
    const hard = techTimings(10);
    expect(hard.openMs).toBeLessThan(easy.openMs);
    expect(hard.rollMs).toBeLessThan(easy.rollMs);
    expect(techTimings(500)).toEqual({ rollMs: 300, openMs: 170, missedOpenMs: 230 });
  });

  it("makes a round from two random numbers; a missed tech is open at once", () => {
    const fixed = (list: number[]) => () => list.shift() ?? 0;
    expect(newRound(0, fixed([0.99, 0]))).toEqual({ option: "missed", waitMs: 500, rollMs: 0, openMs: 540 });
    expect(newRound(0, fixed([0, 0.5]))).toEqual({ option: "left", waitMs: 850, rollMs: 560, openMs: 430 });
    expect(newRound(0, fixed([1, 1])).option).toBe("missed"); // 1 can't run off the list
  });

  it("judges a grab by spot and timing", () => {
    const r = round();
    expect(judgeGrab(r, -50, -1)).toBe("early"); // before the dummy chose
    expect(judgeGrab(r, 600, 0)).toBe("wrongSpot");
    expect(judgeGrab(r, 300, -1)).toBe("early"); // still invincible
    expect(judgeGrab(r, 500, -1)).toBe("grab");
    expect(judgeGrab(r, 900, -1)).toBe("grab");
    expect(judgeGrab(r, 901, -1)).toBe("late");
    expect(judgeGrab(round({ option: "missed", rollMs: 0 }), 10, 0)).toBe("grab");
    expect(reactionMs(r, 712.4)).toBe(212);
  });

  it("keeps the player on the three spots, and averages reaction times", () => {
    expect(moveSlot(-1, -1)).toBe(-1);
    expect(moveSlot(0, 1)).toBe(1);
    expect(moveSlot(1, 1)).toBe(1);
    expect(average([200, 301])).toBe(251);
    expect(average([])).toBe(0);
  });
});
