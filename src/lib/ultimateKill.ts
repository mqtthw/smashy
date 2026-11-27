// "Does it kill?" for Ultimate (round 963): a hit flown frame by frame with Ultimate's rules, ported from the
// Smash Ultimate Calculator by rubendal (github.com/rubendal/SSBU-Calculator, MIT licence), the source Matthew
// approved on 2026-11-27. SmashWiki agrees with it on the knockback formula, the fresh-move bonus, rage, hitstun,
// DI, LSI and the Sakurai angle. Where each piece is in the calculator:
//
// - Knockback (js/formulas.js, VSKB): ((((p + d*s)/10 + ((p + d*s) * d * (1 - (1 - s) * 0.3))/20) * 1.4 *
//   200/(w + 100)) + 18) * growth/100 + base, with p the percent BEFORE the hit, d the move's damage and s = 1.05
//   for a fresh move. Asked as the calculator's own defaults: fresh, uncharged, no rage (attacker at 0%), 1v1 (the
//   1.2x doesn't enter a single hit's knockback), on a standing grounded target.
// - Launch (js/knockback.js, calculate): speed = knockback * 0.03 along the angle; in tumble (knockback 80+), and
//   unless the launch is 70-110 degrees, the vertical part gains 5 * (gravity - 0.075). SmashWiki's Knockback page
//   can be read as saying that boost is gone in Ultimate; the calculator is followed.
// - The Sakurai angle on the ground: 0 under 60 knockback, 38 from 88, a line between; a flat launch of 120+
//   knockback becomes 32 degrees (js/formulas.js, SakuraiAngle; knockback.js).
// - Flight (js/knockback.js, Distance): each frame the position moves by the launch speed plus the fighter's own
//   fall, then the launch speed loses 0.051 along its angle, then the fall gains gravity up to the fall speed. A
//   70-110 degree launch falls with the "damage fly top" gravity and a fall speed of 1.8 instead.
// - KO (same file): past a side or the bottom blast line; past the top one only while the launch is still
//   carrying the fighter up at 2.4 a frame or more (or when hitstun is under 32 frames); 30 units past the top or
//   bottom kills regardless. Only counted during hitstun: floor(knockback * 0.4) - 1 frames. The 2.4 has no
//   second source for Ultimate.
// - DI and LSI (js/formulas.js, DI, LSI): in tumble, and unless the launch is within 0.17 radians of flat, the
//   stick turns the launch by up to 0.17 radians (its part across the launch times 0.17); holding up or down also
//   scales the launch speed (x1.095 up, x0.92 down) unless the launch is 65-115 degrees. The stick is read as the
//   calculator reads a GameCube stick: 128 at the gate, under 24 on an axis is 0, 120 or more is full.
//
// What is NOT modelled, here or in the calculator's numbers: fighters' hurtboxes and size (its author says KO
// percents aren't exact for that reason), stage walls and platforms, anything after hitstun, staleness, rage,
// charge, short hops, and which patch the move data is from (the repo doesn't say). Balloon knockback only changes
// how fast a launch plays, not its path, so it's left out.
import type { Flight, Stage } from "./diSurvival";
import { ULT_FIGHTERS, ULT_MOVES, ULT_STAGES, type UltFighter, type UltMove, type UltMoveKey } from "./ultimateKill.data";

