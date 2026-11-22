import { describe, expect, it } from "vitest";
import { defaultGroupId, poolSettled, stillPlayingGroupId, topCutGroupId, type PhaseInfo } from "@/lib/brackets/phases";

const ph = (name: string, order: number, ids: string[], state = 3): PhaseInfo => ({ name, order, groups: ids.map((id) => ({ id, state })) });

describe("defaultGroupId", () => {
  // Genesis X Melee Singles: start.gg orders R2 Pools after Top 8.
  const genesis = [ph("R1 Pools", 1, ["a1", "a2"]), ph("Top 64", 3, ["t64"]), ph("Top 8", 4, ["t8"]), ph("R2 Pools", 5, ["b1", "b2"])];
  it("opens a finished event on its final bracket", () => {
    expect(defaultGroupId(genesis, true)).toBe("t8");
  });
  it("skips side brackets like redemption", () => {
    expect(defaultGroupId([ph("Pools", 1, ["p1", "p2"]), ph("Top 8", 2, ["t8"]), ph("Redemption Bracket", 3, ["r"])], true)).toBe("t8");
  });
  it("skips a top-cut phase that was never played, and doesn't mistake names like Westside for side brackets", () => {
    expect(defaultGroupId([ph("Pools", 1, ["p1", "p2"]), ph("Top 8", 2, ["t8"]), ph("Top 4", 3, ["t4"], 1)], true)).toBe("t8");
    expect(defaultGroupId([ph("Pools", 1, ["p1", "p2"]), ph("Top 8 Westside", 2, ["t8"]), ph("Side Bracket", 3, ["s"])], true)).toBe("t8");
  });
  it("opens a running event on the latest started phase", () => {
    const live = [ph("Pools", 1, ["p1", "p2"], 3), ph("Top 8", 2, ["t8"], 2), ph("Top 4", 3, ["t4"], 1)];
    expect(defaultGroupId(live, false)).toBe("t8");
    expect(defaultGroupId([ph("Pools", 1, ["p1"], 1)], false)).toBe("p1");
  });
  it("opens a running event on its main bracket, not a side one that started later (round 454)", () => {
    // Port Priority DX Melee Singles: Respawn Pool and Salmon Ladder come after Top 132 in start.gg's order.
    const pp = [ph("Pools", 1, ["p1", "p2"], 3), ph("Top 132", 2, ["h1", "h2"], 2), ph("Respawn Pool", 3, ["r"], 2), ph("Salmon Ladder", 4, ["s"], 2), ph("Top 16", 5, ["t16"], 1)];
    expect(defaultGroupId(pp, false)).toBe("h1");
    expect(defaultGroupId([ph("Pools", 1, ["p1"], 1), ph("Amateur Ladder", 2, ["s"], 2)], false)).toBe("s");
  });
});

describe("stillPlayingGroupId (round 458)", () => {
  // Port Priority DX: Top 8 is "started" on start.gg (set up) while Top 16 is being played.
  const pp = [ph("Top 132", 2, ["h1", "h2"], 3), ph("Respawn Pool", 3, ["r"], 2), ph("Top 16", 5, ["t16"], 2), ph("Top 8", 6, ["t8"], 2)];
  it("opens the pool that's still going before a top cut that hasn't begun", () => {
    expect(stillPlayingGroupId(pp, "t8")).toBe("t16");
  });
  it("skips side brackets and finished phases, and gives up when there's nothing earlier", () => {
    expect(stillPlayingGroupId([ph("Top 132", 2, ["h1"], 3), ph("Respawn Pool", 3, ["r"], 2), ph("Top 8", 6, ["t8"], 2)], "t8")).toBeNull();
    expect(stillPlayingGroupId(pp, "h1")).toBeNull();
  });
});

describe("poolSettled: when a finished pool can be kept for an hour", () => {
  it("keeps a pool the link asked for by name, and any pool once the event is over", () => {
    expect(poolSettled(true, true, false)).toBe(true);
    expect(poolSettled(true, false, true)).toBe(true);
  });
  it("keeps checking the event's default link while the event runs (it moves on to the next phase)", () => {
    expect(poolSettled(true, false, false)).toBe(false);
  });
  it("never keeps a pool that isn't finished", () => {
    expect(poolSettled(false, true, true)).toBe(false);
  });
});

describe("topCutGroupId", () => {
  const g = (id: string, phase: string) => ({ id, phase });
  it("finds a Top 8 phase after play-ins and selection (The Contract #225)", () => {
    expect(topCutGroupId([g("1", "Bracket"), g("2", "Selection"), g("3", "Top 8")])).toBe("3");
  });
  it("skips multi-pool phases even when start.gg lists them after Top 8", () => {
    expect(topCutGroupId([g("a", "R1 Pools"), g("b", "R1 Pools"), g("t", "Top 8"), g("c", "R2 Pools"), g("d", "R2 Pools")])).toBe("t");
  });
  it("falls back to the last single-pool phase that isn't a side bracket", () => {
    expect(topCutGroupId([g("a", "Pools"), g("b", "Pools"), g("m", "Main Bracket"), g("r", "Redemption")])).toBe("m");
  });
  it("is null with a single pool", () => {
    expect(topCutGroupId([g("only", "Bracket")])).toBeNull();
  });
});
