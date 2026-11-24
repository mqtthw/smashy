// What a page does when a lookup is slow (round 778).
//
// Why: Smashy's database (the free plan's machine) freezes for about a minute, 15 to 20 times a day; every
// request then takes 3 to 14 seconds, and the Feed sat on its grey placeholders for that long. A page that
// has a good-enough answer needing no database (the Feed: the copy guests share) shows that instead once its
// own lookup has taken too long. The slow lookup isn't cancelled: if it finishes before the stand-in is
// ready, it still wins.

/** How long the Feed waits for a member's own lookups before using the stand-in. A normal load takes 0.1–0.4 s. */
export const SLOW_AFTER_MS = 1500;

/** `own`, or `fallback` if `own` hasn't answered within `ms` (or failed). Never throws. */
export function within<T>(own: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    own.then(
      (value) => (clearTimeout(timer), resolve(value)),
      () => (clearTimeout(timer), resolve(fallback)),
    );
  });
}

/**
 * `own`'s answer; or, once it has taken `ms`, whichever of `own` and `standIn()` answers first. `standIn` isn't
 * started at all when `own` is quick. `usedStandIn` says which one the answer is. Throws only when `own`
 * failed and the stand-in (if it was started) failed too: `own`'s error, so the caller's handling still sees it.
 */
export function orStandIn<T>(own: Promise<T>, ms: number, standIn: () => Promise<T>): Promise<{ value: T; usedStandIn: boolean }> {
  return new Promise((resolve, reject) => {
    let done = false;
    let ownError: { error: unknown } | null = null;
    let standInFailed = false;
    let started = false;
    const finish = (value: T, usedStandIn: boolean) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({ value, usedStandIn });
    };
    const fail = () => {
      if (done || !ownError || (started && !standInFailed)) return;
      done = true;
      clearTimeout(timer);
      reject(ownError.error);
    };
    const timer = setTimeout(() => {
      started = true;
      standIn().then(
        (value) => finish(value, true),
        () => ((standInFailed = true), fail()),
      );
    }, ms);
    own.then(
      (value) => finish(value, false),
      (error: unknown) => ((ownError = { error }), fail()),
    );
  });
}
