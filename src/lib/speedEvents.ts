// Which visits are counted by Vercel Web Analytics and Speed Insights (rounds 804 and 823).
//
// Speed Insights includes 10,000 measurements a month. On 2026-11-23 a scraper that runs a real browser opened
// about 2,600 player pages and each sent its measurements: 7,000 in one day, 8,562 of the month's 10,000
// gone by the 24th. Player pages are where bots go, and their speed is the start.gg lookup, which is known,
// so their measurements aren't sent. Every other page is measured as before.
//
// Round 823: the same scraper also filled Web Analytics (about 2,500 of the week's 3,150 "visitors", all
// "from google.com"), and it now opens tournament, search and sign-in pages too. It always sends one exact
// browser name, so visits with that name are left out of both. A real visitor on that same Chrome version on
// Linux is left out too; that's rare (Linux is a small share of visitors, and Chrome's version moves on
// every few weeks), and only the counting is affected: the site works the same for them.

/** The scraper's browser name: Chrome 158 on Linux, as Chrome reports it (2026-11-23 onwards). */
export const SCRAPER_USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/158.0.0.0 Safari/537.36";

/** Whether this browser's visits are counted at all. */
export function countThisBrowser(userAgent: string | null | undefined): boolean {
  return userAgent !== SCRAPER_USER_AGENT;
}

/** Whether a measurement taken on this page address is sent. */
export function keepSpeedEvent(url: string): boolean {
  try {
    return !new URL(url, "https://smashy.gg").pathname.startsWith("/players/");
  } catch {
    return true;
  }
}
