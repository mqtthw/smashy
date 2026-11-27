import { describe, expect, it } from "vitest";
import { DI_MOVES, STAGE, diAngle, fly, hitlag, hitstun, knockback, launchAngle, margin, newDiRound, resolveHit } from "@/lib/diSurvival";

const move = (key: string) => DI_MOVES.find((m) => m.key === key)!;

describe("the DI trainer's Melee maths", () => {
  it("works out knockback with the game's formula", () => {
    // Fox's up smash (18%, base 30, growth 112) on Fox (weight 75) at 100%: p = 118.
    expect(knockback(move("fox-usmash"), 100, 75)).toBeCloseTo(((118 / 10 + (118 * 18) / 20) * (200 / 175) * 1.4 + 18) * 1.12 + 30, 6);
    expect(knockback(move("fox-usmash"), 100, 75)).toBeCloseTo(261.6, 0);
    expect(knockback(move("fox-usmash"), 100, 104)).toBeLessThan(knockback(move("fox-usmash"), 100, 75)); // heavier flies less
    expect(hitstun(261.6)).toBe(104);
    expect([18, 3, 60].map(hitlag)).toEqual([9, 4, 20]); // damage / 3 + 3, at most 20
  });

  it("turns the launch by up to 18 degrees, towards the stick, most when held straight across it", () => {
    expect(diAngle(90, { x: 1, y: 0 })).toBeCloseTo(72);
    expect(diAngle(90, { x: -1, y: 0 })).toBeCloseTo(108);
    expect(diAngle(90, { x: 0, y: 1 })).toBeCloseTo(90); // along the launch: nothing
    expect(diAngle(90, { x: 0, y: 0 })).toBe(90);
    expect(diAngle(45, { x: 1, y: 0 })).toBeCloseTo(45 - 9); // sin(45)^2 * 18
    // A diagonal straight across: the stick is clamped to a circle, so it is 0.7 on each axis (length 0.99), not 1.41.
    expect(diAngle(45, { x: -1, y: 1 })).toBeCloseTo(45 + 18 * (2 * 0.7 * 0.7));
    expect(diAngle(45, { x: -1, y: 1 })).toBeLessThan(63);
  });

  it("mirrors a launch for a hit from the right, and reads the Sakurai angle as 44 on the ground", () => {
    expect(launchAngle(move("falcon-knee"), 1)).toBe(32);
    expect(launchAngle(move("falcon-knee"), -1)).toBe(148);
    expect(launchAngle(move("marth-fsmash"), 1)).toBe(44);
  });

  it("flies a launch frame by frame: a weak one lands or runs out, a strong one dies", () => {
    const weak = fly(60, 80, "fox", 0);
    expect(weak.ko).toBeNull();
    const strong = fly(261.6, 80, "fox", 0);
    expect(strong.ko).toBe("top");
    expect(strong.points.at(-1)![1]).toBeGreaterThan(STAGE.top);
    expect(fly(300, 25, "fox", 60).ko).toBe("side");
    expect(margin(strong)).toBe(0);
    // Past the bottom line: a KO while still in hitstun, not after it (the player could have jumped).
    const low = fly(120, 350, "fox", 80, STAGES.yoshis); // sent down and off the edge: 48 frames of hitstun
    expect(low.points.at(-1)![1]).toBeLessThan(STAGES.yoshis.bottom);
    expect(low.ko).toBe(low.frames <= 48 ? "bottom" : null);
    expect(fly(60, 350, "jigglypuff", 60, STAGES.yoshis).ko).toBeNull(); // 24 frames of hitstun, a slow fall
    expect(margin(weak)).toBeGreaterThan(0);
    // The first frame already moves at the decayed speed: 261.6 * 0.03 - 0.051 up, less Fox's gravity.
    expect(fly(261.6, 90, "fox", 0).points[1][1]).toBeCloseTo(261.6 * 0.03 - 0.051 - 0.23, 6);
  });

  it("finds a percent where DI is the difference between dying and living", () => {
    // Marth's tipper on Fox near the edge, sent the short way: somewhere it kills without DI and not with the best DI.
    let found = false;
    for (let pct = 20; pct <= 150 && !found; pct++) {
      const r = resolveHit(move("marth-fsmash"), pct, "fox", 60, 1, { x: 0, y: 0 });
      if (r.none.ko && !r.best.flight.ko) found = true;
    }
    expect(found).toBe(true);
    const r = resolveHit(move("fox-usmash"), 100, "fox", 0, 1, { x: 1, y: 0 });
    expect(r.turned).toBeCloseTo(-18 * Math.sin((80 * Math.PI) / 180) ** 2);
    expect(r.mine.points.at(-1)![0]).toBeGreaterThan(r.none.points.at(-1)![0]); // DI right carries further right
  });

  it("deals a round from three random numbers", () => {
    const fixed = (list: number[]) => () => list.shift() ?? 0;
    expect(newDiRound(fixed([0, 0, 0]))).toEqual({ move: DI_MOVES[0], x0: -60, facing: 1 });
    expect(newDiRound(fixed([0.999, 0.999, 0.9]))).toEqual({ move: DI_MOVES.at(-1), x0: 60, facing: -1 });
    expect(newDiRound(fixed([0, 0.999, 0]), STAGES.yoshis).x0).toBe(39); // a smaller stage: the spots move in
  });
});

