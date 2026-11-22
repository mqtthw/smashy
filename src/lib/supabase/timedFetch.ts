// A time limit on the database calls pages make (round 552). On 2026-11-19 the database stalled for a
// couple of minutes and pages sat on their loading placeholders for as long as it took, so a phone
// showed grey boxes that never filled in. With a limit, a call that takes too long fails instead:
// lists come back empty or the page's "Try again" shows, and the person isn't left waiting.
// Background jobs (the admin client) keep no limit: they can wait.

/** How long a page's database call may take before it gives up. */
export const PAGE_DB_TIMEOUT_MS = 8000;

/** `fetch` that gives up after `ms`, and still honors the caller's own abort signal. */
export function timedFetch(ms: number = PAGE_DB_TIMEOUT_MS): typeof fetch {
  return (input, init) => {
    const limit = AbortSignal.timeout(ms);
    const signal = init?.signal ? AbortSignal.any([init.signal, limit]) : limit;
    return fetch(input, { ...init, signal });
  };
}
