// How much player lookup a visitor who isn't signed in may do. Looking a player up can cost up to
// 8 start.gg requests, and start.gg allows the whole site 80 a minute, which live brackets need
// too. So guests get two limits that members don't:
//   1. per address: a person browsing never notices it; one address walking through thousands of
//      players does.
//   2. spare capacity only: when this server is already busy with start.gg, guests wait.
// Kept in this server's memory (like the other per-address limits), so it's approximate across
// servers: good enough to stop a runaway, and nothing is stored about anyone.

/** Lookups one address may do per window. */
export const GUEST_LOOKUPS = 30;
export const GUEST_WINDOW_MS = 10 * 60_000;
/** start.gg requests this server sent in the last minute: at or above this, guests wait their turn. */
export const GUEST_BUSY_AT = 35;

export type GuestLookup = "ok" | "slow_down" | "busy";

const seen = new Map<string, number[]>();

/**
 * Count one lookup for this address and say whether it may go ahead:
 * "slow_down" = this address used up its lookups for now; "busy" = start.gg is in heavy use right
 * now (not counted against the visitor).
 */
export function takeGuestLookup(address: string, now: number, startggLoad: number): GuestLookup {
  const times = (seen.get(address) ?? []).filter((t) => now - t < GUEST_WINDOW_MS);
  if (times.length >= GUEST_LOOKUPS) {
    seen.set(address, times);
    return "slow_down";
  }
  if (startggLoad >= GUEST_BUSY_AT) return "busy";
  if (seen.size > 5000) seen.clear();
  seen.set(address, [...times, now]);
  return "ok";
}

/** Give back the lookup just counted for this address (it was turned away as "busy", which isn't the visitor's doing). */
export function refundGuestLookup(address: string) {
  const times = seen.get(address);
  if (times?.length) seen.set(address, times.slice(0, -1));
}

// The whole site's pace for guests (docs/searchable-player-pages-plan.md, step S3). The two limits above
// are per address and per server, so a bot coming from many addresses through two or three servers passed
// both and still used up start.gg's 75 requests a minute (2,000 "start.gg is busy" errors on 2026-11-23).
// Before a guest's lookup asks start.gg anything, it takes a ticket from the site-wide count the servers
// already share (take_startgg_slots): a few slots, granted only while the whole site has sent fewer than
// GUEST_SITE_PER_MINUTE requests in the last minute. So guests' lookups, people's and bots' alike, fit in
// about half of the allowance and the other half is always there for members and live brackets. A guest
// past the pace gets the page from what Smashy has saved, with "try again" (round 781).
/** Slots a guest lookup reserves up front (a lookup then sends up to 8 requests of its own). */
export const GUEST_TICKET = 4;
/** Guests' lookups start only while the whole site is under this many start.gg requests a minute (of 75). */
export const GUEST_SITE_PER_MINUTE = 36;

/**
 * Whether the site has room for one more guest lookup. `take(want, perMinute)` answers how many slots it
 * granted, or null when the shared count can't be asked: then the per-server check above is all there is,
 * and the lookup goes ahead rather than turning every guest away while the database is slow.
 */
export async function guestSiteRoom(take: (want: number, perMinute: number) => Promise<number | null>): Promise<boolean> {
  try {
    const granted = await take(GUEST_TICKET, GUEST_SITE_PER_MINUTE);
    return granted === null || granted >= GUEST_TICKET;
  } catch {
    return true;
  }
}

/**
 * Whether a visit says it came from a search engine's results page (its Referer). Used to put such visits
 * last in line on player pages that search engines aren't told about (round 798): the bulk scraper of
 * 2026-11-23 marks every request "from www.google.com", and a real searcher can only land on the players
 * Smashy lists for search (a top 8 at a major). So a "from Google" visit to any other player's page gets
 * the saved page with "Try again" instead of a live lookup; pressing Try again comes from Smashy itself
 * and is looked up as usual. That keeps the scraper from using up the pace real visitors share.
 */
export function arrivedFromSearch(referer: string | null): boolean {
  if (!referer) return false;
  try {
    const host = new URL(referer).hostname.toLowerCase();
    return /(^|\.)(google|bing|duckduckgo|yahoo|yandex|baidu|ecosia|brave)\.[a-z.]{2,6}$/.test(host);
  } catch {
    return false;
  }
}

/** For tests: forget every address. */
export function resetGuestLookups() {
  seen.clear();
}
