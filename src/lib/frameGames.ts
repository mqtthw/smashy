// The Arcade's Melee knowledge games (round 955, Matthew: "all of those knowledge games sound good"): three
// quizzes (a fourth, Punish it, was taken out in round 957: Matthew found it wordy, and ranking punishes by
// damage and frames alone "could teach unoptimal gameplay") asked from the game's own numbers (meleeMoves.data.ts, read from the disc), with no reflexes needed.
// The questions are made here, as plain data; the screen (FrameQuiz.tsx) words them.
//
// - Which is faster?: two moves; which comes out sooner. (It also asked "which does more damage?" until round 958:
//   Matthew didn't like that in a game about speed.)
// - Guess the move: a move's frames as a strip (startup, active, recovery); which of four moves is it.
// - Does it kill?: a move, a victim, a percent and a stage; flown with the DI trainer's maths (diSurvival.ts) with
//   no DI. Yes or no. Hard mode asks the same with the best DI held.
import { MELEE_STATS } from "./characterStats.melee";
import { DI_VICTIMS, STAGES, STAGE_KEYS, bestAnalogDi, fly, knockback, launchAngle, type Flight, type StageKey, type Victim } from "./diSurvival";
import type { KillView } from "./ultimateKill";
import { MELEE_MOVES, MOVE_CHARS, MOVE_KEYS, type MoveChar, type MoveData, type MoveKey } from "./meleeMoves.data";

export type MoveRef = { char: MoveChar; move: MoveKey; data: MoveData };
export const QUIZ_LENGTH = 10;
const GRABS: MoveKey[] = ["grab", "dashGrab"];
const isGrab = (m: MoveKey) => GRABS.includes(m);

export const allMoves = (): MoveRef[] => MOVE_CHARS.flatMap((char) => MOVE_KEYS.flatMap((move) => (MELEE_MOVES[char][move] ? [{ char, move, data: MELEE_MOVES[char][move]! }] : [])));
const pick = <T>(list: readonly T[], rand: () => number): T => list[Math.min(list.length - 1, Math.floor(rand() * list.length))];
/** The list in a random order. */
export function shuffled<T>(list: readonly T[], rand: () => number): T[] {
  const left = [...list];
  const out: T[] = [];
  while (left.length) out.push(left.splice(Math.min(left.length - 1, Math.floor(rand() * left.length)), 1)[0]);
  return out;
}

// ---------- Which is faster? ----------

export type Duel = { a: MoveRef; b: MoveRef; answer: "a" | "b" };
/** Two different moves that don't come out on the same frame; the answer is the sooner one. */
export function newDuel(rand: () => number, moves = allMoves()): Duel {
  for (let i = 0; i < 200; i++) {
    const a = pick(moves, rand);
    const b = pick(moves, rand);
    if (a === b || a.data.start === b.data.start) continue;
    return { a, b, answer: a.data.start < b.data.start ? "a" : "b" };
  }
  throw new Error("no duel could be made");
}

// ---------- Guess the move ----------

export type MoveGuess = { char: MoveChar; answer: MoveKey; data: MoveData; options: MoveKey[] };
const shape = (d: MoveData) => `${d.hits.map((h) => `${h[0]}-${h[1]}`).join(",")}|${d.total}`;
/** One character's move and three of their others whose frames look different. */
export function newMoveGuess(rand: () => number): MoveGuess {
  for (let i = 0; i < 200; i++) {
    const char = pick(MOVE_CHARS, rand);
    const mine = MOVE_KEYS.filter((m) => MELEE_MOVES[char][m] && !isGrab(m));
    const answer = pick(mine, rand);
    const data = MELEE_MOVES[char][answer]!;
    const others = shuffled(mine.filter((m) => m !== answer && shape(MELEE_MOVES[char][m]!) !== shape(data)), rand).slice(0, 3);
    if (others.length < 3) continue;
    return { char, answer, data, options: shuffled([answer, ...others], rand) };
  }
  throw new Error("no move guess could be made");
}

// ---------- Does it kill? ----------

/**
 * `hard`: the question is asked with the best DI (round 959, Matthew: "a hard mode that asks does it kill at
 * optimal DI"), and since round 960 that is the best an analog stick allows, as the game reads a controller
 * ("this knowledge check will be to apply to real gameplay"). Then `flight` is the launch with that DI, `stickAngle`
 * where the stick is held for it in degrees (null: holding nothing is best), `killsFrom` the percent it kills from
 * even so, and `noDi` / `noDiFrom` the same hit with nothing held. Since round 964 `stickAngle` and `diFrom` (the
 * percent it kills from through the best DI) are worked out for every question, so the stick can always be shown.
 */
