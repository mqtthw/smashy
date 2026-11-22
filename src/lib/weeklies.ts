// Recurring weeklies: many TOs only post the start.gg page a day or two before.
// We look at recent history, group repeats into a "series", and predict the next one.
// Pure functions (no fetching) so the logic is easy to test.

import type { GameKey } from "./games";
import type { SmashyTournament } from "./startgg";

export type ExpectedWeekly = {
  id: string; // stable URL id, e.g. "the-contract--san-antonio"
  name: string; // predicted name, e.g. "The Contract #225"
  seriesName: string; // e.g. "The Contract"
  city: string;
  venueName: string | null;
  venueAddress: string | null;
  startAt: number; // predicted unix seconds
  timezone: string;
  intervalDays: 7 | 14;
  games: { game: GameKey; typicalEntrants: number }[];
  // Each bracket's usual start (from the last edition, shifted to the predicted date). startAt null = unknown.
  events: { name: string; game: GameKey; startAt: number | null }[];
  imageUrl: string | null;
  lastEdition: { name: string; slug: string; startAt: number; entrants: number };
  editionsSeen: number;
};

const FALLBACK_TZ = "America/Chicago";
const DAY = 86400;

// ---------- Names ----------

/** "Moonwalk Tournament Series: 131 (COSTUME CONTEST!!!)" -> "moonwalk tournament series" */
export function seriesKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[([{].*?[)\]}]/g, " ") // (notes) [tags] {extras}
    .split(/\s[-–—|]\s/)[0] // "Monday Night Melee 520 - Swiss Party" -> before the dash
    .replace(/\b(season|week|episode|ep|vol|volume|edition|no)\.?\s*\d+\b/g, " ")
    .replace(/\d+([./]\d+)*/g, " ") // numbers and dates like 10.29.26
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// "The Contract #224", "Monday Night Melee 521", "ZONEBREAKER_86": series words + edition number.
// Numbers right after words like "Season" aren't edition numbers, so those names aren't counted up.
const EDITION = /^(.*?)(\s*#\s*|[\s_]+)(\d+)\b/;
const NOT_EDITION = /\b(season|week|episode|ep|vol|volume|s)$/i;

function editionMatch(name: string) {
  const m = name.match(EDITION);
  return m && !NOT_EDITION.test(m[1].trim()) ? m : null;
}

/** Display name for the series: the name up to its edition number, or before " - " / "(". */
function seriesDisplayName(name: string): string {
  const cut = name.split(/\s[-–—|]\s|\s*[([]/)[0];
  const numbered = editionMatch(cut);
  const base = numbered ? numbered[1] : cut.replace(/\b(season|week|episode|vol|volume)\s*\d+.*$/i, "");
  return base.replace(/[\s:#_-]+$/, "").trim() || name;
}

/** "The Contract #224" -> "The Contract #225"; names without an edition number use the series name. */
function nextEditionName(lastName: string, editionsAhead: number): string {
  const m = editionMatch(lastName.split(/\s[-–—|]\s|\s*[([]/)[0]);
  if (!m) return seriesDisplayName(lastName);
  return `${m[1]}${m[2]}${Number(m[3]) + editionsAhead}`;
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Stable id for a recurring series, e.g. ("The Contract #224", "San Antonio") -> "the-contract--san-antonio". */
export function seriesIdFor(tournamentName: string, city: string | null): string | null {
  if (!city || !seriesKey(tournamentName)) return null;
  return `${slugify(seriesDisplayName(tournamentName))}--${slugify(city)}`;
}

/** Display name of the series a tournament belongs to, e.g. "The Contract". */
export function seriesNameFor(tournamentName: string): string {
  return seriesDisplayName(tournamentName);
}

// ---------- Timezone-safe dates ----------
// Weeklies keep the same *local* time across daylight-saving changes,
// so we do date math on local calendar days, not by adding seconds.

type Local = { y: number; m: number; d: number; weekday: number; hour: number; minute: number };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function localParts(unix: number, tz: string): Local {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      weekday: "short",
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    })
      .formatToParts(new Date(unix * 1000))
      .map((p) => [p.type, p.value]),
  );
  return {
    y: Number(parts.year),
    m: Number(parts.month),
    d: Number(parts.day),
    weekday: WEEKDAYS.indexOf(parts.weekday),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

/** Days since 1970 for a local calendar date (used to compare/add whole days). */
function dayNumber(l: Pick<Local, "y" | "m" | "d">) {
  return Math.round(Date.UTC(l.y, l.m - 1, l.d) / 1000 / DAY);
}

/** Unix seconds for a local wall-clock time on a given day number in a timezone. */
function zonedToUnix(dayNum: number, hour: number, minute: number, tz: string): number {
  const asUtc = dayNum * DAY + hour * 3600 + minute * 60;
  let guess = asUtc;
  for (let i = 0; i < 2; i++) {
    const p = localParts(guess, tz);
    const shownAsUtc = dayNumber(p) * DAY + p.hour * 3600 + p.minute * 60;
    guess += asUtc - shownAsUtc;
  }
  return guess;
}

// ---------- Detection ----------

function maxEntrants(t: SmashyTournament, game?: GameKey) {
  return Math.max(0, ...t.events.filter((e) => !game || e.game === game).map((e) => e.numEntrants ?? 0));
}

function median(nums: number[]) {
  const s = [...nums].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
}

/**
 * Predict the next edition of each recurring series that has no upcoming start.gg page yet.
 * @param past tournaments from the last ~8 weeks
 * @param upcoming tournaments already posted on start.gg
 * @param now unix seconds
 * @param horizonDays only predict editions this many days ahead
 */
export function predictWeeklies(
  past: SmashyTournament[],
  upcoming: SmashyTournament[],
  now: number,
  horizonDays = 8,
): ExpectedWeekly[] {
  const groupId = (t: SmashyTournament) => `${seriesKey(t.name)}|${(t.city ?? "").toLowerCase()}`;

  const postedSeries = new Set(upcoming.map(groupId));
  const groups = new Map<string, SmashyTournament[]>();
  for (const t of past) {
    if (!t.city || !seriesKey(t.name)) continue;
    const id = groupId(t);
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id)!.push(t);
  }

  const predictions: ExpectedWeekly[] = [];
  for (const [id, editions] of groups) {
    if (postedSeries.has(id)) continue; // the next one is already on start.gg

    const tz = editions[0].timezone ?? FALLBACK_TZ;
    // One edition per local day (some TOs post duplicates), oldest first.
    const byDay = new Map<number, SmashyTournament>();
    for (const t of editions) byDay.set(dayNumber(localParts(t.startAt, tz)), t);
    const days = [...byDay.keys()].sort((a, b) => a - b);
    if (days.length < 3) continue;

    // Regular gap: weekly or every other week.
    const recentDays = days.slice(-6);
    const gaps = recentDays.slice(1).map((d, i) => d - recentDays[i]);
    const gap = median(gaps);
    const intervalDays = gap >= 6 && gap <= 8 ? 7 : gap >= 13 && gap <= 15 ? 14 : null;
    if (!intervalDays) continue;

    // Most recent editions should share a weekday.
    const recent = recentDays.map((d) => byDay.get(d)!);
    const weekdays = recent.map((t) => localParts(t.startAt, tz).weekday);
    const last = recent[recent.length - 1];
    const lastLocal = localParts(last.startAt, tz);
    if (weekdays.filter((w) => w === lastLocal.weekday).length < Math.ceil(weekdays.length * 0.66)) continue;

    // Stop predicting series that seem to have ended (missed ~2 cycles).
    const today = dayNumber(localParts(now, tz));
    const lastDay = days[days.length - 1];
    if (today - lastDay > intervalDays * 2 + 2) continue;

    // Next edition on or after today, same local time as the last one.
    let editionsAhead = 1;
    let nextDay = lastDay + intervalDays;
    while (nextDay < today) {
      nextDay += intervalDays;
      editionsAhead++;
    }
    const startAt = zonedToUnix(nextDay, lastLocal.hour, lastLocal.minute, tz);
    if (startAt < now - 3 * 3600 || startAt - now > horizonDays * DAY) continue;

    const games = [...new Set(recent.slice(-3).flatMap((t) => t.events.map((e) => e.game)))];
    const seriesName = seriesDisplayName(last.name);
    // Skip side brackets that never get entrants (e.g. an empty Melee bracket at an Ultimate weekly).
    const shownGames = games
      .map((game) => ({
        game,
        typicalEntrants: median(recent.map((t) => maxEntrants(t, game)).filter((n) => n > 0)),
      }))
      .filter((g, _, all) => g.typicalEntrants > 0 || all.length === 1);
    predictions.push({
      id: seriesIdFor(last.name, last.city)!,
      name: nextEditionName(last.name, editionsAhead),
      seriesName,
      city: last.city!,
      venueName: last.venueName,
      venueAddress: last.venueAddress,
      startAt,
      timezone: tz,
      intervalDays,
      games: shownGames,
      // Only brackets for the games listed above (no empty side brackets).
      events: last.events
        .filter((e) => shownGames.some((g) => g.game === e.game))
        .map((e) => ({
          name: e.name,
          game: e.game,
          startAt: e.startAt ? startAt + (e.startAt - last.startAt) : null,
        })),
      imageUrl: last.imageUrl,
      lastEdition: { name: last.name, slug: last.slug, startAt: last.startAt, entrants: maxEntrants(last) },
      editionsSeen: days.length,
    });
  }
  return predictions.sort((a, b) => a.startAt - b.startAt);
}

/** The same local clock time `days` later in a time zone (keeps 7:00 PM across a clock change). Unix seconds. */
export function sameLocalTimeLater(unix: number, days: number, tz: string): number {
  const p = localParts(unix, tz);
  return zonedToUnix(dayNumber(p) + days, p.hour, p.minute, tz);
}
