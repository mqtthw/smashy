// The Arcade's tech-chase trainer: the rules, counted in Melee's frames (60 a second). Round 946 made the
// first version with timings of its own; round 949 (Matthew: "Prioritize accuracy to the game. For example I
// cant grab a missed tech opponent") rebuilt it on the game's frame data:
//
// - The opponent is Fox. Tech in place: 26 frames, intangible 1-20. Tech roll: 40 frames, intangible 1-20.
//   Getup roll: 35 frames, intangible 1-19 (forward) or 12-29 (backward, from lying on his back). Getup attack:
//   49 frames, intangible 1-26, hitting on 17-19 and 24-26. (fightcore.gg/characters/224/fox)
// - A missed tech bounces for 26 frames, vulnerable throughout (one video's description only: weakly sourced),
//   then lies there. Grabs don't work on an opponent knocked down on the floor (ssbwiki.com/Grab); a hit does.
//
// Round 953 checked this against the game itself. In its decompiled code (github.com/doldecomp/melee, which
// Matthew named as a source; src/melee/ft): the bounce blocks every kind of grab and lying down blocks the
// ordinary one (kinds/ftCommon/ftCo_DownBound.c sets the mask that ftcoll.c's grab check reads), while techs
// and getups don't block grabs at all; and a countdown forces a plain getup when he has lain there too long.
// And in Matthew's own copy of the game (NTSC 1.02): that countdown is 220 frames (PlCo.dat, x424); Fox's
// animations are 26 frames for the bounce and for the tech in place, 40 for a tech roll, and 30 for the plain
// getup, whose script ends its intangibility at frame 23 (PlFx.dat / PlFxAJ.dat). The plain getup's last
// intangible frame is 22 or 23 depending on how the game counts the first frame of that state; 23 is used.
// - The player is Marth by default. Standing grab: active on frames 7-8 of 30. Down tilt (until round 975, now his
//   jab: 4-7, free on 26): active 7-9, free to act
//   on frame 20. (ssbwiki.com/Marth_(SSBM)/Grab, /Down_tilt; read from the disc since round 974, which agrees.)
//   Since round 974 the player can also be Captain Falcon, Sheik, Fox, Falco or Peach (CHASER_MOVES).
//
// Round 954: the opponent can be any of seven characters, each with their own frames read from the game
// (techChase.data.ts, made by tools/melee-disc/build-techchase.mjs), and a missed tech leaves them on their back
// or their front, which have different getups. The plain getup is counted like the other getups: one frame
// less than round 953 had it (Fox: 29 frames, intangible 1-22).
//
// What is NOT the game's: the stage is three spots and moving between them is instant (no dash speeds, ranges
// or roll distances); how long Fox lies there before getting up is a random 10 to 40 frames (in the game it is
// the opponent's choice, up to 220); and a browser can't promise that every frame is shown on time.

import { CHASER_MOVES, TECH_DATA, type Chaser, type TechVictim, type Win } from "./techChase.data";

export type Slot = -1 | 0 | 1;
export const FPS = 60;
export const START_LIVES = 3;
export const FALL_FRAMES = 24; // the fall before he lands (Smashy's choice)

export type Move = "grab" | "tilt";
/** A character's grab and the move they hit with (Marth's: grab 7-8 of 30, jab 4-7 of 25, read from the game). */
export const movesOf = (who: Chaser = "marth"): Record<Move, { active: readonly [number, number]; total: number }> => CHASER_MOVES[who];
export const MOVES = movesOf("marth");

export type PhaseName = "tech" | "techRoll" | "bounce" | "lying" | "getupRoll" | "getupAttack" | "getupStand";
export type Phase = {
  name: PhaseName;
  frames: number;
  intangible: readonly [number, number] | null;
  downed: boolean; // on the floor: hits connect, grabs don't
  hits?: readonly (readonly [number, number])[]; // frames his own attack hits on
  to?: Slot; // where a roll ends
  arrives?: number; // the frame from which he counts as being there
  path?: readonly number[]; // a roll: how far along it he is on each frame, 0 to 1 (from the game's animation)
};

export type TechOption = "inPlace" | "left" | "right" | "missed";
export type Getup = "rollLeft" | "rollRight" | "stand" | "attack";
export const TECH_OPTIONS: TechOption[] = ["inPlace", "left", "right", "missed"];
export const GETUPS: Getup[] = ["rollLeft", "rollRight", "stand", "attack"];

const phase = (name: PhaseName, w: Win, extra: Partial<Phase> = {}): Phase => ({ name, frames: w.frames, intangible: w.intangible, downed: false, ...(w.hits ? { hits: w.hits } : {}), ...extra });
/**
 * A roll to `to`, travelling along `path` (round 973: read from the game's animation). He counts as being at the
 * new spot from the frame he is halfway there (it used to be frame 12 for every roll).
 */
const roll = (name: PhaseName, w: Win, to: Slot, path: readonly number[] | undefined): Phase => {
  const half = path ? path.findIndex((v) => Math.abs(v) >= 0.5) + 1 : 12;
  return phase(name, w, { to, arrives: half > 0 ? half : 12, ...(path ? { path } : {}) });
};

/**
 * One knockdown, start to finish: what the opponent does on landing (frame 1 is the frame they land), and after.
 * `face`: after a missed tech they lie on their back ("up") or front ("down"), which changes their getups' frames.
 */
export type Script = { victim: TechVictim; option: TechOption; getup: Getup | null; face: "up" | "down" | null; phases: Phase[] };

