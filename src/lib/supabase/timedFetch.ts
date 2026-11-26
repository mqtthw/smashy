// A time limit on the database calls pages make (round 552). On 2026-11-19 the database stalled for a
// couple of minutes and pages sat on their loading placeholders for as long as it took, so a phone
// showed grey boxes that never filled in. With a limit, a call that takes too long fails instead:
// lists come back empty or the page's "Try again" shows, and the person isn't left waiting.
// Background jobs (the admin client) keep no limit: they can wait.

/** How long a page's database call may take before it gives up. */
export const PAGE_DB_TIMEOUT_MS = 8000;

/**
 * `fetch` that gives up after `ms`, and still honors the caller's own abort signal.
 *
 * Round 864: when the limit runs out, the error is thrown as an "AbortError". The Supabase library
 * retries a failed read up to three times (after 1, 2 and 4 seconds) unless the error is an abort,
 * and a plain timeout didn't count as one, so a stalled database held every page for 8+1+8+2+8+4+8 =
 * 39 seconds instead of 8 (seen live on 2026-11-26). Other network errors are still retried.
 */
export function timedFetch(ms: number = PAGE_DB_TIMEOUT_MS): typeof fetch {
  return async (input, init) => {
    const limit = AbortSignal.timeout(ms);
    const signal = init?.signal ? AbortSignal.any([init.signal, limit]) : limit;
    try {
      return await fetch(input, { ...init, signal });
    } catch (e) {
      if (limit.aborted) throw new DOMException(`TimeoutError: the database took longer than ${ms / 1000} s`, "AbortError");
      throw e;
    }
  };
}
