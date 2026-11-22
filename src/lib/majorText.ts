// A major's dates and place written the way each language writes them ("Nov 14–16", "14–16 nov.",
// "11月14日～16日"; "Tokorozawa · Japan" / "Tokorozawa · Japon"). Plain functions: no server or browser APIs.
import { localeFor } from "./i18n/base";

function safeZone(timeZone: string): string {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return timeZone;
  } catch {
    return "UTC"; // an unknown zone name from start.gg
  }
}

/**
 * The days a major runs, in the venue's days (its time zone). A finish at exactly midnight counts as the
 * day before. Rows saved before the time zone was kept fall back to UTC.
 */
export function majorDates(m: { startAt: string; endAt: string; timezone?: string | null }, lang = "en"): string {
  const fmt = new Intl.DateTimeFormat(localeFor(lang), { month: "short", day: "numeric", timeZone: safeZone(m.timezone || "UTC") });
  const start = Date.parse(m.startAt);
  const end = Math.max(start, Date.parse(m.endAt) - 60_000);
  // "Nov 13 – 15" → "Nov 13–15" (a day-to-day range is written tight; month to month keeps plain spaces).
  return fmt
    .formatRange(start, end)
    .replace(/(\d)[\s\u2009\u202f]*–[\s\u2009\u202f]*(\d)/, "$1–$2")
    .replace(/[\u2009\u202f]/g, " ");
}

const countryNames = new Map<string, Intl.DisplayNames>();

/** "Seattle" for US majors, "Tokorozawa · Japan" elsewhere (the country in the reader's language). */
export function majorPlace(m: { city: string | null; country: string | null }, lang = "en"): string | null {
  let names = countryNames.get(lang);
  if (!names) countryNames.set(lang, (names = new Intl.DisplayNames([localeFor(lang)], { type: "region" })));
  const country = m.country && m.country !== "US" ? names.of(m.country) : null;
  return [m.city, country].filter(Boolean).join(" · ") || null;
}
