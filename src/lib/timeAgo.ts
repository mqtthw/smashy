// "now", "5m", "3h", "2d", then "Nov 7". Shared by server and browser.
export function timeAgo(iso: string, now: number, timeZone = "America/Chicago", locale = "en-US") {
  const seconds = Math.max(0, now - Date.parse(iso) / 1000);
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)}d`;
  // Older than a week: the date (with the year if it isn't this year).
  const year = (d: Date) => new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone }).format(d);
  const thisYear = year(new Date(iso)) === year(new Date(now * 1000));
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", ...(thisYear ? {} : { year: "numeric" }), timeZone }).format(new Date(iso));
}

/** A full date and time with its time zone, e.g. "Nov 7, 5:05 PM CST" (pass the reader's time zone). */
export function fullTime(iso: string, timeZone = "America/Chicago", locale = "en-US") {
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone, timeZoneName: "short" }).format(new Date(iso));
}
