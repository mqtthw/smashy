// The Arcade's Melee knowledge games (round 955, Matthew: "all of those knowledge games sound good"): four
// quizzes asked from the game's own numbers (meleeMoves.data.ts, read from the disc), with no reflexes needed.
// The questions are made here, as plain data; the screen (FrameQuiz.tsx) words them.
//
// - Which is faster?: two moves; which comes out sooner, or which does more damage.
// - Guess the move: a move's frames as a strip (startup, active, recovery); which of four moves is it.
// - Punish it: an opponent's move misses; they are stuck for a number of frames after it stops hitting. Which of
//   your moves is the strongest that still comes out in time. It only compares frames: no range, spacing, shields.
// - Does it kill?: a move, a victim, a percent and a stage; flown with the DI trainer's maths (diSurvival.ts) with
//   no DI. Yes or no.
import { MELEE_STATS } from "./characterStats.melee";
import { DI_VICTIMS, STAGES, STAGE_KEYS, fly, knockback, launchAngle, type Flight, type StageKey, type Victim } from "./diSurvival";
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

export type DuelKind = "startup" | "damage";
export type Duel = { kind: DuelKind; a: MoveRef; b: MoveRef; answer: "a" | "b" };
/** Two different moves whose answer isn't a tie. Grabs do no damage, so they're only asked about speed. */
export function newDuel(rand: () => number, moves = allMoves()): Duel {
  for (let i = 0; i < 200; i++) {
    const kind: DuelKind = rand() < 0.7 ? "startup" : "damage";
    const pool = kind === "damage" ? moves.filter((m) => !isGrab(m.move)) : moves;
    const a = pick(pool, rand);
    const b = pick(pool, rand);
    const [x, y] = kind === "startup" ? [a.data.start, b.data.start] : [a.data.damage, b.data.damage];
    if (a === b || x === y) continue;
    return { kind, a, b, answer: kind === "startup" ? (x < y ? "a" : "b") : x > y ? "a" : "b" };
  }
  throw new Error("no duel could be made");
}

// ---------- Guess the move ----------

export type MoveGuess = { char: MoveChar; answer: MoveKey; data: MoveData; options: MoveKey[] };
const shape = (d: MoveData) => `${d.start}|${d.end}|${d.total}`;
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

// ---------- Punish it ----------

/** The moves offered as punishes: ground attacks from standing (a grab's reward is its throw, so it isn't ranked here). */
export const PUNISH_MOVES: MoveKey[] = ["jab", "ftilt", "utilt", "dtilt", "fsmash", "usmash", "dsmash"];
/** The frames an opponent is still stuck for after their move stops hitting. */
export const lagAfter = (d: MoveData) => d.total - d.end;
export type Punish = { whiff: MoveRef; window: number; me: MoveChar; options: MoveKey[]; answer: MoveKey };
/**
 * A missed move with enough lag that something lands, and four of the player's moves: the answer is the one that
 * does the most damage among those that come out within the window; at least one of the others is too slow.
 */
export function newPunish(rand: () => number): Punish {
  for (let i = 0; i < 400; i++) {
    const whiff = pick(allMoves().filter((m) => !isGrab(m.move) && !/air$/.test(m.move)), rand);
    const window = lagAfter(whiff.data);
    const me = pick(MOVE_CHARS, rand);
    const mine = PUNISH_MOVES.filter((m) => MELEE_MOVES[me][m]);
    const options = shuffled(mine, rand).slice(0, 4);
    const lands = options.filter((m) => MELEE_MOVES[me][m]!.start <= window).sort((x, y) => MELEE_MOVES[me][y]!.damage - MELEE_MOVES[me][x]!.damage);
    if (options.length < 4 || !lands.length || lands.length === options.length) continue;
    if (lands[1] && MELEE_MOVES[me][lands[1]]!.damage === MELEE_MOVES[me][lands[0]]!.damage) continue; // a tie for strongest
    return { whiff, window, me, options, answer: lands[0] };
  }
  throw new Error("no punish could be made");
}

// ---------- Does it kill? ----------

export type KillQuestion = { attacker: MoveChar; move: MoveKey; victim: Victim; stage: StageKey; percent: number; killsFrom: number; kills: boolean; flight: Flight };
/** The lowest percent at which a hit kills from the middle of a stage with no DI, or null when it doesn't by 300%. */
export function killPercent(kill: NonNullable<MoveData["kill"]>, victim: Victim, stage: StageKey): number | null {
  const weight = MELEE_STATS[victim].weight ?? 100;
  // Knockback only grows with percent, so the first percent that kills can be found by halving.
  const dies = (pct: number) => fly(knockback(kill, pct, weight), launchAngle(kill, 1), victim, 0, STAGES[stage]).ko !== null;
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
/** A hit near the percent where it starts to kill: half the questions a little above it, half a little below. */
export function newKillQuestion(rand: () => number): KillQuestion {
  const strong = allMoves().filter((m) => m.data.kill && m.data.kill.growth >= 60 && (m.data.kill.angle <= 180 || m.data.kill.angle === 361));
  for (let i = 0; i < 200; i++) {
    const hit = pick(strong, rand);
    const victim = pick(DI_VICTIMS, rand);
    const stage = pick(STAGE_KEYS, rand);
    const killsFrom = killPercent(hit.data.kill!, victim, stage);
    if (killsFrom === null || killsFrom < 30 || killsFrom > 220) continue;
    const kills = rand() < 0.5;
    const percent = kills ? killsFrom + Math.floor(rand() * 25) : killsFrom - 4 - Math.floor(rand() * 22);
    const flight = fly(knockback(hit.data.kill!, percent, MELEE_STATS[victim].weight ?? 100), launchAngle(hit.data.kill!, 1), victim, 0, STAGES[stage]);
    return { attacker: hit.char, move: hit.move, victim, stage, percent, killsFrom, kills, flight };
  }
  throw new Error("no kill question could be made");
}
