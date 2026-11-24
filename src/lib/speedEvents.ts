// Which page-speed measurements are sent to Vercel Speed Insights (round 804).
//
// The plan includes 10,000 measurements a month. On 2026-11-23 a scraper that runs a real browser opened
// about 2,600 player pages and each sent its measurements: 7,000 in one day, 8,562 of the month's 10,000
// gone by the 24th. Player pages are where bots go, and their speed is the start.gg lookup, which is known,
// so their measurements aren't sent. Every other page is measured as before.

/** Whether a measurement taken on this page address is sent. */
export function keepSpeedEvent(url: string): boolean {
  try {
    return !new URL(url, "https://smashy.gg").pathname.startsWith("/players/");
  } catch {
    return true;
  }
}
