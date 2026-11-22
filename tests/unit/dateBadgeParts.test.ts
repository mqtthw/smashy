import { describe, expect, it } from "vitest";
import { dateBadgeParts } from "@/lib/format";

// 2026-11-18 01:30 UTC: still Nov 17 in Texas, already Nov 18 in Tokyo.
const t = Date.UTC(2026, 10, 18, 1, 30) / 1000;

describe("dateBadgeParts", () => {
  it("uses the venue's time zone", () => {
    expect(dateBadgeParts(t, "America/Chicago", "en")).toEqual({ month: "NOV", day: "17" });
    expect(dateBadgeParts(t, "Asia/Tokyo", "en")).toEqual({ month: "NOV", day: "18" });
  });
  it("drops the abbreviation's period and upper-cases in the reader's language", () => {
    const fr = dateBadgeParts(t, "America/Chicago", "fr");
    expect(fr.day).toBe("17");
    expect(fr.month.endsWith(".")).toBe(false);
    expect(fr.month).toBe(fr.month.toLocaleUpperCase("fr"));
  });
  it("falls back to Texas time when the venue has none", () => {
    expect(dateBadgeParts(t, null, "en").day).toBe("17");
  });
});
