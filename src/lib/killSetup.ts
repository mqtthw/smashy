// Where Does it kill?'s two fighters stand so that the hit shown is the hit the question is about (round 1005,
// Matthew: "make the scenarios more realistic-looking to simulate situations that would happen in the game, and
// that the correct hitbox matches up to the hurtbox, for example marth tippers").
//
// The game's rule for which hit lands: the move's hitboxes are checked every frame, each one swept from where it was
// the frame before to where it is now (a capsule: a hitbox that has just come out is a ball), against the victim's
// hurtboxes (capsules). The first frame any of them touches is the hit, and of the hitboxes touching on that frame,
// the lowest-numbered one is the one that counts. So a spacing only shows the question's hit if, there, the kill
// hitbox (Marth's tipper, Falcon's knee sweetspot) wins on the first frame anything touches.
//
// Of the spacings that do, the one shown is the most spaced (the attacker as far back as the hit allows, the way a
// tipper is spaced), and an aerial is done as low as it can be (a short hop), never with the attacker's body below the
// floor. The attacker starts on the victim's left (feet at least a unit to the left of theirs). The victim stands in
// the middle of the stage (x 0, facing left, toward the attacker) on their standing
// hurtboxes (diVisuals.data.ts); it's sent to the right, away from the attacker, so a hit from behind (a back air) is
// done facing away (facing -1). Where nothing works with the victim standing (up airs that only reach above a
// standing body), the victim is in the air above the attacker, at the lowest height that works.
import { HURTBOXES, type Hurtbox } from "./diVisuals.data";
import type { KillLook } from "./killVisuals.data";

export type KillSetup = {
  /** Where the attacker's feet are and which way they face (1: right, toward the victim). */
  ax: number;
  ay: number;
  face: 1 | -1;
  /** The frame the kill hit connects on. */
  frame: number;
  /** How high the victim's feet are (0: standing). */
  vy: number;
};

type Seg = [x1: number, y1: number, x2: number, y2: number];
/** The shortest distance between two segments. */
export function segDistance([ax, ay, bx, by]: Seg, [cx, cy, dx, dy]: Seg): number {
  const pt = (px: number, py: number, [x1, y1, x2, y2]: Seg) => {
    const vx = x2 - x1;
    const vy = y2 - y1;
    const len = vx * vx + vy * vy;
    const t = len ? Math.max(0, Math.min(1, ((px - x1) * vx + (py - y1) * vy) / len)) : 0;
    return Math.hypot(px - (x1 + t * vx), py - (y1 + t * vy));
  };
  const cross = (ox: number, oy: number, px: number, py: number, qx: number, qy: number) => (px - ox) * (qy - oy) - (py - oy) * (qx - ox);
  const d1 = cross(cx, cy, dx, dy, ax, ay);
  const d2 = cross(cx, cy, dx, dy, bx, by);
  const d3 = cross(ax, ay, bx, by, cx, cy);
  const d4 = cross(ax, ay, bx, by, dx, dy);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return 0;
  return Math.min(pt(ax, ay, [cx, cy, dx, dy]), pt(bx, by, [cx, cy, dx, dy]), pt(cx, cy, [ax, ay, bx, by]), pt(dx, dy, [ax, ay, bx, by]));
}

/** The victim's hurtboxes standing at x 0 facing left, `vy` up. */
const hurtboxes = (victim: string, vy: number): Hurtbox[] => (HURTBOXES[victim] ?? []).map(([x1, y1, x2, y2, r, h]) => [-x1, y1 + vy, -x2, y2 + vy, r, h]);

/**
 * With the attacker at (ax, ay) facing `face`: the frame the move first touches the victim and whether the hitbox
 * that counts there is the kill hit. Null when it never touches.
 */