export type KillQuestion = { attacker: MoveChar; move: MoveKey; victim: Victim; stage: StageKey; percent: number; killsFrom: number; kills: boolean; flight: Flight; hard: boolean; stickAngle: number | null; noDi: Flight; noDiFrom: number; diFrom: number };
const launchOf = (kill: NonNullable<MoveData["kill"]>, pct: number, victim: Victim) => ({ kb: knockback(kill, pct, MELEE_STATS[victim].weight ?? 100), angle: launchAngle(kill, 1) });
/** The lowest percent at which a hit kills from the middle of a stage with no DI, or null when it doesn't by 300%. */
export function killPercent(kill: NonNullable<MoveData["kill"]>, victim: Victim, stage: StageKey): number | null {
  // Knockback only grows with percent, so the first percent that kills can be found by halving.
  const dies = (pct: number) => fly(launchOf(kill, pct, victim).kb, launchOf(kill, pct, victim).angle, victim, 0, STAGES[stage]).ko !== null;
  if (!dies(300)) return null;
  let lo = 0;
  let hi = 300;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (dies(mid)) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}
/**
 * The lowest percent at which a hit kills from the middle of a stage whatever an analog stick holds. Looked for
 * one percent at a time from where it kills with no DI: with DI in play a higher percent isn't always worse at once.
 */
export function killPercentBestDi(kill: NonNullable<MoveData["kill"]>, victim: Victim, stage: StageKey): number | null {
  const from = killPercent(kill, victim, stage);
  if (from === null) return null;
  for (let pct = from; pct <= 300; pct++) {
    const { kb, angle } = launchOf(kill, pct, victim);
    if (bestAnalogDi(kb, angle, victim, 0, STAGES[stage]).flight.ko) return pct;
  }
  return null;
}
/** A hit near the percent where it starts to kill: half the questions a little above it, half a little below. */
export function newKillQuestion(rand: () => number, hard = false): KillQuestion {
  const strong = allMoves().filter((m) => m.data.kill && m.data.kill.growth >= 60 && (m.data.kill.angle <= 180 || m.data.kill.angle === 361));
  for (let i = 0; i < 200; i++) {
    const hit = pick(strong, rand);
    const victim = pick(DI_VICTIMS, rand);
    const stage = pick(STAGE_KEYS, rand);
    const noDiFrom = killPercent(hit.data.kill!, victim, stage);
    if (noDiFrom === null || noDiFrom < 40 || noDiFrom > 160) continue; // the percents people actually die at
    const diFrom = killPercentBestDi(hit.data.kill!, victim, stage);
    if (diFrom === null) continue;
    const killsFrom = hard ? diFrom : noDiFrom;
    const kills = rand() < 0.5;
    // Hard: a miss sits between the two answers when it can, where no DI dies and the best DI lives.
    const percent = Math.max(0, kills ? killsFrom + Math.floor(rand() * 25) : killsFrom - 1 - Math.floor(rand() * Math.max(6, hard ? killsFrom - noDiFrom + 6 : 22)));
    const { kb, angle } = launchOf(hit.data.kill!, percent, victim);
    const noDi = fly(kb, angle, victim, 0, STAGES[stage]);
    const best = bestAnalogDi(kb, angle, victim, 0, STAGES[stage]);
    const flight = hard ? best.flight : noDi;
    // The stick to show: the best DI here, or, when nothing saves them at this percent, the DI that lasts longest
    // (the best one a percent under where it kills through DI).
    const last = launchOf(hit.data.kill!, diFrom - 1, victim);
    const stickAngle = best.flight.ko ? bestAnalogDi(last.kb, last.angle, victim, 0, STAGES[stage]).stickAngle : best.stickAngle;
    if ((flight.ko !== null) !== kills) continue; // DI in play: just above the line isn't always a kill
    return { attacker: hit.char, move: hit.move, victim, stage, percent, killsFrom, kills, flight, hard, stickAngle, noDi, noDiFrom, diFrom };
  }
  throw new Error("no kill question could be made");
}

/** A Melee question in the shape the quiz screen shows (the same as Ultimate's, round 963). */
export const toKillView = (q: KillQuestion): KillView => ({ game: "melee", attacker: q.attacker, move: q.move, victim: q.victim, stage: STAGES[q.stage], percent: q.percent, killsFrom: q.killsFrom, kills: q.kills, flight: q.flight, hard: q.hard, stickAngle: q.stickAngle, noDi: q.noDi, noDiFrom: q.noDiFrom, diFrom: q.diFrom });
