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

// A chain (round 982, Matthew: "needs to be relooked to be more interesting"): one card stays on screen with its
// number showing, the next card's number is hidden, and the player says higher or lower. A right answer slides
// the new card over and deals another. The topic (a major's entrants, a player's major wins or top 8s) changes
// every HL_TOPIC_LEN right answers, and the pairs get closer as the streak grows.

/** What the cards are compared on. Majors have entrants; players have major wins and top 8s. */
export type HlStat = "entrants" | "wins" | "top8s";
export const HL_STATS: readonly HlStat[] = ["entrants", "wins", "top8s"];
/** A card: a major (`year` set, `entrants`) or a player (`wins`, `top8s`). `id` is unique in the pool. */
export type HlCard = { id: string; name: string; game: GameKey; year: number | null; entrants?: number; wins?: number; top8s?: number };
export const HL_TOPIC_LEN = 5;

export const hlValue = (card: HlCard, stat: HlStat): number | undefined => card[stat];

/** The bigger half of each game's majors (by entrants), so the names are ones people know. */
export function hlMajorCards(majors: ArcadeMajor[]): HlCard[] {
  const out: HlCard[] = [];
  const games = [...new Set(majors.map((m) => m.game))];
  for (const game of games) {
    const list = majors.filter((m): m is ArcadeMajor & { entrants: number } => m.game === game && !!m.entrants);
    const sizes = list.map((m) => m.entrants).sort((a, b) => a - b);
    const median = sizes[Math.floor(sizes.length / 2)] ?? 0;
    for (const m of list) if (m.entrants >= median) out.push({ id: `m:${game}:${m.slug}`, name: m.name, game, year: yearOf(m.date), entrants: m.entrants });
  }
  return out;
}

/** The topics this pool can play: those with at least six cards. */
export const hlStats = (pool: HlCard[]): HlStat[] => HL_STATS.filter((s) => pool.filter((c) => hlValue(c, s) !== undefined).length >= 6);

const pickOne = <T>(items: readonly T[], rand: () => number): T | null => (items.length ? items[Math.min(items.length - 1, Math.floor(rand() * items.length))] : null);

/**
 * The next card to compare against `current` on `stat`: never the same number (no ties), never one in `used`.
 * The longer the streak, the closer its number is to the current one (nearest share of the cards, from all of
 * them at 0 down to the nearest sixth). With no `current`, any card with that number. Null when none is left.
 */
export function hlNext(pool: HlCard[], stat: HlStat, current: HlCard | null, used: ReadonlySet<string>, streak: number, rand: () => number): HlCard | null {
  const cv = current ? hlValue(current, stat) : undefined;
  const fits = pool.filter((c) => {
    const v = hlValue(c, stat);
    return v !== undefined && !used.has(c.id) && c.id !== current?.id && v !== cv;
  });
  if (cv === undefined) return pickOne(fits, rand);
  const far = (c: HlCard) => Math.abs(Math.log1p(hlValue(c, stat)!) - Math.log1p(cv));
  const near = [...fits].sort((a, b) => far(a) - far(b) || a.id.localeCompare(b.id));
  const share = Math.max(1 / 6, 1 - streak / 15);
  return pickOne(near.slice(0, Math.max(Math.min(near.length, 4), Math.ceil(near.length * share))), rand);
}

/** The topic after `streak` right answers: a different one every HL_TOPIC_LEN, else the same. */
export function hlTopic(stats: readonly HlStat[], current: HlStat, streak: number, rand: () => number): HlStat {
  if (streak === 0 || streak % HL_TOPIC_LEN !== 0) return current;
  return pickOne(stats.filter((s) => s !== current), rand) ?? current;
}

