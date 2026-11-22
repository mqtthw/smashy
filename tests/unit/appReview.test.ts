// When the app asks for a store rating (round 643).
import { describe, expect, it } from "vitest";
import { shouldAskForReview } from "@/lib/appReview";

const DAY = 86400e3;

describe("asking for a store rating", () => {
  const now = Date.parse("2026-11-20T12:00:00Z");
  it("waits for the third day using the app", () => {
    expect(shouldAskForReview(1, 0, now)).toBe(false);
    expect(shouldAskForReview(2, 0, now)).toBe(false);
    expect(shouldAskForReview(3, 0, now)).toBe(true);
  });
  it("asks again only after 120 days", () => {
    expect(shouldAskForReview(3, now - 119 * DAY, now)).toBe(false);
    expect(shouldAskForReview(3, now - 120 * DAY, now)).toBe(true);
  });
});
