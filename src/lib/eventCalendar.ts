// The month calendar on the Events page (round 729, Paper King's idea): which day a tournament falls
// on, and the grid of days for a month. Plain date maths, safe in the browser, easy to test.

/** The calendar day ("2026-12-20") a tournament starts on, at its own venue's clock. */
export function dayKey(unixSeconds: number, timezone: string | null): string {
  const parts = (zone: string | undefined) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(unixSeconds * 1000));
  try {
    return parts(timezone ?? "America/Chicago");
  } catch {
    return parts("America/Chicago"); // a timezone name this browser doesn't know
  }
}

/** "2026-12" from a day key. */
export const monthOf = (day: string) => day.slice(0, 7);

/** The month before or after ("2026-12", +1 → "2027-01"). */
export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * A month as rows of seven cells: a day key, or null for the blanks before the 1st and after the last
 * day. `weekStart`: 0 = weeks start on Sunday, 1 = Monday.
 */
export function monthGrid(month: string, weekStart: 0 | 1 = 0): (string | null)[][] {
  const [y, m] = month.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() - weekStart + 7) % 7;
  const cells: (string | null)[] = [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

/** Weeks start on Monday in Spanish and French, on Sunday in English and Japanese. */
export const weekStartFor = (lang: string): 0 | 1 => (lang === "es" || lang === "fr" ? 1 : 0);

/** A day key as a date at noon UTC, for formatting its name without it slipping a day in any zone. */
export const dayDate = (day: string) => new Date(`${day}T12:00:00Z`);
