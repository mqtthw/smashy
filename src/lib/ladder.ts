// The online ladder: seasons, the rating math (it mirrors the database's, which is what counts), and
// reading a reported score. Plain logic, so it can be tested.
import type { GameKey } from "./games";

export const START_RATING = 1000;
export const K = 32; // the most a single match can move a rating
export const MIN_MATCHES = 3; // matches before someone shows up in the standings
export const QUEUE_MINUTES = 30;

/** The season a moment falls in, like "2026-Q4" (October to December, UTC). */
export function seasonOf(at: Date): string {
  return `${at.getUTCFullYear()}-Q${Math.floor(at.getUTCMonth() / 3) + 1}`;
}

const NAMES = ["Winter", "Spring", "Summer", "Fall"];
/** "Fall 2026" for 2026-Q4. */
export function seasonName(season: string): string {
  const m = /^(\d{4})-Q([1-4])$/.exec(season);
  return m ? `${NAMES[Number(m[2]) - 1]} ${m[1]}` : season;
}

/** When a season ends (the first moment of the next one). */
export function seasonEnds(season: string): Date | null {
  const m = /^(\d{4})-Q([1-4])$/.exec(season);
  return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) * 3, 1)) : null;
}

/** Last season, for "last season's standings". */
export function previousSeason(season: string): string | null {
  const m = /^(\d{4})-Q([1-4])$/.exec(season);
  if (!m) return null;
  const q = Number(m[2]);
  return q === 1 ? `${Number(m[1]) - 1}-Q4` : `${m[1]}-Q${q - 1}`;
}

/** Points the first player gains (the second loses the same): Elo with K = 32. */
export function ratingChange(r1: number, r2: number, p1Won: boolean): number {
  const expected = 1 / (1 + 10 ** ((r2 - r1) / 400));
  return Math.round(K * ((p1Won ? 1 : 0) - expected));
}

/** A best-of-3 score from the reporter's side, or why it can't be. */
export function readScore(mine: unknown, theirs: unknown): { mine: number; theirs: number } | { error: string } {
  const a = Number(mine), b = Number(theirs);
  if (!Number.isInteger(a) || !Number.isInteger(b) || Math.max(a, b) !== 2 || Math.min(a, b) < 0 || Math.min(a, b) > 1) return { error: "A best of 3 ends 2–0 or 2–1." };
  return { mine: a, theirs: b };
}

export type Standing = { userId: string; rating: number; wins: number; losses: number };

/** Standings best first: players with enough matches, ranked by rating (ties share a place, more wins first). */
export function rankStandings<T extends Standing>(rows: T[], min = MIN_MATCHES): (T & { rank: number })[] {
  const shown = rows.filter((r) => r.wins + r.losses >= min).sort((a, b) => b.rating - a.rating || b.wins - a.wins || a.userId.localeCompare(b.userId));
  let rank = 0;
  return shown.map((r, i) => {
    if (i === 0 || r.rating !== shown[i - 1].rating) rank = i + 1;
    return { ...r, rank };
  });
}

/** The games with a ladder (the ones with Play lobbies). */
export const LADDER_GAMES = ["melee", "ultimate", "pplus"] as const satisfies readonly GameKey[];
export type LadderGame = (typeof LADDER_GAMES)[number];
export const isLadderGame = (g: unknown): g is LadderGame => typeof g === "string" && (LADDER_GAMES as readonly string[]).includes(g);

/** What to type as your netplay code, per game. */
export const CONNECT_HINT: Record<LadderGame, string> = {
  melee: "Your Slippi connect code, like ABCD#123",
  ultimate: "Your Switch friend code (SW-1234-5678-9012) or arena ID",
  pplus: "Your Dolphin netplay code or Slippi code",
};
