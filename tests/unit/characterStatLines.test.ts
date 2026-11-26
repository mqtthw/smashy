import { describe, expect, it } from "vitest";
import { CHARACTERS } from "@/lib/characters";
import { statLines } from "@/lib/characterStatLines";
import { ULTIMATE_STATS } from "@/lib/characterStats";
import { MELEE_STATS } from "@/lib/characterStats.melee";

describe("character stat lines", () => {
  const all = { a: { weight: 100, fallSpeed: 1.5 }, b: { weight: 80, fallSpeed: 1.397792 }, c: { weight: 100 } };

  it("ranks highest first, with ties sharing a place, and scales the bar from lowest to highest", () => {
    expect(statLines("a", all)).toEqual([
      { field: "weight", value: 100, rank: 1, total: 3, share: 1 },
      { field: "fallSpeed", value: 1.5, rank: 1, total: 2, share: 1 },
    ]);
    expect(statLines("b", all)).toEqual([
      { field: "weight", value: 80, rank: 3, total: 3, share: 0 },
      { field: "fallSpeed", value: 1.398, rank: 2, total: 2, share: 0 },
    ]);
    expect(statLines("c", all).map((l) => l.rank)).toEqual([1]);
    expect(statLines("nobody", all)).toEqual([]);
  });

  it("the saved numbers are all for real Ultimate characters, and the known ones are right", () => {
    const roster = new Set(CHARACTERS.ultimate.map((c) => c.key));
    for (const key of Object.keys(ULTIMATE_STATS)) expect(roster.has(key), key).toBe(true);
    expect(Object.keys(ULTIMATE_STATS).length).toBeGreaterThan(75);
    expect(ULTIMATE_STATS["king-k-rool"].weight).toBe(133);
    expect(ULTIMATE_STATS.fox.fallSpeed).toBe(2.1);
    expect(statLines("bowser")[0]).toMatchObject({ field: "weight", value: 135, rank: 1 });
  });

  it("Melee's numbers cover all 26 characters, with the known ones right", () => {
    const roster = CHARACTERS.melee.map((c) => c.key).sort();
    expect(Object.keys(MELEE_STATS).sort()).toEqual(roster);
    expect(MELEE_STATS.fox).toMatchObject({ weight: 75, fallSpeed: 2.8, gravity: 0.23 });
    expect(statLines("bowser", MELEE_STATS)[0]).toMatchObject({ field: "weight", value: 117, rank: 1, total: 26 });
    expect(statLines("jigglypuff", MELEE_STATS).map((l) => l.field)).toEqual(["weight", "fallSpeed", "gravity", "airSpeed"]);
  });
});
