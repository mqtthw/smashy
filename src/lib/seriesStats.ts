// A weekly series across all its editions: who keeps coming, who keeps winning, and who keeps
// playing each other. Plain logic (no database), so it can be tested.
//
// People are matched across editions by a "key": a player with an account is their account id;
// a walk-in (or a doubles team) has a new id every week, so they're matched by name instead.

export type SeriesPerson = { key: string; name: string; handle: string | null };

/** One person's entry in one edition, with their place once it finished (null = not placed). */
export type SeriesEntry = SeriesPerson & { eventId: string; place: number | null };

/** A finished set, with both sides already turned into keys. */
export type SeriesSet = { a: string; b: string; winner: 1 | 2 };

export type SeriesEdition = { id: string; name: string; startsAt: string; status: string; entries: number };

/** The key a walk-in or team goes by: its name, trimmed, any letter case. */
export const nameKey = (name: string) => `name:${name.trim().toLowerCase()}`;

/** "Weekly #12" -> "Weekly"; a name without a number stays as it is. */
export function seriesName(editionName: string): string {
  return editionName.replace(/\s*#\s*\d+\s*$/, "").trim() || editionName;
}

/** The short label of an edition: its "#12", or its place in the series if the name has no number. */
export function editionLabel(name: string, index: number): string {
  return [...name.matchAll(/#\s*(\d+)/g)].pop()?.[0].replace(/\s+/g, "") ?? `#${index + 1}`;
}

export type SeriesPlayerRow = SeriesPerson & { editions: number; gold: number; silver: number; bronze: number; top8: number; best: number | null };

/**
 * Everyone who played, with how often they came and how they did. Medals first (most 1st places,
 * then 2nd, then 3rd), then most top 8s, then most editions played. Shared places count for everyone tied.
 */
export function seriesPlayers(entries: SeriesEntry[]): SeriesPlayerRow[] {
  const rows = new Map<string, SeriesPlayerRow & { seen: Set<string> }>();
  for (const e of entries) {
    const r = rows.get(e.key) ?? { key: e.key, name: e.name, handle: e.handle, editions: 0, gold: 0, silver: 0, bronze: 0, top8: 0, best: null, seen: new Set<string>() };
    if (!r.seen.has(e.eventId)) {
      r.seen.add(e.eventId);
      r.editions++;
      if (e.place) {
        if (e.place === 1) r.gold++;
        else if (e.place === 2) r.silver++;
        else if (e.place === 3) r.bronze++;
        if (e.place <= 8) r.top8++;
        r.best = r.best === null ? e.place : Math.min(r.best, e.place);
      }
    }
    if (!r.handle && e.handle) r.handle = e.handle;
    rows.set(e.key, r);
  }
  return [...rows.values()]
    .map(({ seen: _seen, ...r }) => (void _seen, r))
    .sort((a, b) => b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze || b.top8 - a.top8 || b.editions - a.editions || a.name.localeCompare(b.name));
}

export type Rivalry = { a: string; b: string; aWins: number; bWins: number; sets: number };

/**
 * The pairs who met most often, with each side's wins. Only pairs who played at least `min` sets;
 * the closest records first among pairs with the same number of sets.
 */
export function rivalries(sets: SeriesSet[], min = 2, top = 5): Rivalry[] {
  const pairs = new Map<string, Rivalry>();
  for (const s of sets) {
    if (!s.a || !s.b || s.a === s.b) continue;
    const [x, y] = s.a < s.b ? [s.a, s.b] : [s.b, s.a];
    const winnerKey = s.winner === 1 ? s.a : s.b;
    const p = pairs.get(`${x}|${y}`) ?? { a: x, b: y, aWins: 0, bWins: 0, sets: 0 };
    p.sets++;
    if (winnerKey === x) p.aWins++;
    else p.bWins++;
    pairs.set(`${x}|${y}`, p);
  }
  return [...pairs.values()]
    .filter((p) => p.sets >= min)
    .sort((p, q) => q.sets - p.sets || Math.abs(p.aWins - p.bWins) - Math.abs(q.aWins - q.bWins) || p.a.localeCompare(q.a))
    .slice(0, top);
}

export type SeriesSummary = {
  held: number; // finished editions
  average: number | null; // entries per finished edition, rounded
  record: { label: string; entries: number } | null; // the best-attended finished edition
  winners: number; // different people who won one
  streak: { key: string; wins: number } | null; // the champion of the latest finished edition, and how many in a row
};

/**
 * The headline numbers. `editions` oldest first; `winnersById` = the key of who placed 1st in each
 * finished edition (shared 1st places aren't a thing in a bracket, so one key each).
 */
export function seriesSummary(editions: SeriesEdition[], winnersById: Map<string, string>): SeriesSummary {
  const done = editions.filter((e) => e.status === "completed");
  const held = done.length;
  const average = held ? Math.round(done.reduce((n, e) => n + e.entries, 0) / held) : null;
  let record: SeriesSummary["record"] = null;
  done.forEach((e) => {
    if (!record || e.entries > record.entries) record = { label: editionLabel(e.name, editions.indexOf(e)), entries: e.entries };
  });
  const winners = new Set(done.map((e) => winnersById.get(e.id)).filter(Boolean)).size;
  let streak: SeriesSummary["streak"] = null;
  const last = done.length ? winnersById.get(done[done.length - 1].id) : undefined;
  if (last) {
    let wins = 0;
    for (let i = done.length - 1; i >= 0 && winnersById.get(done[i].id) === last; i--) wins++;
    streak = { key: last, wins };
  }
  return { held, average, record, winners, streak };
}
