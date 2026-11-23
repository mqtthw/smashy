// Online series listed by hand (Jungle Melee): when each one starts over the coming week.
import { describe, expect, it } from "vitest";
import { RECURRING_ONLINE, upcomingRecurring, zonedTime, type RecurringSeries } from "@/lib/recurringOnline";

const at = (iso: string) => Math.floor(Date.parse(iso) / 1000);
const iso = (sec: number) => new Date(sec * 1000).toISOString();

describe("a clock time in a time zone", () => {
  it("is right in winter and in summer (US Central)", () => {
    expect(iso(zonedTime(2026, 11, 23, 18, 0, "America/Chicago"))).toBe("2026-11-24T00:00:00.000Z"); // CST, UTC-6
    expect(iso(zonedTime(2026, 7, 6, 18, 0, "America/Chicago"))).toBe("2026-07-06T23:00:00.000Z"); // CDT, UTC-5
  });

  it("is right on the days the clocks change", () => {
    expect(iso(zonedTime(2027, 3, 14, 22, 0, "America/Chicago"))).toBe("2027-03-15T03:00:00.000Z"); // after spring forward
    expect(iso(zonedTime(2026, 11, 1, 22, 0, "America/Chicago"))).toBe("2026-11-02T04:00:00.000Z"); // after fall back
  });
});

describe("the coming week of hand-listed online series", () => {
  // Monday 2026-11-23, 1:00 AM Central.
  const now = at("2026-11-23T07:00:00Z");
  const week = upcomingRecurring(now);

  it("lists King of the Jungle once, on Monday at 6 PM Central", () => {
    const kotj = week.filter((x) => x.series.id === "jungle-kotj");
    expect(kotj.map((x) => iso(x.startAt))).toEqual(["2026-11-24T00:00:00.000Z"]);
  });

  it("lists the Friday event once and the nightly one seven times, soonest first", () => {
    expect(week.filter((x) => x.series.id === "jungle-friday").map((x) => iso(x.startAt))).toEqual(["2026-11-28T01:00:00.000Z"]);
    const nights = week.filter((x) => x.series.id === "jungle-night");
    expect(nights).toHaveLength(7);
    expect(iso(nights[0].startAt)).toBe("2026-11-24T04:00:00.000Z");
    expect(week.map((x) => x.startAt)).toEqual([...week.map((x) => x.startAt)].sort((a, b) => a - b));
  });

  it("keeps one that just started for half an hour, then drops it", () => {
    const start = at("2026-11-24T00:00:00Z");
    expect(upcomingRecurring(start + 29 * 60).some((x) => x.series.id === "jungle-kotj" && x.startAt === start)).toBe(true);
    expect(upcomingRecurring(start + 31 * 60).some((x) => x.series.id === "jungle-kotj" && x.startAt === start)).toBe(false);
  });

  it("never lists the same start twice", () => {
    const keys = week.map((x) => `${x.series.id}-${x.startAt}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("works for a series in another time zone", () => {
    const tokyo: RecurringSeries = { ...RECURRING_ONLINE[0], id: "t", days: [3], hour: 20, minute: 30, timeZone: "Asia/Tokyo" };
    expect(upcomingRecurring(now, 7, 0, [tokyo]).map((x) => iso(x.startAt))).toEqual(["2026-11-25T11:30:00.000Z"]);
  });
});
