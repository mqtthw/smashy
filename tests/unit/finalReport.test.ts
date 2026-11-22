import { describe, expect, it } from "vitest";
import { finalScoreProblem, finalsAgree } from "@/lib/liveSet";

describe("player-reported final scores", () => {
  it("accepts only scores a set can end on", () => {
    expect(finalScoreProblem(3, 1, [2, 0])).toBeNull();
    expect(finalScoreProblem(3, 2, [1, 2])).toBeNull();
    expect(finalScoreProblem(5, 1, [3, 2])).toBeNull();
    expect(finalScoreProblem(3, 1, [1, 0])).toMatch(/takes 2 games/); // the set isn't over
    expect(finalScoreProblem(3, 1, [3, 0])).toMatch(/takes 2 games/); // too many
    expect(finalScoreProblem(3, 1, [0, 2])).toMatch(/takes 2 games/); // winner has fewer
    expect(finalScoreProblem(3, 2, [2, 2])).toMatch(/takes 2|as many/);
    expect(finalScoreProblem(3, 1, [-1, 0])).toMatch(/how many games/); // no DQs from players
    expect(finalScoreProblem(1, 2, [0, 1])).toBeNull();
  });
  it("knows when both players reported the same thing", () => {
    const r = (winner: 1 | 2, score: [number, number]) => ({ winner, score, at: "" });
    expect(finalsAgree({ "1": r(1, [2, 1]), "2": r(1, [2, 1]) })).toEqual(r(1, [2, 1]));
    expect(finalsAgree({ "1": r(1, [2, 1]), "2": r(1, [2, 0]) })).toBeNull();
    expect(finalsAgree({ "1": r(1, [2, 1]) })).toBeNull();
    expect(finalsAgree(undefined)).toBeNull();
  });
});

describe("setup names", () => {
  it("turns a number into 'Setup N' and keeps names short", async () => {
    const { cleanStation } = await import("@/lib/liveSet");
    expect(cleanStation("3")).toBe("Setup 3");
    expect(cleanStation("  Stream  ")).toBe("Stream");
    expect(cleanStation("Setup   12")).toBe("Setup 12");
    expect(cleanStation("")).toBeNull();
    expect(cleanStation("A very long setup name indeed")).toHaveLength(20);
  });
});

describe("next free setup", () => {
  it("picks the lowest setup number not in use, ignoring named setups", async () => {
    const { nextFreeSetup } = await import("@/lib/liveSet");
    expect(nextFreeSetup([])).toBe("Setup 1");
    expect(nextFreeSetup(["Setup 1", "Setup 3", null, "Stream"])).toBe("Setup 2");
    expect(nextFreeSetup(["Setup 1", "Setup 2"])).toBe("Setup 3");
  });
});
