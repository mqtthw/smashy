// Seasons: the plain maths behind a scene's standings (points per placement, best N events, merged
// players, the minimum to be ranked), kept apart from the database so it can be tested.

/** [from place, points], best place first: everyone placing at `from` or worse (until the next row) gets `points`. */
export type PointsRow = [number, number];

export const DEFAULT_POINTS: PointsRow[] = [
  [1, 100], [2, 80], [3, 65], [4, 55], [5, 45], [7, 35], [9, 25], [13, 18], [17, 12], [25, 8], [33, 5], [49, 3], [65, 2], [97, 1],
];

export const SEASON_LIMITS = { seasonsPerMember: 10, eventsPerSeason: 200, playersPerEvent: 512 };

/** Points for a placement (0 when the table doesn't reach it). */
export function pointsFor(place: number, table: PointsRow[]): number {
  let pts = 0;
  for (const [from, p] of table) {
    if (place >= from) pts = p;
    else break;
  }
  return pts;
}

/** The table as people type it: one "place: points" per line or comma ("1: 100, 2: 80, 5: 45"). Null if it doesn't read. */
export function readPointsTable(text: string): PointsRow[] | null {
  const rows: PointsRow[] = [];
  for (const part of String(text ?? "").split(/[\n,;]+/)) {
    const s = part.trim();
    if (!s) continue;
    const m = s.match(/^(\d{1,4})\s*(?:st|nd|rd|th|e|er|º|\.º|位)?\s*[:=\-–→]\s*(\d{1,5}(?:\.\d)?)$/i);
    if (!m) return null;
    const from = Number(m[1]);
    const pts = Number(m[2]);
    if (from < 1 || from > 4096 || pts < 0 || pts > 10000) return null;
    rows.push([from, pts]);
  }
  if (!rows.length || rows.length > 40) return null;
  rows.sort((a, b) => a[0] - b[0]);
  if (new Set(rows.map((r) => r[0])).size !== rows.length) return null;
  return rows;
}

/** The table written back as text, one row per line ("1: 100"). */
export const writePointsTable = (table: PointsRow[]) => table.map(([from, p]) => `${from}: ${p}`).join("\n");

export type SeasonResult = { key: string; name: string; place: number };
export type SeasonEventData = { id: string; name: string; heldOn: string; weight: number; results: SeasonResult[] };
export type PlayerOverride = { key: string; displayName: string | null; mergedInto: string | null; leftOut: boolean };

