// The Arcade's Melee knowledge games (round 955, Matthew: "all of those knowledge games sound good"): three
// quizzes (a fourth, Punish it, was taken out in round 957: Matthew found it wordy, and ranking punishes by
// damage and frames alone "could teach unoptimal gameplay") asked from the game's own numbers (meleeMoves.data.ts, read from the disc), with no reflexes needed.
// The questions are made here, as plain data; the screen (FrameQuiz.tsx) words them.
//
// - Which is faster?: two moves; which comes out sooner. (It also asked "which does more damage?" until round 958:
//   Matthew didn't like that in a game about speed.)
// - Guess the move: a move's frames as a strip (startup, active, recovery); which of four moves is it.
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
    if (killsFrom === null || killsFrom < 40 || killsFrom > 160) continue; // the percents people actually die at
    const kills = rand() < 0.5;
    const percent = kills ? killsFrom + Math.floor(rand() * 25) : killsFrom - 4 - Math.floor(rand() * 22);
    const flight = fly(knockback(hit.data.kill!, percent, MELEE_STATS[victim].weight ?? 100), launchAngle(hit.data.kill!, 1), victim, 0, STAGES[stage]);
    return { attacker: hit.char, move: hit.move, victim, stage, percent, killsFrom, kills, flight };
  }
  throw new Error("no kill question could be made");
}
