// The rule for an event's bracket lock (hostedBracket.ts, withBracketLock). The lock is one number
// on the event: zero or more means free; a negative number is minus the time (in seconds) it was
// taken. Pure, so it can be unit-tested.

/** A lock held longer than this belongs to a request that died: nothing takes that long. */
export const LOCK_STALE_SECONDS = 180;

/** Whether the lock can be taken now: it's free, or it was taken too long ago to still be in use. */
export function lockIsFree(value: number, nowSeconds: number): boolean {
  return value >= 0 || nowSeconds + value > LOCK_STALE_SECONDS;
}