export type PlayerEvent = { eventId: string; eventName: string; heldOn: string; place: number; points: number; counted: boolean };
export type StandingRow = {
  key: string; // the player's key after merges
  name: string;
  rank: number | null; // null: fewer events than the minimum
  points: number;
  events: number;
  best: number;
  results: PlayerEvent[]; // newest first
  /** Every entry that counts as this player (their own key plus anything merged into it). */
  keys: string[];
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Follows "merged into" links to the entry a player now counts as (stops on loops). */
export function rootOf(key: string, mergedInto: Map<string, string>): string {
  let cur = key;
  const seen = new Set<string>();
  while (mergedInto.has(cur) && !seen.has(cur) && seen.size < 20) {
    seen.add(cur);
    cur = mergedInto.get(cur)!;
  }
  return cur;
}

/**
 * The season's standings. Merged entries count as one player (their best placement if both played the
 * same event); left-out players aren't listed; with `bestOf`, only a player's best N events count; players
 * with fewer than `minEvents` events are listed after the ranked ones, without a rank. Ties share a rank.
 */
export function computeStandings(opts: {
  events: SeasonEventData[];
  overrides: PlayerOverride[];
  points: PointsRow[];
  bestOf: number | null;
  minEvents: number;
  /** Extra merges that apply unless an admin set one (a member linked to their start.gg player). */
  autoMerge?: Map<string, string>;
}): StandingRow[] {
  const merged = new Map<string, string>(opts.autoMerge ?? []);
  const names = new Map<string, string>();
  const leftOut = new Set<string>();
  for (const o of opts.overrides) {
    if (o.mergedInto) merged.set(o.key, o.mergedInto); // (a linked start.gg player stays with its member)
    if (o.displayName?.trim()) names.set(o.key, o.displayName.trim());
    if (o.leftOut) leftOut.add(o.key);
  }

  // A player's name: the newest one they played under; for merged entries, the newest under the entry they now count as.
  const byPlayer = new Map<string, { lastName: string; lastDate: string; ownName: string | null; results: PlayerEvent[]; keys: Set<string> }>();
  const events = [...opts.events].sort((a, b) => b.heldOn.localeCompare(a.heldOn) || a.id.localeCompare(b.id));
  for (const e of events) {
    const bestHere = new Map<string, SeasonResult>();
    for (const r of e.results) {
      if (!(r.place >= 1)) continue;
      const root = rootOf(r.key, merged);
      const prev = bestHere.get(root);
      if (!prev || r.place < prev.place) bestHere.set(root, r);
    }
    for (const [root, r] of bestHere) {
      const p = byPlayer.get(root) ?? { lastName: r.name, lastDate: e.heldOn, ownName: null, results: [], keys: new Set([root]) };
      if (e.heldOn > p.lastDate) Object.assign(p, { lastName: r.name, lastDate: e.heldOn });
      if (r.key === root) p.ownName ??= r.name; // events are newest first
      p.results.push({ eventId: e.id, eventName: e.name, heldOn: e.heldOn, place: r.place, points: round1(pointsFor(r.place, opts.points) * e.weight), counted: true });
      byPlayer.set(root, p);
    }
    for (const r of e.results) byPlayer.get(rootOf(r.key, merged))?.keys.add(r.key);
  }

  const rows: StandingRow[] = [];
  for (const [key, p] of byPlayer) {
    if (leftOut.has(key)) continue;
    if (opts.bestOf && p.results.length > opts.bestOf) {
      const keep = new Set([...p.results].sort((a, b) => b.points - a.points || a.place - b.place).slice(0, opts.bestOf));
      for (const r of p.results) r.counted = keep.has(r);
    }
    rows.push({
      key,
      name: names.get(key) ?? p.ownName ?? p.lastName,
      rank: null,
      points: round1(p.results.filter((r) => r.counted).reduce((s, r) => s + r.points, 0)),
      events: p.results.length,
      best: Math.min(...p.results.map((r) => r.place)),
      results: p.results,
      keys: [...p.keys],
    });
  }
  rows.sort((a, b) => {
    const ra = a.events >= opts.minEvents ? 0 : 1;
    const rb = b.events >= opts.minEvents ? 0 : 1;
    return ra - rb || b.points - a.points || a.best - b.best || a.name.localeCompare(b.name);
  });
  let rank = 0;
  rows.forEach((r, i) => {
    if (r.events < opts.minEvents) return;
    if (i === 0 || r.points !== rows[i - 1].points) rank = i + 1;
    r.rank = rank;
  });
  return rows;
}

/** A player key from a Smashy member, a start.gg player or a walk-in tag. */
export const memberKey = (userId: string) => `u:${userId}`;
export const startggKey = (playerId: string | number) => `s:${playerId}`;
export const walkInKey = (tag: string) => `g:${tag.trim().toLowerCase().slice(0, 60)}`;
export const isPlayerKey = (key: unknown): key is string => typeof key === "string" && /^(u:[0-9a-f-]{36}|s:\d{1,15}|g:.{1,60})$/.test(key);

/** Standings as a spreadsheet file (CSV). */
/**
 * The standings as a spreadsheet: rank, player, points, events, best finish, then (with `events`) one
 * column per event, oldest first, holding where the player placed in it (blank if they weren't there).
 * That last part is what a PR panel works from.
 */
export function standingsCsv(rows: StandingRow[], hidden: (r: StandingRow) => boolean, hiddenName: string, events: { id: string; name: string; heldOn: string }[] = []): string {
  const cell = (v: string | number) => {
    const s = String(v);
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s; // a spreadsheet won't run it as a formula
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const cols = [...events].sort((a, b) => a.heldOn.localeCompare(b.heldOn) || a.name.localeCompare(b.name));
  const lines = [["rank", "player", "points", "events", "best", ...cols.map((e) => `${e.heldOn} ${e.name}`)].map(cell).join(",")];
  for (const r of rows) {
    // A player merged from two entries could have two places in one event: the better one counts.
    const placeIn = new Map<string, number>();
    for (const x of r.results) placeIn.set(x.eventId, Math.min(x.place, placeIn.get(x.eventId) ?? Infinity));
    lines.push([r.rank ?? "", hidden(r) ? hiddenName : r.name, r.points, r.events, r.best, ...cols.map((e) => placeIn.get(e.id) ?? "")].map(cell).join(","));
  }
  return lines.join("\r\n") + "\r\n";
}

const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

/**
 * The standings as text to paste anywhere (Discord, a post): the season's name, the top ranked players with
 * their points, and the link. `hidden` rows (teens, as a signed-out visitor sees them) use `hiddenName`.
 */
export function standingsText(name: string, rows: (StandingRow & { hidden?: boolean; movement?: Movement | null })[], url: string, hiddenName: string, pts: (n: number) => string, top = 10, newMark = "new"): string {
  const lines = rows
    .filter((r) => r.rank !== null)
    .slice(0, top)
    .map((r) => {
      const moved = movementMark(r.movement ?? null, newMark);
      return `${MEDALS[r.rank!] ?? `${r.rank}.`} ${r.hidden ? hiddenName : r.name} · ${pts(r.points)}${moved ? ` (${moved})` : ""}`;
    });
  return [`🏆 ${name}`, ...lines, url].join("\n");
}

/** How a ranked player moved since the latest event: up or down by n places, new to the ranking, or the same. */
export type Movement = { kind: "up" | "down"; by: number } | { kind: "new" } | { kind: "same" };

/**
 * Each ranked player's movement since the season's latest event day: their rank now against their rank
 * in the standings without that day's events. Nothing when there's only one event day (everyone would be new).
 */
export function movementSinceLatest(opts: Parameters<typeof computeStandings>[0], now: StandingRow[]): Map<string, Movement> {
  const out = new Map<string, Movement>();
  const days = [...new Set(opts.events.map((e) => e.heldOn))].sort();
  if (days.length < 2) return out;
  const latest = days[days.length - 1];
  const before = computeStandings({ ...opts, events: opts.events.filter((e) => e.heldOn !== latest) });
  const rankBefore = new Map(before.filter((r) => r.rank !== null).map((r) => [r.key, r.rank!]));
  for (const r of now) {
    if (r.rank === null) continue;
    const was = rankBefore.get(r.key);
    out.set(r.key, was === undefined ? { kind: "new" } : was > r.rank ? { kind: "up", by: was - r.rank } : was < r.rank ? { kind: "down", by: r.rank - was } : { kind: "same" });
  }
  return out;
}

/** A movement as a short mark: "▲2", "▼1", the word for new, or "" when unchanged or unknown. */
export function movementMark(m: Movement | null, newMark = "new"): string {
  if (!m) return "";
  return m.kind === "up" ? `▲${m.by}` : m.kind === "down" ? `▼${m.by}` : m.kind === "new" ? newMark : "";
}

/**
 * One player in the standings by name (for the Discord bot's /season player:): an exact match first
 * (ignoring case), else the only name that contains it. Hidden players (teens, for visitors) never
 * match, so their name can't be confirmed by guessing. Null when nothing (or more than one) matches.
 */
export function findStandingRow<R extends { name: string; hidden?: boolean }>(rows: R[], query: string): R | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const shown = rows.filter((r) => !r.hidden);
  const exact = shown.filter((r) => r.name.toLowerCase() === q);
  if (exact.length) return exact[0];
  const partial = shown.filter((r) => r.name.toLowerCase().includes(q));
  return partial.length === 1 ? partial[0] : null;
}

/** The id of a player's row on the standings page, so a link can jump to it (`/seasons/<id>#p-g-walky`). */
export function standingRowId(key: string): string {
  return `p-${key.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80)}`;
}
