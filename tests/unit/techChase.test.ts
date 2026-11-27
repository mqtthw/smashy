import { describe, expect, it } from "vitest";
import { busy, foxAt, framesAt, judgeFrame, moveSlot, newScript, openFrames, scriptFrames, striking, type Action, type Script } from "@/lib/techChase";

const fixed = (list: number[]) => () => list.shift() ?? 0;
const script = (nums: number[]): Script => newScript(fixed(nums));
const grabAt = (since: number): Action => ({ move: "grab", since });
const tiltAt = (since: number): Action => ({ move: "tilt", since });

describe("the tech-chase trainer, in Melee's frames", () => {
  it("builds each knockdown from the frame data", () => {
    expect(script([0]).phases.map((p) => [p.name, p.frames, p.intangible])).toEqual([["tech", 26, [1, 20]]]);
    expect(script([0.3]).phases[0]).toMatchObject({ name: "techRoll", frames: 40, intangible: [1, 20], to: -1 });
    expect(script([0.6]).phases[0]).toMatchObject({ name: "techRoll", to: 1 });
    const missed = script([0.99, 0, 0.99]); // missed tech, the shortest wait, a getup attack
    expect(missed.phases.map((p) => [p.name, p.frames])).toEqual([["bounce", 26], ["lying", 10], ["getupAttack", 49]]);
    expect(scriptFrames(missed)).toBe(85);
    expect(script([0.99, 0.999, 0]).phases[1].frames).toBe(40); // the longest wait
    expect(script([0.99, 0, 0]).phases[2]).toMatchObject({ name: "getupRoll", intangible: [12, 29], to: -1 }); // backward
    expect(script([0.99, 0, 0.3]).phases[2]).toMatchObject({ name: "getupRoll", intangible: [1, 19], to: 1 }); // forward
    expect(script([0.99, 0, 0.6]).phases[2]).toMatchObject({ name: "getupStand", frames: 30, intangible: [1, 23] }); // the plain getup
  });

  it("knows where Fox is and whether he can be touched on any frame", () => {
    const s = script([0.3]); // tech roll left
    expect(foxAt(s, 1)).toMatchObject({ spot: 0, vulnerable: false, free: false });
    expect(foxAt(s, 20)).toMatchObject({ spot: -1, vulnerable: false });
    expect(foxAt(s, 21)).toMatchObject({ spot: -1, vulnerable: true });
    expect(foxAt(s, 40).free).toBe(false);
    expect(foxAt(s, 41)).toMatchObject({ free: true, spot: -1 });
    const m = script([0.99, 0, 0.99]);
    expect(foxAt(m, 26)).toMatchObject({ downed: true, vulnerable: true });
    expect(foxAt(m, 36).phase?.name).toBe("lying");
    expect(foxAt(m, 37)).toMatchObject({ downed: false, vulnerable: false, hitting: false }); // getup attack, frame 1
    expect(foxAt(m, 36 + 17).hitting).toBe(true);
    expect(foxAt(m, 36 + 27)).toMatchObject({ vulnerable: true, hitting: false });
  });

  it("times the player's moves: a grab is out on frames 7-8 of 30, a down tilt on 7-9 and free on 20", () => {
    expect([6, 7, 8, 9].map((f) => striking(grabAt(0), f))).toEqual([false, true, true, false]);
    expect([6, 7, 9, 10].map((f) => striking(tiltAt(0), f))).toEqual([false, true, true, false]);
    expect([30, 31].map((f) => busy(grabAt(0), f))).toEqual([true, false]);
    expect([19, 20].map((f) => busy(tiltAt(0), f))).toEqual([true, false]);
    expect(busy(null, 5)).toBe(false);
  });

  it("lands a grab only on the right spot, once the tech's intangibility has run out", () => {
    const s = script([0]); // tech in place: open on 21-26
    expect(judgeFrame(s, 20, 0, grabAt(13))).toEqual({ outcome: null, whiff: "intangible" }); // grab frame 7 on his frame 20
    expect(judgeFrame(s, 21, 0, grabAt(13)).outcome).toEqual({ kind: "grab", frame: 21, phase: "tech" }); // grab frame 8
    expect(judgeFrame(s, 26, 0, grabAt(19)).outcome).toEqual({ kind: "grab", frame: 26, phase: "tech" });
    expect(judgeFrame(s, 22, 1, grabAt(15))).toEqual({ outcome: null, whiff: "wrongSpot" });
    expect(judgeFrame(s, 27, 0, grabAt(20)).outcome).toEqual({ kind: "escaped" });
  });

  it("can't grab him on the floor after a missed tech, but a hit works", () => {
    const m = script([0.99, 0, 0.99]);
    expect(judgeFrame(m, 10, 0, grabAt(3))).toEqual({ outcome: null, whiff: "downed" });
    expect(judgeFrame(m, 30, 0, grabAt(23))).toEqual({ outcome: null, whiff: "downed" }); // lying
    expect(judgeFrame(m, 10, 0, tiltAt(3)).outcome).toEqual({ kind: "hit", frame: 10, phase: "bounce" });
    expect(judgeFrame(m, 30, 0, tiltAt(23)).outcome).toEqual({ kind: "hit", frame: 4, phase: "lying" });
  });

  it("gets the player hit by a getup attack if they stand on him, and lets them punish it after", () => {
    const m = script([0.99, 0, 0.99]); // the getup attack starts on frame 37
    expect(judgeFrame(m, 36 + 17, 0, null).outcome).toEqual({ kind: "gotHit" });
    expect(judgeFrame(m, 36 + 17, 1, null).outcome).toBeNull(); // stepped away
    expect(judgeFrame(m, 36 + 27, 0, grabAt(36 + 20)).outcome).toEqual({ kind: "grab", frame: 27, phase: "getupAttack" });
  });

  it("names the frames a phase is open on", () => {
    expect(openFrames(script([0]).phases[0])).toEqual([21, 26]);
    expect(openFrames(script([0.3]).phases[0])).toEqual([21, 40]);
    expect(openFrames(script([0.99, 0, 0.3]).phases[2])).toEqual([20, 35]);
    expect(openFrames(script([0.99, 0, 0.6]).phases[2])).toEqual([24, 30]);
    expect(openFrames(script([0.99, 0, 0]).phases[2])).toEqual([30, 35]); // backward: also open on 1-11
    expect(openFrames(script([0.99, 0, 0.99]).phases[0])).toEqual([1, 26]);
  });

  it("counts frames from time, and keeps the player on the three spots", () => {
    expect(framesAt(1000)).toBe(60);
    expect(framesAt(1000, 0.5)).toBe(30);
    expect(framesAt(16)).toBe(0);
    expect(moveSlot(-1, -1)).toBe(-1);
    expect(moveSlot(0, 1)).toBe(1);
  });
});
