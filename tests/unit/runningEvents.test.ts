import { describe, expect, it } from "vitest";
import { bracketStart, currentBracket, isRunning, whenLabel } from "@/lib/format";

const H = 3600;
const D = 24 * H;
describe("live tournaments", () => {
  // High-Tier Brawl: the tournament "starts" days before its only bracket.
  const early = { startAt: 1000, endAt: 1000 + 6 * D, timezone: "UTC", events: [{ id: "a", startAt: 1000 + 5 * D }] };
  it("counts from the bracket's start, not start.gg's tournament start", () => {
    expect(bracketStart(early, 1000 + H)).toBe(1000 + 5 * D);
    expect(isRunning(early, 1000 + H)).toBe(false);
    expect(isRunning(early, 1000 + 5 * D + 60)).toBe(true);
    expect(whenLabel(early, 1000 + H)).not.toContain("Live");
  });
  it("treats a season series by its current or next weekly bracket", () => {
    const season = { startAt: 0, endAt: 30 * D, timezone: null, events: [{ id: "w1", startAt: D }, { id: "w2", startAt: 8 * D }, { id: "w3", startAt: 15 * D }] };
    expect(isRunning(season, 5 * D)).toBe(false); // between weeks
    expect(bracketStart(season, 5 * D)).toBe(8 * D); // the next one
    expect(isRunning(season, 8 * D + 2 * H)).toBe(true);
    expect(currentBracket(season, 8 * D + 2 * H)?.id).toBe("w2");
    expect(isRunning(season, 8 * D + 13 * H)).toBe(false); // that bracket is over
  });
  it("links the biggest bracket running now", () => {
    const local = { startAt: 0, endAt: D, timezone: null, events: [{ id: "singles", startAt: 0, numEntrants: 40 }, { id: "doubles", startAt: 2 * H, numEntrants: 12 }] };
    expect(currentBracket(local, 3 * H)?.id).toBe("singles");
  });
  it("never puts a bracket before its tournament (AM/PM mix-ups)", () => {
    // Branson's Brawl #6: tournament 5:30 PM, bracket listed 5:30 AM the same day.
    const t = { startAt: 12 * H, endAt: 18 * H, timezone: null, events: [{ id: "s", startAt: 0 }] };
    expect(bracketStart(t, H)).toBe(12 * H);
    expect(isRunning(t, 13 * H)).toBe(true);
    expect(currentBracket(t, 13 * H)?.id).toBe("s");
  });
  it("falls back to the tournament times, and stops at the end time", () => {
    const t = { startAt: 1000, endAt: 1000 + 5 * H, timezone: null, events: [{ startAt: null }] };
    expect(isRunning(t, 1000 + H)).toBe(true);
    expect(isRunning(t, 1000 + 6 * H)).toBe(false);
    expect(isRunning({ startAt: 1000, endAt: null }, 1000 + 23 * H)).toBe(true); // no end: the day of
  });
});
