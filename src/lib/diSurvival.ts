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
// - Six stages' blast lines and where each main platform ends (IKneeData): Final Destination's are top 188,
//   bottom -140, sides +-246, edges +-85.5657. Side platforms aren't part of this: nobody lands on one.
// - The Sakurai angle (361) launches a grounded target at 44 degrees at this strength (IKneeData; SmashWiki says
//   45 in the air).
// - Weights, gravity and falling speeds: IKneeData (src/lib/characterStats.melee.ts). Moves: fightcore.gg and
//   SmashWiki's move pages (NTSC).
//
// Round 953 checked all of this against the game itself. The rules, in its decompiled code
// (github.com/doldecomp/melee, which Matthew named as a source; paths under src/): DI is "angle += max angle *
// perp^2", read on the frame hitlag ends, with no deadzone of its own (melee/ft/kinds/ftCommon/ftCo_Damage.c);
// the decay comes off along the knockback direction each airborne frame and gravity only acts on the
// character's own speed (melee/ft/fighter.c, ftcommon.c); the top blast line only kills while knockback is
// still carrying the character up faster than a threshold (melee/ft/ft_0D31.c); the stick is clamped to a
// circle of radius 80 and divided by 80 (sysdolphin/baselib/controller.c), so a full diagonal is (0.7, 0.7).
// The numbers, read from Matthew's own copy of the game (NTSC 1.02, PlCo.dat, the offsets the code uses):
// launch speed 0.03 per knockback (x100), decay 0.051 (x204), hitstun 0.4 (x154), DI 18 degrees (x1A8), top
// threshold 2.4 (x4F0), and hitlag = damage / 3 + 3, at most 20 frames (x198, x19C, x194).
//
// What is NOT the game's: a keyboard has eight directions at full tilt; the freeze before the launch is a fixed time to read and choose, not the
// move's hitlag; there is no smash DI, no crouch cancel, no staleness, and nothing after the launch (no jump,
// no drift, no recovery): this only answers "would this hit have killed?".
import { MELEE_STATS } from "./characterStats.melee";

/** A stage's blast lines and where its main platform ends (IKneeData's calculator). Side platforms aren't flown into. */
export type Stage = { name: string; top: number; bottom: number; left: number; right: number; edge: number };
export const STAGES = {
  fd: { name: "Final Destination", top: 188, bottom: -140, left: -246, right: 246, edge: 85.5657 },
  battlefield: { name: "Battlefield", top: 200, bottom: -108.8, left: -224, right: 224, edge: 68.4 },
  yoshis: { name: "Yoshi's Story", top: 168, bottom: -91, left: -175.7, right: 173.6, edge: 56 },
  fountain: { name: "Fountain of Dreams", top: 202.5, bottom: -146.25, left: -198.75, right: 198.75, edge: 63.34755 },
  dreamland: { name: "Dream Land", top: 250, bottom: -123, left: -255, right: 255, edge: 77.2713 },
  stadium: { name: "Pokémon Stadium", top: 180, bottom: -111, left: -230, right: 230, edge: 87.75 },
} satisfies Record<string, Stage>;
export type StageKey = keyof typeof STAGES;
export const STAGE_KEYS = Object.keys(STAGES) as StageKey[];
export const STAGE = STAGES.fd;
export const SAKURAI_GROUNDED = 44;
export const MAX_DI = 18;
export const TOP_KO_SPEED = 2.4;
/** Each axis of a full diagonal on the stick: 80 * cos(45 degrees), cut to a whole number (56), over 80. */
export const DIAGONAL = 56 / 80;
/** The frames a hit freezes both players for, from its damage (the game's formula; electric and crouching change it). */
export const hitlag = (damage: number) => Math.min(20, Math.floor(damage / 3 + 3));

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
  // The game clamps the stick to a circle: a full diagonal is 56/80 on each axis, so its length is 0.99, not 1.41.
  const length = stick.x && stick.y ? Math.hypot(DIAGONAL, DIAGONAL) : 1;
  const perp = Math.sin(rad(angle) - stickAngle) * length;
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
export function fly(kb: number, angleDeg: number, victim: Victim, x0: number, stage: Stage = STAGE): Flight {
  const { gravity, fallSpeed } = MELEE_STATS[victim];
  const cos = Math.cos(rad(angleDeg));
  const sin = Math.sin(rad(angleDeg));
  const stun = hitstun(kb);
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
    if (x < stage.left || x > stage.right) return { points, ko: "side", frames: f, landed: false };
    // Falling past the bottom line only counts while still in hitstun: after that the player could jump, so the
    // hit itself didn't kill (round 954). The sides and the top count throughout: knockback can't be cancelled.
    if (y < stage.bottom) return { points, ko: f <= stun ? "bottom" : null, frames: f, landed: false };
    if (y > stage.top && vy > TOP_KO_SPEED) return { points, ko: "top", frames: f, landed: false };
    if (y <= 0 && Math.abs(x) <= stage.edge && f > 1) return { points, ko: null, frames: f, landed: true };
    if (speed === 0) return { points, ko: null, frames: f, landed: false };
  }
  return { points, ko: null, frames: 600, landed: false };
}