import { DI_VICTIMS, STAGES, dealHit, diBand } from "@/lib/diSurvival";

describe("the DI trainer's hits", () => {
  it("only deals hits where no DI dies and the best DI lives", () => {
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (const victim of DI_VICTIMS)
      for (let level = 0; level < 12; level += 4) {
        const hit = dealHit(rand, victim, level);
        const r = resolveHit(hit.move, hit.percent, victim, hit.x0, hit.facing, { x: 0, y: 0 });
        expect(r.none.ko, `${victim} ${hit.move.key} ${hit.percent}%`).not.toBeNull();
        expect(r.best.flight.ko, `${victim} ${hit.move.key} ${hit.percent}%`).toBeNull();
      }
  });

  it("kills sooner on a small stage than on a big one", () => {
    const round = { move: DI_MOVES.find((m) => m.key === "fox-usmash")!, x0: 0, facing: 1 as const };
    const yoshis = diBand(round, "marth", STAGES.yoshis)!;
    const dreamland = diBand(round, "marth", STAGES.dreamland)!;
    expect(yoshis.kill).toBeLessThan(dreamland.kill);
    for (const stage of Object.values(STAGES)) {
      const hit = dealHit(Math.random, "fox", 3, stage);
      const r = resolveHit(hit.move, hit.percent, "fox", hit.x0, hit.facing, { x: 0, y: 0 }, stage);
      expect(r.none.ko, stage.name).not.toBeNull();
      expect(r.best.flight.ko, stage.name).toBeNull();
    }
  });

  it("has a band for the classic case", () => {
    const band = diBand({ move: DI_MOVES.find((m) => m.key === "fox-usmash")!, x0: 0, facing: 1 }, "marth");
    expect(band).not.toBeNull();
    expect(band!.max).toBeGreaterThan(band!.kill);
  });
});

import { analogDiRange, analogStick, bestAnalogDi, stickTurn } from "@/lib/diSurvival";

describe("the best DI on an analog stick, as the game reads a controller", () => {
  it("reads the stick in whole steps of a circle of 80, with a deadzone on each axis", () => {
    expect(analogStick(0)).toEqual({ x: 1, y: 0 });
    expect(analogStick(45)).toEqual({ x: 56 / 80, y: 56 / 80 });
    expect(analogStick(10)).toEqual({ x: 78 / 80, y: 0 }); // 13 steps up: under the deadzone, so it reads as flat
    expect(analogStick(17).y).toBeCloseTo(23 / 80); // 23 steps: the first that counts
    expect(analogStick(180).x).toBe(-1);
  });

  it("turns a launch by up to 18 degrees either way: the full 18 when straight across is a cardinal, a little less when it isn't", () => {
    expect(stickTurn(90, { x: -1, y: 0 })).toBeCloseTo(18);
    expect(stickTurn(90, { x: 1, y: 0 })).toBeCloseTo(-18);
    const up = analogDiRange(90);
    expect(up.max).toBeCloseTo(18);
    expect(up.min).toBeCloseTo(-18);
    const usmash = analogDiRange(80); // straight across is 170 and 350 degrees: inside the vertical axis's deadzone
    expect(usmash.max).toBeGreaterThan(16.5);
    expect(usmash.max).toBeLessThan(18);
    // More than a keyboard's flat left or right gets here, which is 18 * sin(80)^2.
    expect(usmash.max).toBeGreaterThan(18 * Math.sin((80 * Math.PI) / 180) ** 2);
    const diagonal = analogDiRange(45); // straight across is a clean diagonal: 0.7 on each axis, length 0.99
    expect(diagonal.max).toBeGreaterThanOrEqual(18 * (2 * 0.7 * 0.7)); // a step beside the clean diagonal is a touch longer
    expect(diagonal.max).toBeLessThanOrEqual(18);
  });

  it("finds a direction that survives where a keyboard's best doesn't have to", () => {
    // Fox's up smash on Marth: the analog best is at least as good as the best of eight directions at every percent.
    const move = DI_MOVES.find((m) => m.key === "fox-usmash")!;
    for (const pct of [90, 100, 110, 120, 130]) {
      const keyboard = resolveHit(move, pct, "marth", 0, 1, { x: 0, y: 0 });
      const analog = bestAnalogDi(keyboard.kb, keyboard.angle, "marth", 0);
      expect(margin(analog.flight)).toBeGreaterThanOrEqual(margin(keyboard.best.flight) - 0.5);
      if (analog.turn !== 0) expect(analog.stickAngle).not.toBeNull();
    }
  });
});