/** A fresh start: a random topic and its first two cards. Null when the pool can't make one. */
export function hlStart(pool: HlCard[], rand: () => number): { stat: HlStat; left: HlCard; right: HlCard } | null {
  const stat = pickOne(hlStats(pool), rand);
  if (!stat) return null;
  const left = hlNext(pool, stat, null, new Set(), 0, rand);
  const right = left && hlNext(pool, stat, left, new Set(), 0, rand);
  return left && right ? { stat, left, right } : null;
}

/** Whether "higher" is the right call for `next` against `shown`. */
export const hlIsHigher = (shown: HlCard, next: HlCard, stat: HlStat) => (hlValue(next, stat) ?? 0) > (hlValue(shown, stat) ?? 0);

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
export type PlayerOption = { slug: string; name: string; wins: number; top8s: number; firstYear: number; lastYear: number; main: string | null; mainName: string | null; mainIcon?: string | null; country?: string | null; place?: string | null };

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
    region: regionHint(guess, answer),
  };
}

/**
 * Where a guess is from, against the answer: the same place (state, prefecture, ...), the same country only, or
 * another country. Null when either's country isn't known. Places are compared as written, so two spellings of
 * one place ("NY", "New York") only count as the same country: it never says "different" wrongly.
 */
export type RegionHint = "place" | "country" | "other" | null;
export function regionHint(guess: Pick<PlayerOption, "country" | "place">, answer: Pick<PlayerOption, "country" | "place">): RegionHint {
  if (!guess.country || !answer.country) return null;
  if (guess.country !== answer.country) return "other";
  const same = (a?: string | null, b?: string | null) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
  return same(guess.place, answer.place) ? "place" : "country";
}

// ---------- Who won this set? ----------

export const SETS_PER_ROUND = 10;
export type SetSide = { name: string; characters: string[]; icons: string[]; score: number };
export type ArcadeSet = { id: string; major: string; href: string; year: number; game: GameKey; round: string; a: SetSide; b: SetSide; winner: "a" | "b" };

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

// ---------- Streaks and scores (round 945: kept in the visitor's browser) ----------

/** A daily puzzle's record in one browser: the last day finished, whether it was solved, and the run of solved days. */
export type DailyStats = { last: number; won: boolean; streak: number; best: number; played: number; wins: number };
const NO_STATS: DailyStats = { last: 0, won: false, streak: 0, best: 0, played: 0, wins: 0 };

export function readStats(stored: string): DailyStats {
  try {
    const v = JSON.parse(stored) as Partial<DailyStats>;
    const n = (x: unknown) => (typeof x === "number" && Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0);
    return { last: n(v.last), won: v.won === true, streak: n(v.streak), best: n(v.best), played: n(v.played), wins: n(v.wins) };
  } catch {
    return NO_STATS;
  }
}

/** The record after finishing a day's puzzle. A day counts once; a miss or a skipped day ends the streak. */
export function addResult(stats: DailyStats, day: number, won: boolean): DailyStats {
  if (stats.last >= day) return stats;
  const streak = won ? (stats.last === day - 1 && stats.won ? stats.streak + 1 : 1) : 0;
  return { last: day, won, streak, best: Math.max(stats.best, streak), played: stats.played + 1, wins: stats.wins + (won ? 1 : 0) };
}

/** The streak still alive today: yesterday's run counts until today's puzzle is missed or skipped. */
export const liveStreak = (stats: DailyStats, day: number) => (stats.won && stats.last >= day - 1 ? stats.streak : 0);

/** Milliseconds until the next puzzle (midnight UTC). */
export const untilNextPuzzle = (nowMs: number) => DAY_MS - (((nowMs - ARCADE_FIRST_DAY) % DAY_MS) + DAY_MS) % DAY_MS;

/** "07:04:09" */
export function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, "0")).join(":");
}

/** How a score out of ten in "Who won this set?" is greeted. */
export type SetsRank = "perfect" | "top8" | "pools" | "out";
export const setsRank = (right: number, total: number): SetsRank => (right >= total ? "perfect" : right >= total * 0.8 ? "top8" : right >= total * 0.5 ? "pools" : "out");
