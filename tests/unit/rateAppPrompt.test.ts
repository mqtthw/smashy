// When the Android app asks for a Google Play rating (round 703).
import { describe, expect, it } from "vitest";
import { shouldAskToRate } from "@/components/RateAppPrompt";

const DAY = 86400e3;
describe("asking for a rating", () => {
  it("waits for the 5th time the app is opened", () => {
    expect(shouldAskToRate(4, 0, false, Date.now())).toBe(false);
    expect(shouldAskToRate(5, 0, false, Date.now())).toBe(true);
  });
  it("asks again 60 days after Not now, and never after Rate", () => {
    const now = 1_800_000_000_000;
    expect(shouldAskToRate(9, now - 59 * DAY, false, now)).toBe(false);
    expect(shouldAskToRate(9, now - 60 * DAY, false, now)).toBe(true);
    expect(shouldAskToRate(99, 0, true, now)).toBe(false);
  });
});
