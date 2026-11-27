import { describe, expect, it } from "vitest";
import { NO_SHIELD, arrivesAt, drop, judgeShot, leavesAt, newShot, raise } from "@/lib/powershield";

describe("the powershield trainer, in Melee's frames", () => {
  it("reflects only in the shield's first two frames", () => {
    const up = (since: number) => raise(NO_SHIELD, since);
    expect(judgeShot(up(100), 100)).toEqual({ kind: "reflect", shieldFrame: 1 });
    expect(judgeShot(up(99), 100)).toEqual({ kind: "reflect", shieldFrame: 2 });
    expect(judgeShot(up(98), 100)).toEqual({ kind: "block", early: 1 });
    expect(judgeShot(up(80), 100)).toEqual({ kind: "block", early: 19 });
    expect(judgeShot(NO_SHIELD, 100)).toEqual({ kind: "hit" });
    expect(judgeShot(up(101), 100)).toEqual({ kind: "hit" }); // pressed a frame late
  });

  it("can't raise the shield again for 15 frames after dropping it", () => {
    let s = raise(NO_SHIELD, 10);
    s = drop(s, 12);
    expect(s).toEqual({ since: null, lockedUntil: 27 });
    expect(raise(s, 26).since).toBeNull();
    expect(raise(s, 27).since).toBe(27);
    expect(raise(raise(NO_SHIELD, 5), 9).since).toBe(5); // already up: holding keeps the first frame
    expect(drop(NO_SHIELD, 3)).toBe(NO_SHIELD);
  });

  it("fires Falco's laser on frame 23, and deals shots that come sooner as the run goes on", () => {
    const fixed = (list: number[]) => () => list.shift() ?? 0;
    const shot = newShot(100, 0, fixed([0, 0]));
    expect(shot).toEqual({ start: 170, travel: 12, distance: 60, out: 23 }); // 60 units at 5 a frame
    expect(leavesAt(shot)).toBe(193);
    expect(arrivesAt(shot)).toBe(205);
    expect(newShot(0, 0, fixed([0.999, 0.999]))).toEqual({ start: 119, travel: 30, distance: 150, out: 23 });
    expect(newShot(0, 30, fixed([0, 0])).start).toBe(20);
    // Fox's laser leaves on frame 12 and flies 7 units a frame: the same gap, crossed sooner.
    const fox = newShot(100, 0, fixed([0, 0]), "fox");
    expect(fox).toEqual({ start: 170, travel: 9, distance: 63, out: 12 });
    expect(arrivesAt(fox)).toBe(191);
    expect(newShot(0, 0, fixed([0, 0.999]), "fox")).toMatchObject({ travel: 21, distance: 147 });
  });
});
