// Ultimate in the Arcade's frame quizzes (round 968, Matthew asked for "Which is faster? for Ultimate", "Guess the
// move for Ultimate" and, of three ways to ask about shields, "Which is safer on shield?"). The moves come from
// ultimateMoves.data.ts (made by tools/ssbu-calc/build-frames.mjs from the approved Smash Ultimate Calculator data);
// the questions are made here as plain data and worded by FrameQuiz.tsx. Loaded only when an Ultimate round starts.
import { newDuel, newMoveGuess, type Duel, type MoveGuess, type MoveRef, type MoveTable } from "./frameGames";
import type { MoveData, MoveKey } from "./meleeMoves.data";
import { ULT_FRAME_MOVES, type UltPackedMove } from "./ultimateMoves.data";

/** A move's frames, as the Melee quizzes have them, plus an aerial's landing lag and the frames on shield. */
export type UltMoveData = MoveData & { landing: number | null; shield: number | null };

export function unpack([total, landing, shield, hits]: UltPackedMove): UltMoveData {
  return { start: hits[0][0], end: hits[hits.length - 1][1], total, damage: Math.max(...hits.map((h) => h[2])), hits, kill: null, landing, shield };
}

export const ULT_MOVES: Record<string, Partial<Record<MoveKey, UltMoveData>>> = Object.fromEntries(
  Object.entries(ULT_FRAME_MOVES).map(([char, moves]) => [char, Object.fromEntries(Object.entries(moves).map(([key, packed]) => [key, unpack(packed!)]))]),
);

type UltMoveRef = MoveRef & { data: UltMoveData };
export const ultAllMoves = (): UltMoveRef[] => Object.entries(ULT_MOVES).flatMap(([char, moves]) => Object.entries(moves).map(([move, data]) => ({ char, move: move as MoveKey, data: data! })));

/** Which is faster?, from Ultimate's moves. */
export const newUltDuel = (rand: () => number): Duel => newDuel(rand, ultAllMoves());
/** Guess the move, from one Ultimate fighter's moves. */
export const newUltMoveGuess = (rand: () => number): MoveGuess => newMoveGuess(rand, ULT_MOVES as MoveTable);

// ---------- Which is safer on shield? ----------

/**
 * How far apart two moves' numbers on shield must be to be asked. Checked against ultimateframedata.com, ours are the
 * same or one frame apart; with 3 frames between them, two moves can't swap or tie even if both are a frame off.
 */
export const SHIELD_GAP = 3;
export type ShieldDuel = { a: UltMoveRef; b: UltMoveRef; answer: "a" | "b" };
/** Moves with a number on shield: one swing, not a jab (jabs go on into the next hit) or a grab. */
export const shieldMoves = (): UltMoveRef[] => ultAllMoves().filter((m) => m.data.shield !== null && m.move !== "jab");
/** Two moves at least SHIELD_GAP frames apart on shield; the answer is the one less behind. */
export function newShieldDuel(rand: () => number, moves = shieldMoves()): ShieldDuel {
  for (let i = 0; i < 200; i++) {
    const a = moves[Math.floor(rand() * moves.length)];
    const b = moves[Math.floor(rand() * moves.length)];
    if (!a || !b || a === b || Math.abs(a.data.shield! - b.data.shield!) < SHIELD_GAP) continue;
    return { a, b, answer: a.data.shield! > b.data.shield! ? "a" : "b" };
  }
  throw new Error("no shield duel could be made");
}
