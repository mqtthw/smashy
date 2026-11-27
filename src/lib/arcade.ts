// The Arcade: small games made from Smash history's saved results (Matthew, 2026-11-26: "a simple relevant
// game or something interactive to get users to come back"). Pure rules here, shared by the pages and the
// browser; the data comes from arcadeData.ts. Nothing is saved on the server: a guest's guesses and best
// streak live in their own browser.
import type { GameKey } from "./games";

/** One major's main bracket of a game, as the games use it. */
export type ArcadeMajor = { slug: string; name: string; game: GameKey; date: string; entrants: number | null; top8: string[] };

const DAY_MS = 86400_000;
/** The first daily puzzle's day (UTC). */
export const ARCADE_FIRST_DAY = Date.UTC(2026, 10, 26);

/** Today's puzzle number: 1 on the first day, one more each UTC day. */
export const dayNumber = (nowMs: number) => Math.max(1, Math.floor((nowMs - ARCADE_FIRST_DAY) / DAY_MS) + 1);

/** A repeatable 0..1 number from a whole number (mulberry32), so everyone gets the same puzzle on a day. */
export function seeded(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** The day's pick from a list, the same for everyone. The list must be in a fixed order (sorted). */
export function pickDaily<T>(items: T[], day: number, salt = 0): T | null {
  return items.length ? items[Math.floor(seeded(day * 7919 + salt) * items.length)] : null;
}

export const yearOf = (date: string) => Number(date.slice(0, 4));

// ---------- Guess the major ----------

export const MAJOR_TRIES = 5;
/** Majors that can be the day's answer: a full top 8 and a known size. */
export const majorPuzzlePool = (majors: ArcadeMajor[]) =>
  majors.filter((m) => m.top8.length >= 8 && m.entrants !== null).sort((a, b) => a.slug.localeCompare(b.slug) || a.game.localeCompare(b.game));

export type Compare = "same" | "higher" | "lower";
const compare = (guess: number, answer: number): Compare => (guess === answer ? "same" : answer > guess ? "higher" : "lower");

export type MajorOption = { slug: string; name: string; year: number; entrants: number | null };
/** What a guess tells the player: whether the answer was later or earlier, and bigger or smaller. */
export function majorHint(guess: MajorOption, answer: MajorOption): { right: boolean; year: Compare; entrants: Compare | null } {
  return {
    right: guess.slug === answer.slug,
    year: compare(guess.year, answer.year),
    entrants: guess.entrants === null || answer.entrants === null ? null : compare(guess.entrants, answer.entrants),
  };
}

/** The same game's majors as choices, by name; two majors with one name get their year added. */
export function majorOptions(majors: ArcadeMajor[], game: GameKey): MajorOption[] {
  const list = majors.filter((m) => m.game === game);
  const names = new Map<string, number>();
  for (const m of list) names.set(m.name, (names.get(m.name) ?? 0) + 1);
  return list
    .map((m) => ({ slug: m.slug, name: (names.get(m.name) ?? 0) > 1 ? `${m.name} (${yearOf(m.date)})` : m.name, year: yearOf(m.date), entrants: m.entrants }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Choices matching what was typed (every word, anywhere in the name), without the ones already guessed. */
export function matchOptions<T extends { slug: string; name: string }>(options: T[], typed: string, used: readonly string[], max = 8): T[] {
  const words = typed.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return options.filter((o) => !used.includes(o.slug) && words.every((w) => o.name.toLowerCase().includes(w))).slice(0, max);
}

/** The squares people paste into Discord: one per guess, green for the right one, then "3/5" (X/5 on a miss). */
export function shareSquares(guessesRight: boolean[], tries: number): string {
  const won = guessesRight.includes(true);
  return `${guessesRight.map((r) => (r ? "🟩" : "🟥")).join("")} ${won ? guessesRight.length : "X"}/${tries}`;
}

// ---------- Higher or lower ----------

export type HlMajor = { name: string; game: GameKey; year: number; date: string; entrants: number };
export type HlQuestion = "entrants" | "first";
export type HlRound = { question: HlQuestion; a: HlMajor; b: HlMajor };

/** Majors with a known size, for Higher or lower. */
export const hlPool = (majors: ArcadeMajor[]): HlMajor[] =>
  majors.flatMap((m) => (m.entrants ? [{ name: m.name, game: m.game, year: yearOf(m.date), date: m.date, entrants: m.entrants }] : []));

/**
 * A round: two majors of one game and a question whose answer isn't a tie. `rand` gives 0..1 numbers
 * (Math.random in the browser, a fixed list in tests). Null when the pool can't make one.
 */
export function hlRound(pool: HlMajor[], rand: () => number): HlRound | null {
  for (let i = 0; i < 40; i++) {
    const a = pool[Math.floor(rand() * pool.length)];
    const same = pool.filter((m) => m.game === a?.game && m !== a);
    const b = same[Math.floor(rand() * same.length)];
    if (!a || !b) continue;
    const question: HlQuestion = rand() < 0.5 ? "entrants" : "first";
    if (question === "entrants" ? a.entrants !== b.entrants : a.date !== b.date && a.name !== b.name) return { question, a, b };
  }
  return null;
}

/** Which side is right: more entrants, or the earlier date. */
export const hlAnswer = (r: HlRound): "a" | "b" => (r.question === "entrants" ? (r.a.entrants > r.b.entrants ? "a" : "b") : r.a.date < r.b.date ? "a" : "b");

/** The guesses saved in the browser for a day's puzzle (none when they're another day's, or unreadable). */
export function savedGuesses(stored: string, day: number): string[] {
  try {
    const v = JSON.parse(stored) as { day?: unknown; guesses?: unknown };
    return v.day === day && Array.isArray(v.guesses) ? v.guesses.filter((g): g is string => typeof g === "string") : [];
  } catch {
    return [];
  }
}

// ---------- Guess the player ----------

export const PLAYER_TRIES = 6;
/** A player as a choice: `slug` is their key (start.gg player id, or "name:<key>" without one). */
export type PlayerOption = { slug: string; name: string; wins: number; top8s: number; firstYear: number; lastYear: number; main: string | null; mainName: string | null };

/** Players who can be the day's answer: a major win, or at least six top 8s. In a fixed order. */
export const playerPuzzlePool = (players: PlayerOption[]) => players.filter((p) => p.wins >= 1 || p.top8s >= 6).sort((a, b) => a.slug.localeCompare(b.slug));

/** The games take turns by day; the two biggest come up most. */
export const PLAYER_GAME_TURNS: GameKey[] = ["melee", "ultimate", "smash4", "melee", "ultimate", "pplus", "melee", "ultimate", "brawl", "smash64"];
export const playerGameOfDay = (day: number): GameKey => PLAYER_GAME_TURNS[(day - 1) % PLAYER_GAME_TURNS.length];

/** What a guess tells the player. `main`: null when either player's most-played character isn't known. */
export function playerHint(guess: PlayerOption, answer: PlayerOption) {
  return {
    right: guess.slug === answer.slug,
    wins: compare(guess.wins, answer.wins),
    top8s: compare(guess.top8s, answer.top8s),
    firstYear: compare(guess.firstYear, answer.firstYear),
    lastYear: compare(guess.lastYear, answer.lastYear),
    main: guess.main && answer.main ? guess.main === answer.main : null,
  };
}

// ---------- Who won this set? ----------

export const SETS_PER_ROUND = 10;
export type SetSide = { name: string; characters: string[]; score: number };
export type ArcadeSet = { id: string; major: string; year: number; game: GameKey; round: string; a: SetSide; b: SetSide; winner: "a" | "b" };

/** Up to `n` different items, picked with `rand` (0..1 numbers). */
export function pickSome<T>(items: readonly T[], n: number, rand: () => number): T[] {
  const left = [...items];
  const out: T[] = [];
  while (out.length < n && left.length) out.push(left.splice(Math.floor(rand() * left.length), 1)[0]);
  return out;
}

/** "7/10" with a square per set, to share. */
export const setsShare = (answers: boolean[]) => `${answers.map((r) => (r ? "🟩" : "🟥")).join("")} ${answers.filter(Boolean).length}/${answers.length}`;

/** Heads or tails from `rand`. */
export const coin = (rand: () => number) => rand() < 0.5;
