// Round 583: the Smash history fill chain keeps going while it saves something, up to 12 runs a day.
import { describe, expect, it } from "vitest";
import { MAX_RUNS, shouldContinue } from "@/lib/historyFillChain";

describe("Smash history fill chain", () => {
  it("keeps going while a run saved something", () => {
    expect(shouldContinue(1, { saved: 0, standings: 0, brackets: 3 })).toBe(true);
    expect(shouldContinue(5, { saved: 2, standings: 0, brackets: 0 })).toBe(true);
  });

  it("stops when a run saved nothing (all filled, or start.gg busy) or failed", () => {
    expect(shouldContinue(1, { saved: 0, standings: 0, brackets: 0 })).toBe(false);
    expect(shouldContinue(1, null)).toBe(false);
  });

  it("stops after the day's last run", () => {
    expect(MAX_RUNS).toBeLessThanOrEqual(30); // two hours a day at most (12 until round 801, raised for the players' copies)
    expect(shouldContinue(MAX_RUNS, { saved: 5, standings: 5, brackets: 5 })).toBe(false);
  });
  it("keeps going while players' saved copies are being filled, and stops when a run saves nothing", () => {
    expect(shouldContinue(1, { saved: 0, standings: 0, brackets: 0, players: 3 })).toBe(true);
    expect(shouldContinue(1, { saved: 0, standings: 0, brackets: 0, players: 0 })).toBe(false);
  });
});