const pick = <T>(list: readonly T[], rand: () => number): T => list[Math.min(list.length - 1, Math.floor(rand() * list.length))];

/**
 * `rand` gives 0..1 numbers (Math.random in the browser, a fixed list in tests). The opponent faces right: rolling
 * right is their forward getup roll, left their backward one. Every frame count is that character's own
 * (techChase.data.ts, read from the game).
 */
export function newScript(rand: () => number, victim: TechVictim = "fox"): Script {
  const d = TECH_DATA[victim];
  const option = pick(TECH_OPTIONS, rand);
  if (option === "inPlace") return { victim, option, getup: null, face: null, phases: [phase("tech", d.tech)] };
  // Facing right: a roll to the right is the forward one.
  if (option === "left" || option === "right") return { victim, option, getup: null, face: null, phases: [roll("techRoll", d.techRoll, option === "left" ? -1 : 1, option === "left" ? d.techRoll.pathBack : d.techRoll.path)] };
  const wait = 10 + Math.floor(rand() * 31);
  const getup = pick(GETUPS, rand);
  const face = rand() < 0.5 ? "up" : "down";
  const g = d[face];
  const up =
    getup === "attack" ? phase("getupAttack", g.attack) : getup === "stand" ? phase("getupStand", g.stand) : getup === "rollRight" ? roll("getupRoll", g.forward, 1, g.forward.path) : roll("getupRoll", g.back, -1, g.back.path);
  return {
    victim,
    option,
    getup,
    face,
    phases: [{ name: "bounce", frames: d.bounce[face], intangible: null, downed: true }, { name: "lying", frames: wait, intangible: null, downed: true }, up],
  };
}

export const scriptFrames = (s: Script) => s.phases.reduce((n, p) => n + p.frames, 0);
const within = (f: number, range: readonly [number, number] | null | undefined) => !!range && f >= range[0] && f <= range[1];

/** The opponent on frame `f` since landing (1 = the landing frame). After the script they are free: they got away. */
export function foxAt(s: Script, f: number) {
  let start = 0;
  let spot: Slot = 0;
  for (const p of s.phases) {
    const pf = f - start; // the frame within this phase
    if (pf <= p.frames) {
      const from = spot;
      const here: Slot = p.to !== undefined && pf >= (p.arrives ?? 1) ? p.to : spot;
      return { phase: p, frame: pf, spot: here, from, vulnerable: !within(pf, p.intangible), downed: p.downed, hitting: (p.hits ?? []).some((h) => within(pf, h)), free: false, progress: pf / p.frames };
    }
    start += p.frames;
    if (p.to !== undefined) spot = p.to;
  }
  return { phase: null, frame: f - start, spot, from: spot, vulnerable: true, downed: false, hitting: false, free: true, progress: 1 };
}

/** What the player is doing: a move started on frame `since` (in Fox's frames), or nothing. */
export type Action = { move: Move; since: number; by?: Chaser } | null;
/** The frame of the player's own move on Fox's frame `f` (1 = the frame after the press). */
export const moveFrame = (a: Action, f: number) => (a ? f - a.since : 0);
export const busy = (a: Action, f: number) => !!a && moveFrame(a, f) <= movesOf(a.by)[a.move].total;
export const striking = (a: Action, f: number) => !!a && within(moveFrame(a, f), movesOf(a.by)[a.move].active);

export type Outcome =
  | { kind: "grab" | "hit"; frame: number; phase: PhaseName } // the punish landed
  | { kind: "gotHit" } // his getup attack caught the player
  | { kind: "escaped" }
  | null;
/** Why a move that is out right now isn't connecting (for the hint under the stage). */
export type Whiff = "intangible" | "downed" | "wrongSpot" | null;

/** One frame of the round: does the player's move connect, does Fox's attack, or has he got away? */
export function judgeFrame(s: Script, f: number, playerSpot: Slot, action: Action): { outcome: Outcome; whiff: Whiff } {
  const fox = foxAt(s, f);
  if (fox.free) return { outcome: { kind: "escaped" }, whiff: null };
  let whiff: Whiff = null;
  if (striking(action, f)) {
    if (playerSpot !== fox.spot) whiff = "wrongSpot";
    else if (!fox.vulnerable) whiff = "intangible";
    else if (action!.move === "grab" && fox.downed) whiff = "downed";
    else return { outcome: { kind: action!.move === "grab" ? "grab" : "hit", frame: fox.frame, phase: fox.phase!.name }, whiff: null };
  }
  if (fox.hitting && playerSpot === fox.spot) return { outcome: { kind: "gotHit" }, whiff };
  return { outcome: null, whiff };
}

/** A grab keeps the chase going, so it's worth more than a hit. */
export const POINTS = { grab: 2, hit: 1 } as const;

/** The frames a phase can be punished on, for the line shown after a round ("vulnerable 21-26"). */
export function openFrames(p: Phase): [number, number] {
  if (!p.intangible) return [1, p.frames];
  return p.intangible[0] > 1 && p.intangible[1] >= p.frames ? [1, p.intangible[0] - 1] : [p.intangible[1] + 1, p.frames];
}

export const moveSlot = (slot: Slot, by: -1 | 1): Slot => Math.max(-1, Math.min(1, slot + by)) as Slot;
export const framesAt = (elapsedMs: number, speed = 1) => Math.floor((elapsedMs * FPS * speed) / 1000);
