import { describe, expect, it } from "vitest";
import { setLabel } from "@/lib/brackets/setLabel";
import type { SetPlayer } from "@/lib/brackets/types";

const player = (name: string, score: number | null, won: boolean): SetPlayer => ({ entrantId: name, name, prefix: null, seed: null, score, won });
const base = { roundLabel: "Winners Semi-Final", identifier: "C", waitingOn: [null, null] as [string | null, string | null] };

describe("a bracket set's screen-reader label", () => {
  it("says who won and the score once it's over", () => {
    expect(setLabel({ ...base, state: "done", players: [player("Bjorn", 2, true), player("Flo", 1, false)] })).toBe("Winners Semi-Final, set C: Bjorn against Flo, final, Bjorn won 2 to 1. Open the set.");
    expect(setLabel({ ...base, state: "done", players: [player("Bjorn", 0, false), player("Flo", 2, true)] })).toContain("final, Flo won 2 to 0");
  });
  it("handles a DQ and a result with no game count", () => {
    expect(setLabel({ ...base, state: "done", players: [player("Bjorn", 0, true), player("Flo", -1, false)] })).toContain("final, Bjorn won by DQ. Open the set.");
    expect(setLabel({ ...base, state: "done", players: [player("Bjorn", null, true), player("Flo", null, false)] })).toContain("final, Bjorn won. Open the set.");
  });
  it("says when it is being played or still to come, with who it is waiting on", () => {
    expect(setLabel({ ...base, state: "live", players: [player("Bjorn", null, false), player("Flo", null, false)] })).toContain("Bjorn against Flo, being played now");
    expect(setLabel({ roundLabel: "Grand Final", identifier: null, state: "pending", players: [player("Bjorn", null, false), null], waitingOn: [null, "Winner of D"] })).toBe("Grand Final: Bjorn against Winner of D, not played yet. Open the set.");
  });
});
