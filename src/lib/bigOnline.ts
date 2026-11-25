// "Big online brackets" at the top of Events → Online (round 844, Matthew: "Why isn't melee cashbox
// featured on the online events page? Huge online tourneys like this should be featured"). The Cashbox
// (201 players) was one row among about 100. Plain logic, so it can be tested.

/** Players a bracket needs to count as big. */
export const BIG_ONLINE_MIN = 100;

type Row = { startAt: number; finished?: boolean; games: { entrants: number | null }[] };

/** Its biggest game's player count. */
export const playersIn = (r: Row) => Math.max(0, ...r.games.map((g) => g.entrants ?? 0));

/** The biggest online brackets running now or starting in the next `days` days, biggest first, at most `max`. */
export function bigOnline<T extends Row>(rows: T[], nowSec: number, min = BIG_ONLINE_MIN, days = 7, max = 6): T[] {
  return rows
    .filter((r) => !r.finished && playersIn(r) >= min && r.startAt <= nowSec + days * 86400)
    .sort((a, b) => playersIn(b) - playersIn(a))
    .slice(0, max);
}
