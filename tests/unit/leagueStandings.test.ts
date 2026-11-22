import { describe, expect, it } from "vitest";
import { divisionStandings, type StandingSet } from "@/lib/leagueStandings";

const set = (p1: string, p2: string, s1: number, s2: number, state = "reported"): StandingSet => ({
  p1Id: p1, p2Id: p2, state, p1Score: s1, p2Score: s2, winnerId: s1 > s2 ? p1 : p2,
});

describe("league division standings (round 466)", () => {
  it("orders by wins, then head to head for two tied players", () => {
    const rows = divisionStandings(["a", "b", "c"], [set("a", "c", 2, 0), set("b", "c", 2, 1), set("b", "a", 2, 1)]);
    expect(rows.map((r) => [r.userId, r.wins, r.losses])).toEqual([["b", 2, 0], ["a", 1, 1], ["c", 0, 2]]);
  });
  it("breaks a two-way tie on wins by who won their set, before game difference", () => {
    // a and b are both 1-1; a has the better game difference (+1 vs -1) but b beat a.
    const rows = divisionStandings(["a", "b", "c", "d"], [set("a", "c", 2, 0), set("b", "a", 2, 1), set("d", "b", 2, 0), set("d", "c", 2, 0)]);
    expect(rows.map((r) => r.userId)).toEqual(["d", "b", "a", "c"]);
  });
  it("leaves disputed and unplayed sets out, and counts a double loss for both", () => {
    const rows = divisionStandings(["a", "b"], [
      set("a", "b", 2, 0, "disputed"),
      { p1Id: "a", p2Id: "b", state: "pending", p1Score: null, p2Score: null, winnerId: null },
      { p1Id: "a", p2Id: "b", state: "double_loss", p1Score: null, p2Score: null, winnerId: null },
    ]);
    expect(rows.map((r) => [r.played, r.wins, r.losses])).toEqual([[1, 0, 1], [1, 0, 1]]);
  });
  it("gives a no-show win without games", () => {
    const rows = divisionStandings(["a", "b"], [{ p1Id: "a", p2Id: "b", state: "no_show", p1Score: null, p2Score: null, winnerId: "b" }]);
    expect(rows[0]).toMatchObject({ userId: "b", wins: 1, gamesFor: 0 });
  });
});
