// How often one address may call the public API (round 708), per server: plenty for an app or a bot,
// not enough to scrape everything at once. Lookups that may ask start.gg (one tournament by its slug)
// get a tighter allowance, since start.gg's limit is shared with the whole site. Most answers are also
// kept by Vercel's network for a few minutes, so repeat calls never reach these counters.
export const API_WINDOW_MS = 60_000;
export const API_LIMITS = { general: 120, startgg: 20 } as const;
export type ApiBucket = keyof typeof API_LIMITS;

const seen = new Map<string, number[]>();

/** Counts one call; `left` = how many more this address may make in the current minute. */
export function takeApiCall(address: string, bucket: ApiBucket, now: number): { ok: boolean; left: number; limit: number } {
  const limit = API_LIMITS[bucket];
  const key = `${bucket}:${address}`;
  const times = (seen.get(key) ?? []).filter((t) => now - t < API_WINDOW_MS);
  if (times.length >= limit) {
    seen.set(key, times);
    return { ok: false, left: 0, limit };
  }
  if (seen.size > 10_000) seen.clear();
  seen.set(key, [...times, now]);
  return { ok: true, left: limit - times.length - 1, limit };
}

/** Which allowance a public API path uses. */
export function apiBucket(path: string): ApiBucket {
  return /^\/api\/v1\/events\/.+/.test(path) ? "startgg" : "general";
}

/** For tests: forget every address. */
export function resetApiCalls() {
  seen.clear();
}
