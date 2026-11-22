// Leagues, step L2 (docs/leagues-plan.md): splitting players into divisions and the weekly schedule.
// Pure functions, unit-tested; shared by server and browser code.

/**
 * A suggested split into `count` divisions by seed: Division 1 holds the best seeds, and sizes differ
 * by at most one (the bigger divisions come first). Players without a seed go last, in sign-up order.
 */
export function suggestDivisions<T extends { seed: number | null }>(players: T[], count: number): T[][] {
  const n = Math.max(1, Math.min(Math.floor(count), players.length || 1));
  const sorted = players
    .map((p, i) => ({ p, i }))
    .sort((a, b) => (a.p.seed ?? Infinity) - (b.p.seed ?? Infinity) || a.i - b.i)
    .map((x) => x.p);
  const out: T[][] = [];
  let at = 0;
  for (let d = 0; d < n; d++) {
    const size = Math.floor(sorted.length / n) + (d < sorted.length % n ? 1 : 0);
    out.push(sorted.slice(at, at + size));
    at += size;
  }
  return out;
}

/** How many divisions to suggest: about 8 players each (6 to 10), never more than there are pairs. */
export function suggestedDivisionCount(players: number): number {
  if (players < 2) return 1;
  return Math.max(1, Math.min(Math.round(players / 8), Math.floor(players / 2)));
}

export type Pairing = [string, string]; // two player ids

/**
 * The weekly pairings of one division: a round robin (the circle method), so everyone meets everyone
 * once before anyone meets someone twice. With more weeks than rounds it starts over (sides swapped).
 * An odd-sized division gets a bye each week: that player simply has no set. Week i is out[i].
 */
export function roundRobinWeeks(ids: string[], weeks: number): Pairing[][] {
  const players: (string | null)[] = [...ids];
  if (players.length < 2) return Array.from({ length: weeks }, () => []);
  if (players.length % 2) players.push(null); // the bye
  const n = players.length;
  const rounds = n - 1;
  const out: Pairing[][] = [];
  for (let w = 0; w < weeks; w++) {
    const r = w % rounds;
    const swap = Math.floor(w / rounds) % 2 === 1; // the second time through, sides swap
    // Fix the first player; rotate the rest by r.
    const rest = players.slice(1);
    const rotated = [...rest.slice(rest.length - r), ...rest.slice(0, rest.length - r)];
    const line = [players[0], ...rotated];
    const week: Pairing[] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = line[i];
      const b = line[n - 1 - i];
      if (a === null || b === null) continue;
      // Alternate who is listed first, so no one is always "player 1".
      const first = (i + r) % 2 === 0 ? a : b;
      const second = first === a ? b : a;
      week.push(swap ? [second, first] : [first, second]);
    }
    out.push(week);
  }
  return out;
}

/** When week `week` (1-based) closes: the league's start plus that many weeks, minus a second. */
export function weekDeadline(startsAtMs: number, week: number): Date {
  return new Date(startsAtMs + week * 7 * 86400_000 - 1000);
}
