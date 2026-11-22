import { describe, expect, it } from "vitest";
import { roundRobinWeeks, suggestDivisions, suggestedDivisionCount, weekDeadline } from "@/lib/leagueSchedule";

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);
const key = (a: string, b: string) => [a, b].sort().join("-");

describe("league divisions (round 465)", () => {
  it("puts the best seeds in Division 1, sizes differing by at most one", () => {
    const players = [5, 1, null, 3, 2, 4, 7].map((seed, i) => ({ id: `p${i}`, seed }));
    const split = suggestDivisions(players, 2);
    expect(split.map((d) => d.length)).toEqual([4, 3]);
    expect(split[0].map((p) => p.seed)).toEqual([1, 2, 3, 4]);
    expect(split[1].map((p) => p.seed)).toEqual([5, 7, null]);
  });
  it("suggests about 8 players a division", () => {
    expect([1, 7, 12, 18, 30].map(suggestedDivisionCount)).toEqual([1, 1, 2, 2, 4]);
  });
});

describe("weekly round robin (round 465)", () => {
  it("meets everyone once before repeating, everyone plays each week (even size)", () => {
    const weeks = roundRobinWeeks(ids(6), 5);
    const seen = new Set<string>();
    for (const week of weeks) {
      expect(week).toHaveLength(3);
      expect(new Set(week.flat()).size).toBe(6);
      for (const [a, b] of week) seen.add(key(a, b));
    }
    expect(seen.size).toBe(15); // all 6*5/2 pairs
  });
  it("gives one bye a week in an odd division, and each player sits out once per cycle", () => {
    const weeks = roundRobinWeeks(ids(5), 5);
    const byes = weeks.map((w) => ids(5).find((p) => !w.flat().includes(p)));
    expect(weeks.every((w) => w.length === 2)).toBe(true);
    expect(new Set(byes).size).toBe(5);
  });
  it("starts over when there are more weeks than opponents", () => {
    const weeks = roundRobinWeeks(ids(4), 6);
    expect(key(...weeks[3][0])).toBe(key(...weeks[0][0]));
  });
  it("closes each week seven days after the last one", () => {
    const start = Date.parse("2026-11-16T06:00:00Z");
    expect(weekDeadline(start, 1).toISOString()).toBe("2026-11-23T05:59:59.000Z");
  });
});
