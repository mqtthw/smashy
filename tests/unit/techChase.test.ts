import { describe, expect, it } from "vitest";
import { CHASER_MOVES, CHASERS, TECH_DATA, TECH_VICTIMS } from "@/lib/techChase.data";
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
    expect(script([0.99, 0, 0.6]).phases[2]).toMatchObject({ name: "getupStand", frames: 29, intangible: [1, 22] }); // the plain getup
  });

  it("uses each character's own getups, on their back or their front", () => {
    // Fox on his front (the fourth number 0.9): his backward getup roll is intangible on 1-24 there, 12-29 on his back.
    expect(newScript(fixed([0.99, 0, 0, 0.9]), "fox")).toMatchObject({ face: "down", phases: [{}, {}, { name: "getupRoll", intangible: [1, 24] }] });
    expect(newScript(fixed([0.99, 0, 0, 0.1]), "fox")).toMatchObject({ face: "up", phases: [{}, {}, { name: "getupRoll", intangible: [12, 29] }] });
    // Marth's getup attack from his back: 49 frames, intangible to 31, hitting on 20-23 and 30-31.
    expect(newScript(fixed([0.99, 0, 0.99, 0.1]), "marth").phases[2]).toMatchObject({ name: "getupAttack", frames: 49, intangible: [1, 31], hits: [[20, 23], [30, 31]] });
    // Sheik's plain getup is open three frames sooner than Fox's.
    expect(newScript(fixed([0.99, 0, 0.6, 0.1]), "sheik").phases[2]).toMatchObject({ name: "getupStand", frames: 29, intangible: [1, 19] });
    // Everyone techs alike.
    for (const v of TECH_VICTIMS) expect(newScript(fixed([0]), v).phases[0]).toMatchObject({ frames: 26, intangible: [1, 20] });
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
    expect(openFrames(script([0.99, 0, 0.6]).phases[2])).toEqual([23, 29]);
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

  it("moves rolls along the game's own animation, counting them there from halfway (round 973)", () => {
    for (const v of TECH_VICTIMS) {
      const d = TECH_DATA[v];
      for (const w of [d.techRoll, d.up.forward, d.up.back, d.down.forward, d.down.back]) {
        expect(w.path).toHaveLength(w.frames);
        expect(w.path!.at(-1)).toBe(1);
      }
      expect(d.techRoll.pathBack).toHaveLength(d.techRoll.frames);
    }
    // Fox's forward tech roll (read from the disc): moving by frame 6, halfway on frame 18, there by frame 29.
    const roll = TECH_DATA.fox.techRoll.path!;
    expect(roll.findIndex((x) => x >= 0.5) + 1).toBe(18);
    expect(roll.indexOf(1) + 1).toBe(29);
    // A script's roll counts as arriving the frame it is halfway.
    let s: Script | null = null;
    for (let i = 0; i < 50 && s?.option !== "right"; i++) s = newScript(Math.random, "fox");
    const phase = s!.phases[0];
    expect(phase.path).toBe(roll);
    expect(phase.arrives).toBe(18);
    expect(foxAt(s!, 17).spot).toBe(0);
    expect(foxAt(s!, 18).spot).toBe(1);
  });

  it("plays as six characters, each with their own grab and hit read from the game (round 974)", () => {
    expect([...CHASERS]).toEqual(["marth", "captain-falcon", "sheik", "fox", "falco", "peach"]);
    // Marth's are the ones the trainer always had (SmashWiki agrees).
    expect(CHASER_MOVES.marth).toMatchObject({ grab: { active: [7, 8], total: 30 }, tilt: { active: [7, 9], total: 19 }, move: "dtilt" });
    expect(CHASER_MOVES["captain-falcon"]).toMatchObject({ tilt: { active: [3, 5] }, move: "jab" });
    expect(CHASER_MOVES.fox).toMatchObject({ tilt: { active: [7, 17], total: 41 }, move: "usmash" });
    expect(CHASER_MOVES.falco).toMatchObject({ tilt: { active: [1, 1], total: 3 }, move: "shine" });
    // A move knows who made it: Fox's up smash is out on frame 17, Marth's down tilt isn't.
    expect(striking({ move: "tilt", since: 0, by: "fox" }, 17)).toBe(true);
    expect(striking({ move: "tilt", since: 0 }, 17)).toBe(false);
    expect([3, 4].map((f) => busy({ move: "tilt", since: 0, by: "falco" }, f))).toEqual([true, false]);
  });
});
