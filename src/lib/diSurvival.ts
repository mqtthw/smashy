// The Arcade's DI trainer (round 950): Melee's knockback, flown frame by frame, with and without directional
// influence. Everything here is the game's own maths as published, with where each piece was read:
//
// - Knockback = ((((p/10 + p*d/20) * 200/(w+100) * 1.4) + 18) * growth/100) + base, where p is the percent
//   after the hit and d the move's damage (ssbwiki.com/Knockback; IKneeData's calculator codes it the same).
// - Launch speed is knockback * 0.03 a frame along the launch angle, losing 0.051 a frame; the character's own
//   fall is added on top: it gains their gravity every frame up to their falling speed
//   (ssbwiki.com/Knockback; ikneedata.com/calculatormaths.js, which takes the decay off before moving).
// - DI turns the launch angle by up to 18 degrees: offset = perp^2 * 18, where perp is how much of the stick
//   points across the launch direction; it turns towards the stick (ssbwiki.com/Directional_influence;
//   ikneedata.com/calculatormaths.js).
// - KO: past the side or bottom blast line; past the top one only while still flying up at 2.4 or more a frame
//   (ikneedata.com/calculatormaths.js; ssbwiki.com/Blast_line says "sufficient vertical launch speed").
// - Final Destination: blast lines at top 188, bottom -140, sides +-246; the stage ends at +-85.5657 (IKneeData).
// - The Sakurai angle (361) launches a grounded target at 44 degrees at this strength (IKneeData; SmashWiki says
//   45 in the air).
// - Weights, gravity and falling speeds: IKneeData (src/lib/characterStats.melee.ts). Moves: fightcore.gg and
//   SmashWiki's move pages (NTSC).
//
// What is NOT the game's: a keyboard has eight directions at full tilt (a diagonal counts as longer than a
// cardinal, as the formula has it); the freeze before the launch is a fixed time to read and choose, not the
// move's hitlag; there is no smash DI, no crouch cancel, no staleness, and nothing after the launch (no jump,
// no drift, no recovery): this only answers "would this hit have killed?".
import { MELEE_STATS } from "./characterStats.melee";

export const STAGE = { top: 188, bottom: -140, side: 246, edge: 85.5657 };
export const SAKURAI_GROUNDED = 44;
export const MAX_DI = 18;
export const TOP_KO_SPEED = 2.4;

export type DiMove = { key: string; by: string; name: string; damage: number; angle: number; base: number; growth: number };
/** Hits people die to. `angle` 361 is the Sakurai angle. */
export const DI_MOVES: DiMove[] = [
  { key: "fox-usmash", by: "Fox", name: "up smash", damage: 18, angle: 80, base: 30, growth: 112 },
  { key: "fox-uair", by: "Fox", name: "up air", damage: 13, angle: 85, base: 40, growth: 116 },
  { key: "marth-fsmash", by: "Marth", name: "forward smash (tipper)", damage: 20, angle: 361, base: 80, growth: 70 },
  { key: "falco-fsmash", by: "Falco", name: "forward smash", damage: 17, angle: 361, base: 40, growth: 90 },
  { key: "falcon-knee", by: "Captain Falcon", name: "knee", damage: 18, angle: 32, base: 24, growth: 100 },
  { key: "puff-rest", by: "Jigglypuff", name: "Rest", damage: 28, angle: 361, base: 78, growth: 120 },
  { key: "sheik-fair", by: "Sheik", name: "forward air", damage: 13, angle: 25, base: 0, growth: 100 },
  { key: "ganon-fair", by: "Ganondorf", name: "forward air", damage: 17, angle: 361, base: 60, growth: 80 },
  { key: "samus-charge", by: "Samus", name: "Charge Shot (full)", damage: 25, angle: 361, base: 50, growth: 72 },
];

export const DI_VICTIMS = ["fox", "falco", "marth", "sheik", "captain-falcon", "peach", "jigglypuff"] as const;
export type Victim = (typeof DI_VICTIMS)[number];

/** Melee's knockback for a fresh hit. `percentBefore` is the victim's percent before the hit lands. */
export function knockback(move: Pick<DiMove, "damage" | "base" | "growth">, percentBefore: number, weight: number): number {
  const p = Math.floor(percentBefore) + move.damage;
  return ((p / 10 + (p * move.damage) / 20) * (200 / (weight + 100)) * 1.4 + 18) * (move.growth / 100) + move.base;
}

export const hitstun = (kb: number) => Math.floor(kb * 0.4);

/** A stick position: x and y each -1, 0 or 1 (a keyboard). */
export type Stick = { x: number; y: number };
export const NO_STICK: Stick = { x: 0, y: 0 };
const rad = (deg: number) => (deg * Math.PI) / 180;

/** The launch angle after DI, in degrees. `angle` is the real launch angle (already mirrored for the side hit from). */
export function diAngle(angle: number, stick: Stick): number {
  if (!stick.x && !stick.y) return angle;
  const stickAngle = Math.atan2(stick.y, stick.x);
  const perp = Math.sin(rad(angle) - stickAngle) * Math.hypot(stick.x, stick.y);
  const offset = Math.min(MAX_DI, perp * perp * MAX_DI);
  return angle - Math.sign(perp) * offset; // towards the stick
}

