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

/** For tests: forget every address. */
export function resetGuestLookups() {
  seen.clear();
}