const rad = (deg: number) => (deg * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
export const ULT = { launch: 0.03, decay: 0.051, hitstun: 0.4, tumble: 32, boost: 5, boostBase: 0.075, di: 0.17, lsiUp: 1.095, lsiDown: 0.92, fresh: 1.05, topSpeed: 2.4 };

/** Ultimate's knockback for a fresh, uncharged hit with no rage. `percent` is the victim's percent before the hit. */
export function ultKnockback([damage, , base, growth]: UltMove, percent: number, weight: number): number {
  const s = ULT.fresh;
  const p = percent + damage * s;
  return ((p / 10 + (p * damage * (1 - (1 - s) * 0.3)) / 20) * 1.4 * (200 / (weight + 100)) + 18) * (growth / 100) + base;
}

export const ultHitstun = (kb: number) => Math.floor(Math.max(5, kb * ULT.hitstun)) - 1;
export const ultTumble = (kb: number) => ultHitstun(kb) + 1 >= ULT.tumble;

/** The angle a move launches a standing target at (degrees), for a hit from the left. */
export function ultAngle(moveAngle: number, kb: number): number {
  let a = moveAngle;
  if (a === 361) a = kb < 60 ? 0 : kb >= 88 ? 38 : Math.min(((kb - 60) / 28) * 38 + 1, 38);
  if ((a === 0 || a === 180) && kb >= 120) a = 32;
  return a;
}

/** A GameCube stick held at the gate at `angle` degrees, as the calculator reads it. */
export function ultStick(angle: number): { x: number; y: number } {
  const axis = (v: number) => (Math.abs(v) < 24 ? 0 : Math.max(-1, Math.min(1, v / 120)));
  return { x: axis(128 * Math.cos(rad(angle))), y: axis(128 * Math.sin(rad(angle))) };
}

export type UltLaunch = { vx: number; vy: number; angle: number; kb: number; hitstun: number; flyTop: boolean };
/** The launch a hit gives: its two speeds and the angle its decay follows. `stick`: held for DI (null: nothing). */
export function ultLaunch(move: UltMove, percent: number, victim: UltFighter, stick: { x: number; y: number } | null = null): UltLaunch {
  const kb = ultKnockback(move, percent, victim.weight);
  const tumble = ultTumble(kb);
  const base = ultAngle(move[1], kb);
  const flyTop = tumble && base >= 70 && base <= 110;
  const boost = tumble && !flyTop ? ULT.boost * (victim.gravity - ULT.boostBase) : 0;
  let speed = kb * ULT.launch;
  let vx = speed * Math.cos(rad(base));
  let vy = speed * Math.sin(rad(base)) + boost;
  let angle = deg(Math.atan2(vy, vx));
  // DI needs tumble and a launch that isn't nearly flat.
  if (stick && (stick.x || stick.y) && tumble && Math.abs(Math.atan2(vy, vx)) >= ULT.di) {
    speed = Math.hypot(vx, vy);
    const across = Math.abs(stick.x * vy - stick.y * vx) / speed;
    const turn = ULT.di * across * (stick.y * vx - stick.x * vy < 0 ? -1 : 1);
    angle = deg(Math.atan2(vy, vx) + turn);
    if (angle < 0) angle += 360;
    // Launch speed influence: up sends further, down less far, unless the launch is near vertical.
    const lsi = (angle > 65 && angle < 115) || (angle > 245 && angle < 295) ? 1 : stick.y >= 0 ? 1 + (ULT.lsiUp - 1) * stick.y : 1 - (1 - ULT.lsiDown) * -stick.y;
    speed *= lsi;
    vx = speed * Math.cos(rad(angle));
    vy = speed * Math.sin(rad(angle));
  }
  return { vx, vy, angle, kb, hitstun: ultHitstun(kb), flyTop };
}

/** Flies a launch from the middle of a stage through its hitstun. KO'd, or alive when hitstun ends. */
export function ultFly(l: UltLaunch, victim: UltFighter, stage: Stage): Flight {
  const decayX = ULT.decay * Math.cos(rad(l.angle));
  const decayY = ULT.decay * Math.sin(rad(l.angle));
  const gravity = l.flyTop ? victim.flyGravity : victim.gravity;
  const fall = l.flyTop ? victim.flyFallSpeed : victim.fallSpeed;
  let { vx, vy } = l;
  let own = 0;
  let x = 0;
  let y = 0;
  const points: [number, number][] = [[x, y]];
  const ko = (): Flight["ko"] => {
    if (y >= stage.top + 30 || y <= stage.bottom - 30) return y > 0 ? "top" : "bottom";
    if (x <= stage.left || x >= stage.right) return "side";
    if (y <= stage.bottom) return "bottom";
    if (y >= stage.top && (vy >= ULT.topSpeed || l.hitstun < ULT.tumble)) return "top";
    return null;
  };
  for (let i = 0; i < l.hitstun; i++) {
    x += vx;
    y += vy + own;
    points.push([x, y]);
    // The launch speed loses its decay, never past zero.
    const nx = vx - decayX;
    vx = Math.sign(nx) === Math.sign(vx) ? nx : 0;
    const ny = vy - decayY;
    vy = Math.sign(ny) === Math.sign(vy) ? ny : 0;
    own = Math.max(own - gravity, -fall);
    const dead = ko();
    if (dead) return { points, ko: dead, frames: i + 1, landed: false };
    if (y < 0 && Math.abs(x) <= stage.edge && i > 0) return { points, ko: null, frames: i + 1, landed: true }; // back on the stage
  }
  return { points, ko: null, frames: l.hitstun, landed: false };
}

/** How far from death a flight stayed: the smallest gap to a blast line (0 when KO'd). Over the top alive counts as close. */
export function ultMargin(f: Flight, stage: Stage): number {
  if (f.ko) return 0;
  return Math.min(...f.points.map(([x, y]) => Math.min(stage.right - x, x - stage.left, y - stage.bottom, y < stage.top ? stage.top - y : 0.01)));
}

export type UltBestDi = { stickAngle: number | null; flight: Flight };
/** The best DI: every stick direction two degrees apart is tried (as the calculator brute-forces it), and the one that ends furthest from the blast lines wins. */
export function ultBestDi(move: UltMove, percent: number, victim: UltFighter, stage: Stage): UltBestDi {
  let best: UltBestDi = { stickAngle: null, flight: ultFly(ultLaunch(move, percent, victim), victim, stage) };
  let bestMargin = ultMargin(best.flight, stage);
  for (let a = 0; a < 360; a += 2) {
    const stick = ultStick(a);
    if (!stick.x && !stick.y) continue;
    const flight = ultFly(ultLaunch(move, percent, victim, stick), victim, stage);
    const m = ultMargin(flight, stage);
    if (m > bestMargin) {
      best = { stickAngle: a, flight };
      bestMargin = m;
    }
  }
  return best;
}

/** The lowest percent at which a hit kills from the middle of a stage (with no DI, or through the best DI); null if not by 300%. */
export function ultKillPercent(move: UltMove, victim: UltFighter, stage: Stage, bestDi = false, from = 0): number | null {
  const dies = (pct: number) => (bestDi ? ultBestDi(move, pct, victim, stage).flight.ko : ultFly(ultLaunch(move, pct, victim), victim, stage).ko) !== null;
  for (let pct = from; pct <= 300; pct++) if (dies(pct)) return pct;
  return null;
}

/** A question for the quiz screen, the same shape whichever game it is asked about. */
export type KillView = {
  game: "melee" | "ultimate";
  attacker: string;
  move: UltMoveKey | "jab" | "grab" | "dashGrab";
  victim: string;
  stage: Stage;
  percent: number;
  killsFrom: number;
  kills: boolean;
  flight: Flight;
  hard: boolean;
  stickAngle: number | null;
  noDi: Flight;
  noDiFrom: number;
  /** The percent it kills from through the best DI. */
  diFrom: number;
};

const pick = <T>(list: readonly T[], rand: () => number): T => list[Math.min(list.length - 1, Math.floor(rand() * list.length))];
/** Moves worth asking about: a launch that leaves the ground (no slides, no spikes) with real growth. */
const askable = ([, angle, , growth]: UltMove) => growth >= 60 && (angle === 361 || (angle >= 25 && angle <= 155));

/** An Ultimate hit near the percent where it starts to kill: half a little above, half a little below. */
export function newUltKillQuestion(rand: () => number, hard = false): KillView {
  const attackers = Object.keys(ULT_MOVES);
  const victims = Object.keys(ULT_FIGHTERS);
  for (let i = 0; i < 300; i++) {
    const attacker = pick(attackers, rand);
    const [moveKey, move] = pick(Object.entries(ULT_MOVES[attacker]) as [UltMoveKey, UltMove][], rand);
    if (!askable(move)) continue;
    const victimKey = pick(victims, rand);
    const victim = ULT_FIGHTERS[victimKey];
    const stage = pick(ULT_STAGES, rand);
    const noDiFrom = ultKillPercent(move, victim, stage);
    if (noDiFrom === null || noDiFrom < 50 || noDiFrom > 190) continue; // the percents people actually die at
    const diFrom = ultKillPercent(move, victim, stage, true, noDiFrom);
    if (diFrom === null) continue;
    const killsFrom = hard ? diFrom : noDiFrom;
    const kills = rand() < 0.5;
    const percent = Math.max(0, kills ? killsFrom + Math.floor(rand() * 25) : killsFrom - 1 - Math.floor(rand() * Math.max(6, hard ? killsFrom - noDiFrom + 6 : 22)));
    const noDi = ultFly(ultLaunch(move, percent, victim), victim, stage);
    const best = ultBestDi(move, percent, victim, stage);
    const flight = hard ? best.flight : noDi;
    // The stick to show: the best DI here, or, when nothing saves them at this percent, the DI that lasts longest.
    const stickAngle = best.flight.ko ? ultBestDi(move, diFrom - 1, victim, stage).stickAngle : best.stickAngle;
    if ((flight.ko !== null) !== kills) continue; // with DI in play, just above the line isn't always a kill
    return { game: "ultimate", attacker, move: moveKey, victim: victimKey, stage, percent, killsFrom, kills, flight, hard, stickAngle, noDi, noDiFrom, diFrom };
  }
  throw new Error("no Ultimate kill question could be made");
}
