// What the DI trainer shows of a hit (round 977, Matthew: "we want accurate visuals for the DI survival game because
// the visual cues of seeing the move that you are DIing is essential"): the attacker doing the real move (their
// outline, lib/outlines.ts) placed so the move's hitbox, on the frame it comes out, is on the victim; the victim's
// hit pose as the game picks it; and for Samus's Charge Shot, the ball flying in. The numbers are the game's
// (diVisuals.data.ts, made by tools/melee-disc/build-di.mjs); where the attacker stands is Smashy's choice (the
// attacker stands as far back as they can with the hitbox still touching a hurtbox, as a spaced hit lands; an
// aerial is done at the height of the middle of the victim's body, with all of the attacker above the floor).
import { HIT_POSE_RULES, HURTBOXES, MOVE_LOOKS, type Hurtbox } from "./diVisuals.data";

/** A hit as shown: who attacks with which of the game's states, where they stand, and the frames it takes. */
export type HitScene = {
  attacker: string;
  state: string;
  /** The move's length in frames, and the frame it hits on. */
  frames: number;
  hit: number;
  /** Where the attacker stands (game units; y up from the floor) and which way they face (1: right). */
  ax: number;
  ay: number;
  facing: 1 | -1;
  /** The frames before the hit lands: the move's startup, or for the Charge Shot also the ball's flight. */
  windup: number;
  /** The victim's hit pose (the game's state name), and which of their hurtboxes was hit (0 low, 1 middle, 2 high). */
  pose: string;
  height: 0 | 1 | 2;
  /** The Charge Shot: where the ball starts, how fast it goes (units a frame, signed) and its radius. */
  shot: { x: number; y: number; vx: number; radius: number } | null;
};

/** The victim's hurtboxes where they stand at `x0`, facing `vf` (1: right). */
export function hurtboxesAt(victim: string, x0: number, vf: 1 | -1): Hurtbox[] {
  return (HURTBOXES[victim] ?? []).map(([x1, y1, x2, y2, r, h]) => [x0 + vf * x1, y1, x0 + vf * x2, y2, r, h]);
}

/** How far a point is from a capsule's middle line. */
export function toSegment(px: number, py: number, [x1, y1, x2, y2]: Hurtbox): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len)) : 0;
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/** The first hurtbox (in the game's order) a sphere at (x, y) with radius `r` touches, else the nearest. */
export function hurtboxHit(boxes: Hurtbox[], x: number, y: number, r: number): Hurtbox | null {
  let nearest: Hurtbox | null = null;
  let gap = Infinity;
  for (const b of boxes) {
    const d = toSegment(x, y, b) - b[4] - r;
    if (d <= 0) return b;
    if (d < gap) {
      gap = d;
      nearest = b;
    }
  }
  return nearest;
}

/**
 * The hit pose the game plays for a hard hit (ftCo_Damage.c): by the hurtbox hit, "DamageFlyLw" / "N" / "Hi"; but
 * launched between 70 and 110 degrees, "DamageFlyTop"; else from 100%, three times in ten, "DamageFlyRoll".
 */
export function hitPose(height: 0 | 1 | 2, launchDeg: number, percent: number, rand: () => number): string {
  const a = ((launchDeg % 360) + 360) % 360;
  if (a > HIT_POSE_RULES.topFrom && a < HIT_POSE_RULES.topTo) return "DamageFlyTop";
  if (percent >= HIT_POSE_RULES.rollFrom && rand() < HIT_POSE_RULES.rollChance) return "DamageFlyRoll";
  return height === 2 ? "DamageFlyHi" : height === 1 ? "DamageFlyN" : "DamageFlyLw";
}

/** How many frames the Charge Shot is shown flying before it hits (Smashy's choice: where Samus stands). */
export const SHOT_FLIGHT = 16;

/**
 * The scene for a move hitting `victim` standing at `x0`, sent the way `facing` says (1: to the right, so the
 * attacker is on the left facing right); `launchDeg` is the launch angle before DI and `percent` the victim's percent.
 */
export function hitScene(moveKey: string, victim: string, x0: number, facing: 1 | -1, launchDeg: number, percent: number, rand: () => number): HitScene | null {
  const m = MOVE_LOOKS[moveKey];
  if (!m) return null;
  const boxes = hurtboxesAt(victim, x0, (-facing) as 1 | -1);
  if (!boxes.length) return null;
  // The middle of the victim's body: the average of their hurtboxes' middles.
  const tx = boxes.reduce((s, b) => s + (b[0] + b[2]) / 2, 0) / boxes.length;
  const ty = boxes.reduce((s, b) => s + (b[1] + b[3]) / 2, 0) / boxes.length;
  if (m.shot) {
    // Samus stands so the ball flies SHOT_FLIGHT frames to the victim's middle, at the height it comes out at.
    const y = m.shot.from[1];
    const vx = facing * m.shot.speed;
    const ax = tx - facing * (m.shot.from[0] + m.shot.speed * SHOT_FLIGHT);
    const x = ax + facing * m.shot.from[0];
    // The frame it first touches a hurtbox.
    let travel = 0;
    let touched: Hurtbox | null = null;
    for (let k = 0; k <= SHOT_FLIGHT + 10 && !touched; k++) {
      const b = hurtboxHit(boxes, x + vx * k, y, m.shot.radius);
      if (b && toSegment(x + vx * k, y, b) <= b[4] + m.shot.radius) {
        touched = b;
        travel = k;
      }
    }
    const hit = touched ?? hurtboxHit(boxes, tx, y, m.shot.radius)!;
    return { attacker: m.who, state: m.state, frames: m.frames, hit: m.hit, ax, ay: 0, facing, windup: m.hit + travel, pose: hitPose(hit[5], launchDeg, percent, rand), height: hit[5], shot: { x, y, vx, radius: m.shot.radius } };
  }
  // The first frame the hitbox can reach the victim's middle (a sword coming down can be over a small character's
  // head on its first frame): the attacker stands so that frame's box is over the middle, low enough to touch.
  const touches = (x: number, y: number, r: number) => {
    const b = hurtboxHit(boxes, x, y, r)!;
    return toSegment(x, y, b) <= b[4] + r ? b : null;
  };
  for (const [frame, bx, by, br, low] of m.boxes) {
    let ax = tx - facing * bx;
    const ay = m.aerial ? Math.max(-low, ty - by, 0) : 0;
    const last = frame === m.boxes[m.boxes.length - 1][0];
    if (!touches(ax + facing * bx, ay + by, br) && !last) continue;
    // Back off a quarter unit at a time while the hitbox still touches.
    for (let k = 0; k < 160 && touches(ax - facing * 0.25 + facing * bx, ay + by, br); k++) ax -= facing * 0.25;
    const hit = hurtboxHit(boxes, ax + facing * bx, ay + by, br)!;
    return { attacker: m.who, state: m.state, frames: m.frames, hit: frame, ax, ay, facing, windup: frame - 1, pose: hitPose(hit[5], launchDeg, percent, rand), height: hit[5], shot: null };
  }
  return null;
}