/** A stick direction as an arrow ("·" for none). The up-right arrow carries U+FE0E so iPhones don't draw an emoji. */
const ARROWS: Record<string, string> = { "0,0": "·", "1,0": "→", "-1,0": "←", "0,1": "↑", "0,-1": "↓", "1,1": "↗︎", "-1,1": "↖", "1,-1": "↘", "-1,-1": "↙" };
export const stickArrow = (s: Stick) => ARROWS[`${s.x},${s.y}`] ?? "·";

export const STICKS: Stick[] = [NO_STICK, { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: -1 }];

/** How far from death a flight ended: the smallest gap to the blast line it came closest to (0 when KO'd). */
export function margin(flight: Flight, stage: Stage = STAGE): number {
  if (flight.ko) return 0;
  return Math.min(...flight.points.map(([x, y]) => Math.min(stage.right - x, x - stage.left, y - stage.bottom, stage.top - y > 0 ? stage.top - y : 0.01)));
}

/**
 * One hit, worked out: the knockback, the flight with no DI, with the player's DI, and the best the player's input
 * allows. `analog` (round 985): the stick is a touch stick (x and y anywhere in the circle), read as the game reads a
 * controller (`touchStick`), and the best is the best any stick angle gives; otherwise it's a keyboard's eight.
 */
export function resolveHit(move: Pick<DiMove, "damage" | "angle" | "base" | "growth">, percentBefore: number, victim: Victim, x0: number, facing: 1 | -1, stick: Stick, stage: Stage = STAGE, analog = false) {
  const kb = knockback(move, percentBefore, MELEE_STATS[victim].weight ?? 100);
  const angle = launchAngle(move, facing);
  const at = (s: Stick) => fly(kb, diAngle(angle, s), victim, x0, stage);
  const turned = analog ? stickTurn(angle, touchStick(stick)) : diAngle(angle, stick) - angle;
  const mine = analog ? fly(kb, angle + turned, victim, x0, stage) : at(stick);
  let best = { stick: NO_STICK, flight: at(NO_STICK) };
  if (analog) {
    const b = bestAnalogDi(kb, angle, victim, x0, stage);
    if (b.stickAngle !== null) best = { stick: { x: Math.cos(rad(b.stickAngle)), y: Math.sin(rad(b.stickAngle)) }, flight: b.flight };
  } else {
    for (const s of STICKS) {
      const flight = at(s);
      if (margin(flight, stage) > margin(best.flight, stage)) best = { stick: s, flight };
    }
  }
  return { kb, angle, turned, none: at(NO_STICK), mine, best, hitstun: hitstun(kb) };
}

export type DiRound = { move: DiMove; x0: number; facing: 1 | -1 };
/** `rand` gives 0..1 numbers. The hit comes from the side the victim is further from, so it sends them the long way... or not. */
export function newDiRound(rand: () => number, stage: Stage = STAGE): DiRound {
  const move = DI_MOVES[Math.min(DI_MOVES.length - 1, Math.floor(rand() * DI_MOVES.length))];
  // Five spots across the stage, out to about seven tenths of the way to its edge (-60 to 60 on Final Destination).
  const x0 = Math.round(([-2, -1, 0, 1, 2][Math.min(4, Math.floor(rand() * 5))] * stage.edge * 0.7) / 2);
  return { move, x0, facing: rand() < 0.5 ? 1 : -1 };
}

/**
 * The percents where DI decides a hit: from the lowest percent it kills with no DI (`kill`) to the highest the
 * best keyboard DI still survives (`max`). Null when DI can't save anyone from it there (or it never kills).
 */
