// A start.gg player's career view: their placements at recent events, and a quick way to search their
// sets. Plain logic (no start.gg), so it can be tested.
import type { GameKey } from "./games";
import type { PlayerSet } from "./playerStats";

export type PlayerResult = {
  eventId: string;
  eventName: string;
  tournament: string;
  tournamentSlug: string | null;
  entrants: number;
  startAt: number | null; // unix seconds
  game: GameKey | null;
  placement: number;
  doubles: boolean;
};

export type ResultsSummary = { events: number; wins: number; top8: number; bestBig: { placement: number; result: PlayerResult } | null };

/** How many events, wins and top 8s; and the best finish at an event of at least `big` entrants. Singles only. */
export function summarizeResults(results: PlayerResult[], big = 64): ResultsSummary {
  const singles = results.filter((r) => !r.doubles);
  let bestBig: ResultsSummary["bestBig"] = null;
  for (const r of singles) {
    if (r.entrants < big) continue;
    if (!bestBig || r.placement < bestBig.placement || (r.placement === bestBig.placement && r.entrants > bestBig.result.entrants)) bestBig = { placement: r.placement, result: r };
  }
  return { events: singles.length, wins: singles.filter((r) => r.placement === 1).length, top8: singles.filter((r) => r.placement <= 8).length, bestBig };
}

/** "1st", "2nd", "3rd", "4th", "11th", "21st". */
export function ordinal(n: number): string {
  return n % 100 >= 11 && n % 100 <= 13 ? `${n}th` : `${n}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
}

/**
 * The sets matching a search: the opponent's tag, a character either player used, or the
 * tournament's name, any letter case. An empty search matches everything.
 */
export function filterSets(sets: PlayerSet[], query: string): PlayerSet[] {
  const q = query.trim().toLowerCase();
  if (!q) return sets;
  return sets.filter(
    (s) =>
      s.opp.tag.toLowerCase().includes(q) ||
      s.tournamentName.toLowerCase().includes(q) ||
      s.myCharacters.some((c) => c.toLowerCase().includes(q)) ||
      s.oppCharacters.some((c) => c.toLowerCase().includes(q)),
  );
}

/** Saved and fresh results together (fresh wins for the same event), newest first. */
export function mergeResults(saved: PlayerResult[], fresh: PlayerResult[]): PlayerResult[] {
  const byId = new Map(saved.map((r) => [r.eventId, r]));
  for (const r of fresh) byId.set(r.eventId, r);
  return [...byId.values()].sort((a, b) => (b.startAt ?? 0) - (a.startAt ?? 0));
}
