import { describe, expect, it } from "vitest";
import { ULT_FIGHTERS, ULT_MOVES, ULT_STAGES } from "@/lib/ultimateKill.data";
import { newUltKillQuestion, ultAngle, ultBestDi, ultFly, ultHitstun, ultKillPercent, ultKnockback, ultLaunch, ultStick, ultTumble } from "@/lib/ultimateKill";

const mario = ULT_FIGHTERS.mario;
const fsmash = ULT_MOVES.mario.fsmash!;
const usmash = ULT_MOVES.mario.usmash!;
const fd = ULT_STAGES[0];
const stream = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

describe("the data from the Smash Ultimate Calculator", () => {
  it("has Mario as the calculator has him", () => {
    expect(mario).toEqual({ weight: 98, gravity: 0.087, fallSpeed: 1.5, flyGravity: 0.074928, flyFallSpeed: 1.8 });
    expect(fsmash).toEqual([17.8, 361, 25, 99]); // the fire hitbox
    expect(fd).toMatchObject({ name: "Final Destination", left: -240, right: 240, top: 180, bottom: -140 });
    expect(Object.keys(ULT_FIGHTERS).length).toBeGreaterThan(80);
    expect(ULT_STAGES.map((s) => s.name)).toEqual(["Final Destination", "Battlefield", "Small Battlefield", "Pokémon Stadium 2", "Smashville", "Town & City", "Kalos Pokémon League", "Hollow Bastion"]);
  });
});

describe("Ultimate's launch maths", () => {
  it("works out knockback with the fresh-move bonus, from the percent before the hit", () => {
    const p = 100 + 17.8 * 1.05;
    expect(ultKnockback(fsmash, 100, 98)).toBeCloseTo(((p / 10 + (p * 17.8 * 1.015) / 20) * 1.4 * (200 / 198) + 18) * 0.99 + 25, 6);
    expect(ultKnockback(fsmash, 100, 135)).toBeLessThan(ultKnockback(fsmash, 100, 98)); // Bowser flies less
  });

  it("counts hitstun and tumble as the calculator does", () => {
    expect(ultHitstun(100)).toBe(39);
    expect(ultHitstun(5)).toBe(4); // never under five before the one is taken off
    expect([79, 80].map(ultTumble)).toEqual([false, true]);
  });

  it("reads the Sakurai angle on the ground, and lifts a hard flat launch to 32 degrees", () => {
    expect([40, 60, 74, 88, 200].map((kb) => ultAngle(361, kb))).toEqual([0, 1, 20, 38, 38]);
    expect(ultAngle(0, 119)).toBe(0);
    expect(ultAngle(0, 120)).toBe(32);
    expect(ultAngle(83, 200)).toBe(83);
  });

  it("adds the gravity boost in tumble, but not to a steep upward launch", () => {
    const side = ultLaunch(fsmash, 100, mario); // 38 degrees, in tumble
    const speed = side.kb * 0.03;
    expect(side.vy).toBeCloseTo(speed * Math.sin((38 * Math.PI) / 180) + 5 * (0.087 - 0.075), 6);
    expect(side.flyTop).toBe(false);
    const up = ultLaunch(usmash, 100, mario); // 83 degrees
    expect(up.flyTop).toBe(true);
    expect(up.vy).toBeCloseTo(up.kb * 0.03 * Math.sin((83 * Math.PI) / 180), 6);
  });

  it("reads the stick like a GameCube controller", () => {
    expect(ultStick(0)).toEqual({ x: 1, y: 0 });
    expect(ultStick(10)).toEqual({ x: 1, y: 0 }); // 22 up: under 24, so flat
    expect(ultStick(45).x).toBeCloseTo(90.5 / 120, 2);
  });

  it("turns a launch with DI by up to 0.17 radians, and holding up sends it further", () => {
    const none = ultLaunch(fsmash, 120, mario);
    const up = ultLaunch(fsmash, 120, mario, { x: 0, y: 1 });
    expect(Math.abs(up.angle - none.angle)).toBeLessThanOrEqual((0.17 * 180) / Math.PI + 1e-6);
    expect(up.angle).toBeGreaterThan(none.angle); // turned upward
    expect(Math.hypot(up.vx, up.vy)).toBeCloseTo(Math.hypot(none.vx, none.vy) * 1.095, 6);
    // Near vertical, holding up or down doesn't change the speed.
    const upNone = ultLaunch(usmash, 120, mario);
    const upDown = ultLaunch(usmash, 120, mario, { x: 0, y: -1 });
    expect(Math.hypot(upDown.vx, upDown.vy)).toBeCloseTo(Math.hypot(upNone.vx, upNone.vy), 6);
  });
});

describe("Ultimate's kills", () => {
  it("kills from a sensible percent, sooner on a lighter fighter, and DI buys percent", () => {
    const from = ultKillPercent(fsmash, mario, fd)!;
    expect(from).toBeGreaterThan(70);
    expect(from).toBeLessThan(140);
    expect(ultKillPercent(fsmash, ULT_FIGHTERS.pichu, fd)!).toBeLessThan(from);
    expect(ultKillPercent(fsmash, ULT_FIGHTERS.bowser, fd)!).toBeGreaterThan(from);
    expect(ultKillPercent(fsmash, mario, fd, true, from)!).toBeGreaterThan(from);
    expect(ultFly(ultLaunch(fsmash, from, mario), mario, fd).ko).toBe("side");
    expect(ultFly(ultLaunch(fsmash, from - 1, mario), mario, fd).ko).toBeNull();
    expect(ultBestDi(fsmash, from, mario, fd).stickAngle).not.toBeNull();
  });

  it("deals questions whose answer is what the flight says", () => {
    const rand = stream(17);
    for (let i = 0; i < 20; i++) {
      const q = newUltKillQuestion(rand);
      expect(q.flight.ko !== null).toBe(q.kills);
      expect(q.kills).toBe(q.percent >= q.killsFrom);
    }
    const hardRand = stream(4);
    for (let i = 0; i < 6; i++) {
      const q = newUltKillQuestion(hardRand, true);
      expect(q.flight.ko !== null).toBe(q.kills);
      expect(q.killsFrom).toBeGreaterThanOrEqual(q.noDiFrom);
    }
  });
});
