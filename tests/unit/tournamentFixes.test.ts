// Round 203: multi-day events stay live, side brackets don't decide the Top 3, My sets ordering.
import { describe, expect, it } from "vitest";
import { isFinalGroup } from "@/lib/brackets/podium";
import { myEventRank } from "@/lib/brackets/phases";
import type { Bracket } from "@/lib/brackets/types";
import { isRunning } from "@/lib/format";

const H = 3600;
const D = 86400;

describe("isRunning for multi-day events", () => {
  // A weekend major: every bracket starts Friday or Saturday morning, Top 8 is Sunday evening.
  const fri = 100 * D + 10 * H;
  const major = { startAt: fri, endAt: fri + 2 * D + 12 * H, events: [{ startAt: fri }, { startAt: fri + D }] };
  it("is live on the last day, long after the last bracket started", () => {
    expect(isRunning(major, fri + 2 * D + 8 * H)).toBe(true); // Sunday 6 PM
    expect(isRunning(major, fri + D + 20 * H)).toBe(true); // overnight between days
  });
  it("isn't live before the first bracket or after the end", () => {
    expect(isRunning(major, fri - H)).toBe(false);
    expect(isRunning(major, fri + 2 * D + 13 * H)).toBe(false);
  });
  it("a local with a next-day end still stops being live 12 hours after it starts", () => {
    const start = 200 * D + 19 * H;
    const local = { startAt: start, endAt: start + 29 * H, events: [{ startAt: start }] };
    expect(isRunning(local, start + 2 * H)).toBe(true);
    expect(isRunning(local, start + 13 * H)).toBe(false);
  });
  it("a season-long series keeps the 12-hour rule between its weekly brackets", () => {
    const season = { startAt: 0, endAt: 60 * D, events: [{ startAt: D }, { startAt: 8 * D }] };
    expect(isRunning(season, 5 * D)).toBe(false);
    expect(isRunning(season, 8 * D + 2 * H)).toBe(true);
  });
});

describe("the event's final bracket", () => {
  const withGroups = (groups: { id: string; phase: string }[], groupId: string) => ({ event: { groups }, groupId }) as unknown as Bracket;
  const groups = [{ id: "p1", phase: "Pools" }, { id: "p2", phase: "Pools" }, { id: "top8", phase: "Top 8" }, { id: "am", phase: "Amateur Bracket" }];
  it("is the last main phase, not a side bracket listed after it", () => {
    expect(isFinalGroup(withGroups(groups, "top8"))).toBe(true);
    expect(isFinalGroup(withGroups(groups, "am"))).toBe(false);
    expect(isFinalGroup(withGroups(groups, "p1"))).toBe(false);
  });
  it("still works when every phase is a side bracket, or there are none", () => {
    expect(isFinalGroup(withGroups([{ id: "r", phase: "Redemption" }], "r"))).toBe(true);
    expect(isFinalGroup(withGroups([], "x"))).toBe(true);
  });
});

describe("My sets ordering", () => {
  it("puts what's on now first, then upcoming, then finished", () => {
    const now = 1000;
    expect(myEventRank({ state: "ACTIVE", startAt: 900 }, now)).toBe(0);
    expect(myEventRank({ state: "CREATED", startAt: 990 }, now)).toBe(0); // started, not marked active yet
    expect(myEventRank({ state: "CREATED", startAt: 2000 }, now)).toBe(1);
    expect(myEventRank({ state: "COMPLETED", startAt: 500 }, now)).toBe(2);
  });
});