import { passedTopAlive } from "@/lib/diSurvival";

describe("the top blast line", () => {
  it("only kills while knockback is still carrying the character up fast: a slow drift over it lives", () => {
    // Jigglypuff, sent up Yoshi's Story at a strength that tops out just above the line.
    let found = null;
    for (let kb = 120; kb < 260 && !found; kb++) {
      const f = fly(kb, 70, "jigglypuff", 0, STAGES.yoshis);
      if (passedTopAlive(f, STAGES.yoshis)) found = f;
    }
    expect(found).not.toBeNull();
    expect(Math.max(...found!.points.map(([, y]) => y))).toBeGreaterThan(STAGES.yoshis.top);
    expect(found!.ko).toBeNull();
    // Harder, and she is still rising fast at the line: that one kills.
    expect(fly(400, 70, "jigglypuff", 0, STAGES.yoshis).ko).toBe("top");
    expect(passedTopAlive(fly(60, 70, "jigglypuff", 0, STAGES.yoshis), STAGES.yoshis)).toBe(false); // never got there
  });
});

import { touchStick } from "@/lib/diSurvival";

describe("the touch stick (round 985)", () => {
  it("reads like a controller: clamped to the circle, cut to steps of 80, deadzone at 22 steps", () => {
    expect(touchStick({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
    expect(touchStick({ x: 0.2, y: 0.1 })).toEqual({ x: 0, y: 0 }); // both axes in the deadzone
    expect(touchStick({ x: 2, y: 0 })).toEqual({ x: 1, y: 0 }); // past the rim is the rim
    expect(touchStick({ x: 1, y: 1 })).toEqual({ x: 56 / 80, y: 56 / 80 }); // a full diagonal, as the game reads it
    expect(touchStick({ x: 0.9, y: 0.25 })).toEqual({ x: 72 / 80, y: 0 }); // y at 20 steps: dropped
    expect(touchStick({ x: -0.5, y: 0.5 })).toEqual({ x: -40 / 80, y: 40 / 80 });
  });
  it("turns a launch exactly as a keyboard does for the same full directions", () => {
    const m = DI_MOVES[0];
    for (const s of [{ x: 1, y: 0 }, { x: 0, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }]) {
      const key = resolveHit(m, 120, "fox", 0, 1, s, STAGE);
      const touch = resolveHit(m, 120, "fox", 0, 1, s, STAGE, true);
      expect(touch.turned).toBeCloseTo(key.turned, 6);
      expect(touch.mine.ko).toBe(key.mine.ko);
    }
  });
  it("finds a best DI at least as good as the keyboard's eight directions", () => {
    for (const m of DI_MOVES.slice(0, 6)) {
      for (const pct of [60, 110, 160]) {
        const key = resolveHit(m, pct, "marth", 30, -1, { x: 0, y: 0 }, STAGE);
        const touch = resolveHit(m, pct, "marth", 30, -1, { x: 0, y: 0 }, STAGE, true);
        expect(margin(touch.best.flight, STAGE)).toBeGreaterThanOrEqual(margin(key.best.flight, STAGE) - 1e-9);
      }
    }
  });
});
