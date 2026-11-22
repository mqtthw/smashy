import { describe, expect, it } from "vitest";
import { LOCK_STALE_SECONDS, lockIsFree } from "@/lib/bracketLock";

describe("bracket lock", () => {
  const now = 1_794_400_000;
  it("is free at zero or any positive value", () => {
    expect(lockIsFree(0, now)).toBe(true);
    expect(lockIsFree(1, now)).toBe(true);
    expect(lockIsFree(42, now)).toBe(true);
  });
  it("is held while the request that took it could still be running", () => {
    expect(lockIsFree(-now, now)).toBe(false); // just taken
    expect(lockIsFree(-(now - 60), now)).toBe(false);
    expect(lockIsFree(-(now - LOCK_STALE_SECONDS), now)).toBe(false);
  });
  it("can be taken over once it's older than the limit (the request that held it died)", () => {
    expect(lockIsFree(-(now - LOCK_STALE_SECONDS - 1), now)).toBe(true);
    // Locks left behind by the old scheme (small negative numbers) count as long expired.
    expect(lockIsFree(-5, now)).toBe(true);
  });
});