export function firstContact(look: KillLook, hurt: Hurtbox[], ax: number, ay: number, face: 1 | -1): { frame: number; kill: boolean } | null {
  // Only the kill hit's own window counts: a multi-hit move's earlier hits land too, by design, and the kill is
  // the hit of its window that connects first (a victim can be hit once a window).
  // A late hit (a neutral air's weaker-then-stronger halves share their window) is judged from the frame it comes out,
  // as when the attacker drifts in with the move already out.
  const start = look.all.find(([, , boxes]) => boxes.some((b) => b[4] === 1));
  const win = start?.[3];
  let prev = new Map<number, [number, number]>();
  let prevFrame = -1;
  for (const [frame, , boxes, w] of look.all) {
    if (w !== win || frame < start![0]) continue;
    const now = new Map<number, [number, number]>();
    let winner: { id: number; kill: boolean } | null = null;
    for (const [id, bx, by, r, kill] of boxes) {
      const x = ax + face * bx;
      const y = ay + by;
      now.set(id, [x, y]);
      // Swept from last frame's place if it was out then.
      const from = prevFrame === frame - 1 ? prev.get(id) : undefined;
      const seg: Seg = from ? [from[0], from[1], x, y] : [x, y, x, y];
      if (hurt.some((h) => segDistance(seg, [h[0], h[1], h[2], h[3]]) <= r + h[4]) && (!winner || id < winner.id)) winner = { id, kill: kill === 1 };
    }
    if (winner) return { frame, kill: winner.kill };
    prev = now;
    prevFrame = frame;
  }
  return null;
}

/** The lowest point of the attacker's body on a frame (from the feet), for keeping an aerial above the floor. */
const lowAt = (look: KillLook, frame: number) => look.all.find(([f]) => f === frame)?.[1] ?? 0;

/** The setup for a move on a victim (see the header). Null when no spacing shows the kill hit. */
export function killSetup(look: KillLook, victim: string): KillSetup | null {
  const STEP = 0.5;
  // How far the move's hitboxes reach (from the attacker's feet, facing right), to skip what can't touch.
  const reach = look.all.flatMap(([, , boxes]) => boxes.map(([, x, y, r]) => [x - r, x + r, y - r, y + r]));
  const [rx1, rx2, ry1, ry2] = [Math.min(...reach.map((b) => b[0])), Math.max(...reach.map((b) => b[1])), Math.min(...reach.map((b) => b[2])), Math.max(...reach.map((b) => b[3]))];
  const tryAt = (vy: number, ays: number[], face: 1 | -1): KillSetup | null => {
    const hurt = hurtboxes(victim, vy);
    const hx1 = Math.min(...hurt.map((h) => Math.min(h[0], h[2]) - h[4]));
    const hx2 = Math.max(...hurt.map((h) => Math.max(h[0], h[2]) + h[4]));
    const hy1 = Math.min(...hurt.map((h) => Math.min(h[1], h[3]) - h[4]));
    const hy2 = Math.max(...hurt.map((h) => Math.max(h[1], h[3]) + h[4]));
    // The attacker's places from which anything can reach across.
    const [lo, hi] = face === 1 ? [hx1 - rx2, hx2 - rx1] : [hx1 + rx1, hx2 + rx2];
    for (const ay of ays) {
      if (ay + ry2 < hy1 || ay + ry1 > hy2) continue; // nothing reaches that high or low
      // From far back to close: the first spacing where the kill hit lands is the most spaced.
      for (let ax = Math.max(-70, Math.floor(lo / STEP) * STEP); ax <= Math.min(-1, hi); ax += STEP) {
        const c = firstContact(look, hurt, ax, ay, face);
        if (c?.kill && (!look.aerial || ay + lowAt(look, c.frame) >= -0.5)) return { ax, ay, face, frame: c.frame, vy };
      }
    }
    return null;
  };
  const heights = (from: number, to: number, step = 1) => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);
  // Facing the victim first (standing, then in the air); turned away only when that can't land the kill hit (a back
  // air, whose kill hit is behind).
  for (const face of [1, -1] as const) {
    // Standing: on the ground, or (an aerial) from the floor up.
    const standing = tryAt(0, look.aerial ? heights(0, 30) : [0], face);
    if (standing) return standing;
    // In the air above the attacker: the lowest height that works (every 3 units), the attacker on the ground or (an
    // aerial) jumping to somewhere from 30 units under the victim's feet to level with them.
    for (const vy of heights(3, 48, 3)) {
      const s = tryAt(vy, look.aerial ? heights(Math.max(0, vy - 30), vy, 2) : [0], face);
      if (s) return s;
    }
  }
  return null;
}
