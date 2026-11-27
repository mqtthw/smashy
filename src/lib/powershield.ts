// The Arcade's powershield trainer (round 950): reflect a laser by raising the shield at the last moment.
// Counted in Melee's frames (60 a second). What is the game's, with where it was read:
//
// - A projectile is reflected if it reaches the shield in its first 2 frames; after that the shield only
//   blocks it (ssbwiki.com/Perfect_shield). A physical hit has 4 frames; this game is about projectiles.
// - The shield is up from the frame of the press, and it has to be a full (digital) press
//   (melee.cookbook.gg/donkey-kong/basics/how-to-powershield). Round 953 confirmed it for every character in
//   the game's decompiled code (github.com/doldecomp/melee, src/melee/ft/kinds/ftCommon/ftCo_Guard.c): a digital
//   L/R press enters GuardReflect, which makes the shield and the reflect bubble as the state begins; an analog
//   press only enters GuardOn. The reflect timer in Matthew's own copy of the game (PlCo.dat, x2A4) is 1, counted
//   down a frame at a time until it is below 0: two frames. (A physical hit's is 3: four frames.)
// - Dropping the shield takes 15 frames (ssbwiki.com/Perfect_shield, /Powershield_canceling), so it can't be
//   raised again at once: mashing doesn't work.
// - Falco's laser leaves the gun on frame 23 of his Blaster on the ground (ssbwiki.com/Falco_(SSBM)/Neutral_special;
//   the disc agrees: a 7-frame start, then the shot on frame 16 of the loop).
// - The laser flies at 5 units a frame (Falco's Blaster velocity in his data file, PlFc.dat; Fox's is 7).
//
// What is NOT the game's: how far away Falco stands (a random 60 to 150 units each shot, so the laser takes 12
// to 30 frames to arrive) and the wait between shots.
export const REFLECT_FRAMES = 2;
export const DROP_FRAMES = 15;
export const LASER_OUT = 23;
export const PS_LIVES = 3;
export const LASER_SPEED = 5; // units a frame

/** One shot: `start` is the frame Falco begins the move; the laser leaves on start + 23 and arrives `travel` frames later. */
export type Shot = { start: number; travel: number; distance: number };
export const leavesAt = (s: Shot) => s.start + LASER_OUT;
export const arrivesAt = (s: Shot) => s.start + LASER_OUT + s.travel;

/** The next shot after frame `after`. `rand` gives 0..1 numbers. Later shots follow sooner. */
export function newShot(after: number, level: number, rand: () => number): Shot {
  const wait = Math.max(20, 70 - level * 3) + Math.floor(rand() * 50);
  const distance = 60 + Math.floor(rand() * 19) * LASER_SPEED; // 60 to 150 units, in whole frames of flight
  return { start: after + wait, travel: distance / LASER_SPEED, distance };
}

/** The shield: up since a frame (null when down), and the frame it can next be raised on. */
export type Shield = { since: number | null; lockedUntil: number };
export const NO_SHIELD: Shield = { since: null, lockedUntil: 0 };
export const raise = (s: Shield, f: number): Shield => (s.since === null && f >= s.lockedUntil ? { since: f, lockedUntil: s.lockedUntil } : s);
export const drop = (s: Shield, f: number): Shield => (s.since === null ? s : { since: null, lockedUntil: f + DROP_FRAMES });

export type Verdict =
  | { kind: "reflect"; shieldFrame: number } // 1 or 2
  | { kind: "block"; early: number } // shield already up: frames too early for a reflect
  | { kind: "hit" };
/** What happens when the laser arrives on frame `f`. The press frame is the shield's frame 1. */
export function judgeShot(shield: Shield, f: number): Verdict {
  if (shield.since === null || shield.since > f) return { kind: "hit" };
  const shieldFrame = f - shield.since + 1;
  return shieldFrame <= REFLECT_FRAMES ? { kind: "reflect", shieldFrame } : { kind: "block", early: shieldFrame - REFLECT_FRAMES };
}
