// Smash history: a year's tally per game (Matthew, 2026-11-17: tallies, not rankings). Counted from the
// year's saved majors: each major's main in-person singles event of the game, and who placed 1st,
// 2nd and top 8. Facts only; the community's own rankings are linked next to it (communityRankings.ts).
import type { GameKey } from "./games";
import type { MajorEvent } from "./majorEvents";
import { pickMainEvent } from "./mainEvent";

/** `key` is the start.gg player id, or "name:<name>" for results added by hand (no player id). */
export type TallyRow = { key: string; playerId: string | null; name: string; wins: number; seconds: number; top8s: number };

/** The main bracket of a game at one major: its main in-person singles event with a top 8 (pickMainEvent). */
function mainEvent(events: MajorEvent[], game: GameKey): MajorEvent | null {
  return pickMainEvent(events.filter((e) => e.game === game && !e.teams && !e.online && e.top8.length)) ?? null;
}

/**
 * Counts one game over a year's majors (newest first, so a player's name is their latest one).
 * `majors` is how many majors had that game's results saved, with a main bracket of at least
 * `minEntrants` (the game's major size). Sorted by wins, 2nd places, then top 8s.
 */
export function yearTally(byMajor: MajorEvent[][], game: GameKey, minEntrants = 0): { majors: number; rows: TallyRow[] } {
  const rows = new Map<string, TallyRow>();
  let majors = 0;
  for (const events of byMajor) {
    const main = mainEvent(events, game);
    // A small side bracket of this game at another game's major doesn't count (unknown size: it does).
    // Majors added by hand (before start.gg: Liquipedia's own list of majors) count whatever their size:
    // scenes were smaller then.
    const handAdded = main?.eventId.startsWith("manual-");
    if (!main || (!handAdded && main.entrants !== null && main.entrants < minEntrants)) continue;
    majors++;
    // A team's top 8 has no player id and isn't counted (only singles brackets get here); results added
    // by hand (before start.gg) have no ids either, so they're counted by name.
    for (const r of main.top8) {
      const key = r.playerId ?? `name:${r.name.trim().toLowerCase()}`;
      const row = rows.get(key) ?? { key, playerId: r.playerId, name: r.name, wins: 0, seconds: 0, top8s: 0 };
      row.top8s++;
      if (r.place === 1) row.wins++;
      if (r.place === 2) row.seconds++;
      rows.set(key, row);
    }
  }
  const sorted = [...rows.values()].sort((a, b) => b.wins - a.wins || b.seconds - a.seconds || b.top8s - a.top8s || a.name.localeCompare(b.name));
  return { majors, rows: sorted };
}