export function diBand(round: DiRound, victim: Victim, stage: Stage = STAGE): { kill: number; max: number } | null {
  let kill = -1;
  for (let pct = 0; pct <= 300; pct++) {
    const r = resolveHit(round.move, pct, victim, round.x0, round.facing, NO_STICK, stage);
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
export function dealHit(rand: () => number, victim: Victim, level: number, stage: Stage = STAGE): DiHit {
  for (let tries = 0; tries < 30; tries++) {
    const round = newDiRound(rand, stage);
    const band = diBand(round, victim, stage);
    if (!band) continue;
    const reach = Math.min(1, 0.35 + level * 0.07);
    return { ...round, percent: band.kill + Math.floor(rand() * (band.max - band.kill + 1) * reach) };
  }
  return { move: DI_MOVES[0], x0: 0, facing: 1, percent: 100 };
}

// ---------- The best DI on a real analog stick (round 960) ----------
// Matthew, of Does it kill?'s hard mode: "We want it to cover the best DI for an analog stick; this knowledge check
// will be to apply to real gameplay." The DI trainer above stays on a keyboard's eight directions; this is the
// controller, as the game reads it (github.com/doldecomp/melee: sysdolphin/baselib/controller.c, melee/gm/gmmain.c,
// melee/ft/fighter.c): the stick is clamped to a circle of radius 80 and cut to whole steps, divided by 80, and an
// axis at or under the deadzone (0.28: 22 steps or fewer) reads as 0. DI is then max angle * perp^2 as above.

/** A stick held all the way out at `deg` degrees, as the game reads it. */
export function analogStick(deg: number): Stick {
  const axis = (v: number) => {
    const steps = Math.trunc(80 * v);
    return Math.abs(steps) <= 22 ? 0 : steps / 80;
  };
  return { x: axis(Math.cos(rad(deg))), y: axis(Math.sin(rad(deg))) };
}

/**
 * A touch stick as the game would read it (round 985): x and y from the thumb's place in the stick's circle (any
 * length; past the rim counts as the rim), clamped to the circle, cut to whole steps of 80 and each axis at or under
 * the deadzone (22 steps) read as 0, as `analogStick` does for a stick held all the way out.
 */
export function touchStick(s: Stick): Stick {
  const length = Math.hypot(s.x, s.y);
  const k = length > 1 ? 1 / length : 1;
  const axis = (v: number) => {
    const steps = Math.trunc(80 * v * k);
    return Math.abs(steps) <= 22 ? 0 : steps / 80;
  };
  return { x: axis(s.x), y: axis(s.y) };
}

/** How far a stick position turns a launch, in degrees (positive: anticlockwise), by the game's rule. */
export function stickTurn(angle: number, stick: Stick): number {
  if (!stick.x && !stick.y) return 0;
  const perp = Math.sin(rad(angle) - Math.atan2(stick.y, stick.x)) * Math.hypot(stick.x, stick.y);
  return -Math.sign(perp) * Math.min(MAX_DI, perp * perp * MAX_DI);
}

/**
 * The most an analog stick can turn a launch each way, and the stick angle that does it. It is a little under 18
 * degrees when the direction straight across the launch falls in the deadzone of an axis (a launch at 80 degrees:
 * the stick has to tilt off the horizontal to keep both axes alive).
 */
export function analogDiRange(angle: number): { min: number; max: number; minAt: number; maxAt: number } {
  let out = { min: 0, max: 0, minAt: 0, maxAt: 0 };
  for (let deg = 0; deg < 360; deg += 0.5) {
    const turn = stickTurn(angle, analogStick(deg));
    if (turn > out.max) out = { ...out, max: turn, maxAt: deg };
    if (turn < out.min) out = { ...out, min: turn, minAt: deg };
  }
  return out;
}

export type AnalogDi = { turn: number; stickAngle: number | null; flight: Flight };
/**
 * The best DI an analog stick allows for a launch: every turn between the two extremes can be held (a stick
 * between "none" and "straight across"), so they are tried half a degree apart and the one that ends furthest
 * from the blast lines wins. `stickAngle`: where to hold the stick for it (null: holding nothing is best).
 */
export function bestAnalogDi(kb: number, angle: number, victim: Victim, x0: number, stage: Stage = STAGE): AnalogDi {
  const range = analogDiRange(angle);
  let best: AnalogDi = { turn: 0, stickAngle: null, flight: fly(kb, angle, victim, x0, stage) };
  let bestMargin = margin(best.flight, stage);
  const turns = [range.min, range.max];
  for (let t = Math.ceil(range.min * 2) / 2; t <= range.max; t += 0.5) if (t !== 0) turns.push(t);
  for (const turn of turns) {
    const flight = fly(kb, angle + turn, victim, x0, stage);
    const m = margin(flight, stage);
    if (m <= bestMargin) continue;
    // Where the stick sits for this turn: straight across the launch at the extremes, nearer the launch for less.
    const lean = (Math.asin(Math.sqrt(Math.min(1, Math.abs(turn) / MAX_DI))) * 180) / Math.PI;
    const stickAngle = turn === range.max ? range.maxAt : turn === range.min ? range.minAt : (((angle + Math.sign(turn) * lean) % 360) + 360) % 360;
    best = { turn, stickAngle, flight };
    bestMargin = m;
  }
  return best;
}

/**
 * True when a launch rose past the top blast line and wasn't KO'd: by then the knockback was carrying the
 * character up no faster than the threshold, which is the game's own condition for a KO off the top (round 961:
 * Matthew saw Jigglypuff drawn above the line with "They live" and asked whether she doesn't still pass it).
 */
export const passedTopAlive = (flight: Flight, stage: Stage = STAGE) => flight.ko === null && flight.points.some(([, y]) => y > stage.top);
