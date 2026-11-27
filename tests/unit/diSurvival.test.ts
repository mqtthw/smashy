import { describe, expect, it } from "vitest";
import { DI_MOVES, STAGE, diAngle, fly, hitstun, knockback, launchAngle, margin, newDiRound, resolveHit } from "@/lib/diSurvival";

const move = (key: string) => DI_MOVES.find((m) => m.key === key)!;

describe("the DI trainer's Melee maths", () => {
  it("works out knockback with the game's formula", () => {
    // Fox's up smash (18%, base 30, growth 112) on Fox (weight 75) at 100%: p = 118.
    expect(knockback(move("fox-usmash"), 100, 75)).toBeCloseTo(((118 / 10 + (118 * 18) / 20) * (200 / 175) * 1.4 + 18) * 1.12 + 30, 6);
    expect(knockback(move("fox-usmash"), 100, 75)).toBeCloseTo(261.6, 0);
    expect(knockback(move("fox-usmash"), 100, 104)).toBeLessThan(knockback(move("fox-usmash"), 100, 75)); // heavier flies less
    expect(hitstun(261.6)).toBe(104);
  });

  it("turns the launch by up to 18 degrees, towards the stick, most when held straight across it", () => {
    expect(diAngle(90, { x: 1, y: 0 })).toBeCloseTo(72);
    expect(diAngle(90, { x: -1, y: 0 })).toBeCloseTo(108);
    expect(diAngle(90, { x: 0, y: 1 })).toBeCloseTo(90); // along the launch: nothing
    expect(diAngle(90, { x: 0, y: 0 })).toBe(90);
    expect(diAngle(45, { x: 1, y: 0 })).toBeCloseTo(45 - 9); // sin(45)^2 * 18
    expect(diAngle(45, { x: -1, y: 1 })).toBeCloseTo(63); // a diagonal straight across: capped at 18
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
  });
});

import { DI_VICTIMS, dealHit, diBand } from "@/lib/diSurvival";

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

  it("has a band for the classic case", () => {
    const band = diBand({ move: DI_MOVES.find((m) => m.key === "fox-usmash")!, x0: 0, facing: 1 }, "marth");
    expect(band).not.toBeNull();
    expect(band!.max).toBeGreaterThan(band!.kill);
  });
});
