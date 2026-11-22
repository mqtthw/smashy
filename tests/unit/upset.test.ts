import { describe, expect, it } from "vitest";
import { seedGroup, upsetFactor } from "@/lib/brackets/upset";

describe("upset factor", () => {
  it("groups seeds by expected placement", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 13, 16, 17, 24, 25, 32, 33].map(seedGroup)).toEqual([1, 2, 3, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11]);
  });
  it("counts the groups between the winner and the loser", () => {
    expect(upsetFactor(9, 1)).toBe(6);
    expect(upsetFactor(2, 1)).toBe(1);
    expect(upsetFactor(16, 5)).toBe(3);
    expect(upsetFactor(33, 32)).toBe(1);
  });
  it("is zero when the favourite wins, the seeds share a group, or a seed is missing", () => {
    expect(upsetFactor(1, 9)).toBe(0);
    expect(upsetFactor(6, 5)).toBe(0);
    expect(upsetFactor(12, 9)).toBe(0);
    expect(upsetFactor(null, 3)).toBe(0);
    expect(upsetFactor(4, undefined)).toBe(0);
    expect(upsetFactor(0, 3)).toBe(0);
  });
});
