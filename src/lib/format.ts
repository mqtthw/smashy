import { localeFor } from "./i18n/base";
// Date helpers. Always format in the tournament's own timezone so times match the venue.

const FALLBACK_TZ = "America/Chicago"; // most of Texas

/** Current time in unix seconds (call only in request-time server code). */
export function unixNow() {
  return Math.floor(Date.now() / 1000);
}

/** The locale for dates and times in a Smashy language ("es" → Latin American Spanish). */
const dateLocale = (lang?: string) => localeFor(lang);

/** "Sat, Nov 14"; with `year`, "Sat, Jan 19, 2018" (for a tournament from another year). */
export function formatEventDate(unixSeconds: number, timezone: string | null, lang?: string, opts: { year?: boolean } = {}) {
  return new Intl.DateTimeFormat(dateLocale(lang), {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(opts.year ? { year: "numeric" } : {}),
    timeZone: timezone ?? FALLBACK_TZ,
  }).format(new Date(unixSeconds * 1000));
}

/**
 * The two lines of a date bubble ("NOV" over "18"), in the venue's time zone and the reader's
 * language. The month is upper-cased and has any trailing period removed ("nov." -> "NOV").
 */
export function dateBadgeParts(unixSeconds: number, timezone: string | null, lang?: string): { month: string; day: string } {
  const parts = new Intl.DateTimeFormat(dateLocale(lang), { month: "short", day: "numeric", timeZone: timezone ?? FALLBACK_TZ }).formatToParts(new Date(unixSeconds * 1000));
  const month = (parts.find((p) => p.type === "month")?.value ?? "").replace(/\.$/, "").toLocaleUpperCase(dateLocale(lang));
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  return { month, day };
}

/** True when the date falls in another year than now (call only in request-time server code). */
export function otherYear(unixSeconds: number, nowSeconds = unixNow()) {
  return new Date(unixSeconds * 1000).getUTCFullYear() !== new Date(nowSeconds * 1000).getUTCFullYear();
}

export function formatEventTime(unixSeconds: number, timezone: string | null, lang?: string) {
  return new Intl.DateTimeFormat(dateLocale(lang), {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone ?? FALLBACK_TZ,
    timeZoneName: "short",
  }).format(new Date(unixSeconds * 1000));
}

type Timed = { startAt: number; endAt: number | null; events?: { startAt: number | null }[] };

// How long one bracket is assumed to run once it starts (start.gg gives start times, not end times, per bracket).
export const BRACKET_HOURS = 12 * 3600;

/** A bracket's start, never before its tournament's (organizers mix up AM/PM: Branson's Brawl #6 listed 5:30 AM for a 5:30 PM event). */
function startOf(e: { startAt: number | null }, t: { startAt: number }): number | null {
  return typeof e.startAt === "number" ? Math.max(e.startAt, t.startAt) : null;
}

function bracketStarts(t: Timed): number[] {
  return (t.events ?? []).map((e) => startOf(e, t)).filter((n): n is number => n !== null).sort((a, b) => a - b);
}

/**
 * The bracket start that matters now: one that started in the last 12 hours, else the next one, else
 * the last one. start.gg's tournament start is often earlier than the brackets (round 80: an online
 * event "started" Nov 9, its bracket Nov 15), and season-long online series hold weekly brackets
 * inside one tournament (round 81), so the tournament's own times can't say what's on now.
 */
export function bracketStart(t: Timed, now = unixNow()): number {
  const starts = bracketStarts(t);
  if (!starts.length) return t.startAt;
  const running = starts.filter((s) => s <= now && now < s + BRACKET_HOURS).at(-1);
  return running ?? starts.find((s) => s > now) ?? starts[starts.length - 1];
}

// A tournament that runs longer than this (but no more than 4 days) is a weekend event, not a
// local: a local's listed end is at most the end of the next day (about 29 hours after a 7 PM start).
const MULTI_DAY_MIN = 30 * 3600;
const MULTI_DAY_MAX = 4 * 86400;

/**
 * True while a tournament is on: one of its brackets started in the last 12 hours, or it's a
 * weekend event between its first bracket and its end. start.gg gives each bracket one start
 * time, usually day 1, so a major's Sunday Top 8 used to count as "not live" (no stream, no live
 * bracket button). Season-long series (weekly brackets inside one long tournament) keep the
 * 12-hour rule, and nothing is live after the tournament's end.
 */
export function isRunning(t: Timed, now = unixNow()): boolean {
  const starts = bracketStarts(t);
  if (t.endAt !== null && now >= t.endAt) return false;
  if (!starts.length) return t.startAt <= now && now < (t.endAt ?? t.startAt + 86400);
  if (starts.some((s) => s <= now && now < s + BRACKET_HOURS)) return true;
  const span = t.endAt !== null ? t.endAt - starts[0] : 0;
  return span >= MULTI_DAY_MIN && span <= MULTI_DAY_MAX && now >= starts[0];
}

/** "🔴 Live", or when the next bracket starts: "Mon, Nov 9 · 7:00 PM CST" (venue time). */
export function whenLabel(t: Timed & { timezone: string | null }, now = unixNow(), lang?: string): string {
  const start = bracketStart(t, now);
  return isRunning(t, now) ? (lang === "es" ? "● En vivo" : lang === "ja" ? "● ライブ中" : lang === "fr" ? "● En direct" : "● Live") : `${formatEventDate(start, t.timezone, lang)} · ${formatEventTime(start, t.timezone, lang)}`;
}

/**
 * The bracket to link to: the biggest one running now (a local's Singles over its Doubles; a season
 * series' bracket this week), else the next to start. Undefined when start.gg gives no bracket times.
 */
export function currentBracket<E extends { startAt: number | null; numEntrants?: number | null }>(t: Omit<Timed, "events"> & { events: E[] }, now = unixNow()): E | undefined {
  const running = t.events.filter((e) => {
    const s = startOf(e, t);
    return s !== null && s <= now && now < s + BRACKET_HOURS;
  });
  if (running.length) return [...running].sort((a, b) => (b.numEntrants ?? 0) - (a.numEntrants ?? 0))[0];
  const start = bracketStart(t, now);
  return t.events.find((e) => startOf(e, t) === start);
}
