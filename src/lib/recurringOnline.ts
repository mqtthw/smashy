// Online series that run on their own site, listed by hand on Events → Online (round 772, Matthew:
// "Can we add junglemelee.com"). These sites have no feed Smashy may read, so only what's fixed is
// shown: the name, the day and time it runs every week, and a link to sign up there. No entrant
// counts, no results, no "live". If a series changes its schedule, change it here.
// Plain logic, so it can be tested.
import type { GameKey } from "./games";

export type RecurringSeries = {
  id: string;
  name: string;
  site: string; // shown on the row ("junglemelee.com")
  href: string;
  game: GameKey;
  /** Days it runs: 0 Sunday … 6 Saturday, in `timeZone`. */
  days: number[];
  hour: number;
  minute: number;
  timeZone: string;
};

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

/** Jungle Melee (junglemelee.com), as its home page listed them on 2026-11-23. Times are US Central. */
export const RECURRING_ONLINE: RecurringSeries[] = [
  { id: "jungle-kotj", name: "King of the Jungle", site: "junglemelee.com", href: "https://junglemelee.com/?home=1", game: "melee", days: [1], hour: 18, minute: 0, timeZone: "America/Chicago" },
  { id: "jungle-friday", name: "Jungle Melee Friday event", site: "junglemelee.com", href: "https://junglemelee.com/?home=1", game: "melee", days: [5], hour: 19, minute: 0, timeZone: "America/Chicago" },
  { id: "jungle-night", name: "Jungle @ Night", site: "junglemelee.com", href: "https://junglemelee.com/?home=1", game: "melee", days: EVERY_DAY, hour: 22, minute: 0, timeZone: "America/Chicago" },
];

/** A calendar date and clock time in a time zone, as unix seconds (handles daylight saving time). */
export function zonedTime(year: number, month: number, day: number, hour: number, minute: number, timeZone: string): number {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  // What the zone's clock shows at `guess`, read back as if it were UTC: the difference is the offset.
  const shown = (ms: number) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(ms).map((x) => [x.type, Number(x.value)]));
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  };
  const first = guess - (shown(guess) - guess);
  // Once more from the corrected time, for the hours around a clock change.
  return Math.floor((guess - (shown(first) - first)) / 1000);
}

export type RecurringStart = { series: RecurringSeries; startAt: number };

/**
 * Each series' starts from now until `days` days ahead, soonest first. One that started less than
 * `keepSec` ago is still listed (people sign up late; the site says when check-in closes).
 */
export function upcomingRecurring(nowSec: number, days = 7, keepSec = 30 * 60, list: RecurringSeries[] = RECURRING_ONLINE): RecurringStart[] {
  const out: RecurringStart[] = [];
  for (const series of list) {
    // The zone's calendar date for each of the days around the window.
    for (let i = -1; i <= days + 1; i++) {
      const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: series.timeZone, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).formatToParts((nowSec + i * 86400) * 1000).map((x) => [x.type, x.value]));
      const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
      if (!series.days.includes(weekday)) continue;
      const startAt = zonedTime(Number(p.year), Number(p.month), Number(p.day), series.hour, series.minute, series.timeZone);
      if (startAt > nowSec - keepSec && startAt <= nowSec + days * 86400 && !out.some((o) => o.series.id === series.id && o.startAt === startAt)) out.push({ series, startAt });
    }
  }
  return out.sort((a, b) => a.startAt - b.startAt);
}
