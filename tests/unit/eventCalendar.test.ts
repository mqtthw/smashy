// The Events calendar (round 729): which day a tournament is on, and a month's grid.
import { describe, expect, it } from "vitest";
import { dayKey, monthGrid, monthOf, shiftMonth, weekStartFor } from "@/lib/eventCalendar";

describe("events calendar", () => {
  it("puts a tournament on its venue's own date", () => {
    const lateSaturdayInTexas = Date.UTC(2026, 11, 20, 3, 0) / 1000; // 9 pm Sat Dec 19 in Texas, already Sunday in UTC
    expect(dayKey(lateSaturdayInTexas, "America/Chicago")).toBe("2026-12-19");
    expect(dayKey(lateSaturdayInTexas, "Asia/Tokyo")).toBe("2026-12-20");
    expect(dayKey(lateSaturdayInTexas, null)).toBe("2026-12-19"); // no timezone saved: Texas
    expect(dayKey(lateSaturdayInTexas, "Not/AZone")).toBe("2026-12-19");
    expect(monthOf("2026-12-19")).toBe("2026-12");
  });
  it("lays a month out in weeks, starting Sunday or Monday", () => {
    const dec = monthGrid("2026-12"); // Dec 1, 2026 is a Tuesday
    expect(dec[0]).toEqual([null, null, "2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04", "2026-12-05"]);
    expect(dec.flat().filter(Boolean)).toHaveLength(31);
    expect(dec.every((w) => w.length === 7)).toBe(true);
    expect(monthGrid("2026-12", 1)[0]).toEqual([null, "2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04", "2026-12-05", "2026-12-06"]);
    expect(monthGrid("2028-02").flat().filter(Boolean)).toHaveLength(29); // a leap year
    expect(weekStartFor("fr")).toBe(1);
    expect(weekStartFor("en")).toBe(0);
  });
  it("steps between months across a year's end", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2027-01", -1)).toBe("2026-12");
  });
});
