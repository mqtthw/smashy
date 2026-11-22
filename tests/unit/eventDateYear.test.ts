import { describe, expect, it } from "vitest";
import { formatEventDate, otherYear } from "@/lib/format";

const GENESIS_5 = Date.UTC(2018, 0, 19, 17) / 1000; // Fri Jan 19 2018, 9 AM in Oakland
const NOW = Date.UTC(2026, 10, 16) / 1000;

describe("old tournaments' dates", () => {
  it("say the year only when asked", () => {
    expect(formatEventDate(GENESIS_5, "America/Los_Angeles")).toBe("Fri, Jan 19");
    expect(formatEventDate(GENESIS_5, "America/Los_Angeles", "en", { year: true })).toBe("Fri, Jan 19, 2018");
    expect(formatEventDate(GENESIS_5, "America/Los_Angeles", "ja", { year: true })).toContain("2018");
  });

  it("otherYear is true for another year, false for this one", () => {
    expect(otherYear(GENESIS_5, NOW)).toBe(true);
    expect(otherYear(Date.UTC(2026, 0, 2) / 1000, NOW)).toBe(false);
  });
});
