// The past-tournament finder (on the Brackets page, /brackets): what the page asked for, and how the tournaments start.gg
// returned are filtered by size and sorted. start.gg can search finished tournaments by region, name, game
// and dates, but not by size, so the entrant minimum and "biggest first" are done here. Plain logic, tested.
import { isGameKey, type GameKey } from "./games";
import { isRegion } from "./regions";
import type { SmashyTournament } from "./startgg";

/** start.gg's records start around 2015; the year list runs from there to this year. */
export const FIRST_PAST_YEAR = 2015;
export const MIN_ENTRANTS = [0, 16, 32, 64, 100, 200, 500] as const;
export type PastSort = "newest" | "biggest";

export type PastQuery = { region: string | null; name: string | null; game: GameKey | null; year: number | null; min: number; sort: PastSort };

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

/** The finder's search from the page address; anything unknown is dropped. */
export function readPastQuery(sp: Record<string, string | string[] | undefined>, thisYear: number): PastQuery {
  const name = (one(sp.q) ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
  const year = Number(one(sp.year));
  const min = Number(one(sp.min));
  return {
    region: isRegion(one(sp.region)) ? one(sp.region)! : null,
    name: name.length >= 2 ? name : null,
    game: isGameKey(one(sp.game)) ? (one(sp.game) as GameKey) : null,
    year: Number.isInteger(year) && year >= FIRST_PAST_YEAR && year <= thisYear ? year : null,
    min: (MIN_ENTRANTS as readonly number[]).includes(min) ? min : 0,
    sort: one(sp.sort) === "biggest" ? "biggest" : "newest",
  };
}

/** Searching all of start.gg would read only its newest few hundred tournaments: a region or a name is needed. */
export const canSearch = (q: PastQuery) => !!q.region || !!q.name;

/** A tournament's biggest bracket in the game asked for (any of Smashy's games when none). */
export function biggestBracket(t: SmashyTournament, game: GameKey | null): number {
  return Math.max(0, ...t.events.filter((e) => !game || e.game === game).map((e) => e.numEntrants ?? 0));
}

/** Tournaments with a bracket of at least `min` entrants in the game, newest or biggest first. */
export function pastRows(tournaments: SmashyTournament[], q: Pick<PastQuery, "game" | "min" | "sort">): SmashyTournament[] {
  const kept = tournaments.filter((t) => biggestBracket(t, q.game) >= Math.max(1, q.min));
  return q.sort === "biggest"
    ? [...kept].sort((a, b) => biggestBracket(b, q.game) - biggestBracket(a, q.game) || b.startAt - a.startAt)
    : [...kept].sort((a, b) => b.startAt - a.startAt);
}
