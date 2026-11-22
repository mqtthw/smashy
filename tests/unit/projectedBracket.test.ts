import { describe, expect, it } from "vitest";
import { projectBracket, projectedWinners } from "@/lib/brackets/projected";
import type { BracketSet, SetPlayer } from "@/lib/brackets/types";

const p = (name: string, seed: number | null, won = false, score: number | null = null): SetPlayer => ({ entrantId: name, name, prefix: null, seed, score, won });
const set = (id: string, players: [SetPlayer | null, SetPlayer | null], waitingOn: [string | null, string | null] = [null, null], state: BracketSet["state"] = "pending", round = 1): BracketSet => ({
  id, identifier: id, round, roundLabel: "R", winnersSide: round > 0, state, players, waitingOn, completedAt: null,
});

describe("projected bracket (round 452)", () => {
  it("sends the better seed through unplayed sets, and losers to the losers side", () => {
    const A = set("A", [p("One", 1), p("Four", 4)]);
    const B = set("B", [p("Two", 2), p("Three", 3)]);
    const C = set("C", [null, null], ["Winner of A", "Winner of B"], "pending", 2);
    const D = set("D", [null, null], ["Loser of A", "Loser of B"], "pending", -1);
    const proj = projectBracket({ rounds: [{ key: "w1", label: "", winnersSide: true, round: 1, sets: [A, B] }, { key: "w2", label: "", winnersSide: true, round: 2, sets: [C] }, { key: "l1", label: "", winnersSide: false, round: -1, sets: [D] }] });
    expect(proj.get("C")!.map((x) => x?.name)).toEqual(["One", "Two"]);
    expect(proj.get("D")!.map((x) => x?.name)).toEqual(["Four", "Three"]);
  });

  it("uses real results over seeds, upsets included", () => {
    const A = set("A", [p("One", 1), p("Four", 4, true, 2)], [null, null], "done");
    const B = set("B", [p("Two", 2), p("Three", 3)]);
    const C = set("C", [null, null], ["Winner of A", "Winner of B"], "pending", 2);
    const proj = projectBracket({ rounds: [{ key: "w1", label: "", winnersSide: true, round: 1, sets: [A, B, C] }] });
    expect(proj.get("C")!.map((x) => x?.name)).toEqual(["Four", "Two"]);
  });

  it("leaves a slot empty when seeds can't tell, and passes byes through", () => {
    const A = set("A", [p("X", null), p("Y", null)]);
    const B = set("B", [p("Two", 2), null], [null, "Bye"]);
    const C = set("C", [null, null], ["Winner of A", "Winner of B"], "pending", 2);
    const proj = projectBracket({ rounds: [{ key: "w1", label: "", winnersSide: true, round: 1, sets: [A, B, C] }] });
    expect(proj.get("C")!.map((x) => x?.name ?? null)).toEqual([null, "Two"]);
  });

  it("keeps real players where they're already known", () => {
    const real = p("Real", 7);
    const C = set("C", [real, null], [null, "Winner of Z"], "pending", 2);
    const proj = projectBracket({ rounds: [{ key: "w2", label: "", winnersSide: true, round: 2, sets: [C] }] });
    expect(proj.get("C")![0]).toBe(real);
    expect(proj.get("C")![1]).toBeNull();
  });

  it("fills slots from an earlier phase with who's projected to come through (round 454)", () => {
    const A = { ...set("A", [null, p("Real", 8)], ["TBD", null]), projectedIn: [p("Comer", 1), null] as [SetPlayer | null, SetPlayer | null] };
    const C = set("C", [null, null], ["Winner of A", "TBD"], "pending", 2);
    const proj = projectBracket({ rounds: [{ key: "w1", label: "", winnersSide: true, round: 1, sets: [A, C] }] });
    expect(proj.get("A")!.map((x) => x?.name)).toEqual(["Comer", "Real"]);
    expect(proj.get("C")![0]?.name).toBe("Comer");
  });

  it("says who wins the sets a pool sends on from (round 454)", () => {
    const A = set("A", [p("One", 1), p("Four", 4)]);
    const B = set("B", [p("Two", 2), p("Three", 3, true, 2)], [null, null], "done");
    const wins = projectedWinners({ rounds: [{ key: "w1", label: "", winnersSide: true, round: 1, sets: [A, B] }] }, ["A", "B", "nope"]);
    expect(wins.map((x) => x?.name ?? null)).toEqual(["One", "Three", null]);
  });
});