/** The angle a move launches a grounded target at, for a hit coming from the left (`facing` 1) or right (-1). */
export function launchAngle(move: Pick<DiMove, "angle">, facing: 1 | -1): number {
  const a = move.angle === 361 ? SAKURAI_GROUNDED : move.angle;
  return facing === 1 ? a : 180 - a;
}

export type Flight = { points: [number, number][]; ko: "top" | "side" | "bottom" | null; frames: number; landed: boolean };

/** Flies a launch from (x, 0) until it is KO'd, lands back on the stage, or the knockback has run out. */
export function fly(kb: number, angleDeg: number, victim: Victim, x0: number): Flight {
  const { gravity, fallSpeed } = MELEE_STATS[victim];
  const cos = Math.cos(rad(angleDeg));
  const sin = Math.sin(rad(angleDeg));
  let speed = kb * 0.03;
  let own = 0; // the character's own vertical speed
  let x = x0;
  let y = 0;
  const points: [number, number][] = [[x, y]];
  for (let f = 1; f <= 600; f++) {
    speed = Math.max(0, speed - 0.051);
    own = Math.max(-(fallSpeed ?? 2), own - (gravity ?? 0.1));
    const vy = speed * sin;
    x += speed * cos;
    y += vy + own;
    points.push([x, y]);
    if (Math.abs(x) > STAGE.side) return { points, ko: "side", frames: f, landed: false };
    if (y < STAGE.bottom) return { points, ko: "bottom", frames: f, landed: false };
    if (y > STAGE.top && vy >= TOP_KO_SPEED) return { points, ko: "top", frames: f, landed: false };
    if (y <= 0 && Math.abs(x) <= STAGE.edge && f > 1) return { points, ko: null, frames: f, landed: true };
    if (speed === 0) return { points, ko: null, frames: f, landed: false };
  }
  return { points, ko: null, frames: 600, landed: false };
}

export const STICKS: Stick[] = [NO_STICK, { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: -1 }];

/** How far from death a flight ended: the smallest gap to the blast line it came closest to (0 when KO'd). */
export function margin(flight: Flight): number {
  if (flight.ko) return 0;
  return Math.min(...flight.points.map(([x, y]) => Math.min(STAGE.side - Math.abs(x), y - STAGE.bottom, STAGE.top - y > 0 ? STAGE.top - y : 0.01)));
}

/** One hit, worked out: the knockback, the flight with no DI, with the player's DI, and the best the keyboard allows. */
export function resolveHit(move: DiMove, percentBefore: number, victim: Victim, x0: number, facing: 1 | -1, stick: Stick) {
  const kb = knockback(move, percentBefore, MELEE_STATS[victim].weight ?? 100);
  const angle = launchAngle(move, facing);
  const at = (s: Stick) => fly(kb, diAngle(angle, s), victim, x0);
  const mine = at(stick);
  let best = { stick: NO_STICK, flight: at(NO_STICK) };
  for (const s of STICKS) {
    const flight = at(s);
    if (margin(flight) > margin(best.flight)) best = { stick: s, flight };
  }
  return { kb, angle, turned: diAngle(angle, stick) - angle, none: at(NO_STICK), mine, best, hitstun: hitstun(kb) };
}

export type DiRound = { move: DiMove; x0: number; facing: 1 | -1 };
/** `rand` gives 0..1 numbers. The hit comes from the side the victim is further from, so it sends them the long way... or not. */
export function newDiRound(rand: () => number): DiRound {
  const move = DI_MOVES[Math.min(DI_MOVES.length - 1, Math.floor(rand() * DI_MOVES.length))];
  const x0 = [-60, -30, 0, 30, 60][Math.min(4, Math.floor(rand() * 5))];
  return { move, x0, facing: rand() < 0.5 ? 1 : -1 };
}

/**
 * The percents where DI decides a hit: from the lowest percent it kills with no DI (`kill`) to the highest the
 * best keyboard DI still survives (`max`). Null when DI can't save anyone from it there (or it never kills).
 */
export function diBand(round: DiRound, victim: Victim): { kill: number; max: number } | null {
  let kill = -1;
  for (let pct = 0; pct <= 300; pct++) {
    const r = resolveHit(round.move, pct, victim, round.x0, round.facing, NO_STICK);
    if (kill < 0 && r.none.ko) kill = pct;
    if (kill >= 0 && r.best.flight.ko) return pct - 1 >= kill ? { kill, max: pct - 1 } : null;
  }
  return null;
}

export type DiHit = DiRound & { percent: number };
/**
 * The next hit of a run: a move, a spot and a side, at a percent inside its DI band, so that the right DI lives
 * and no DI dies. Early hits sit low in the band (more directions survive); later ones climb towards its top.
 */
export function dealHit(rand: () => number, victim: Victim, level: number): DiHit {
  for (let tries = 0; tries < 30; tries++) {
    const round = newDiRound(rand);
    const band = diBand(round, victim);
    if (!band) continue;
    const reach = Math.min(1, 0.35 + level * 0.07);
    return { ...round, percent: band.kill + Math.floor(rand() * (band.max - band.kill + 1) * reach) };
  }
  return { move: DI_MOVES[0], x0: 0, facing: 1, percent: 100 };
}
