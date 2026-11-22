import { describe, expect, it } from "vitest";
import { summarizeRun, type LiveRunSet } from "@/lib/playerLiveSummary";

const set = (id: string, state: LiveRunSet["state"], opp: string | null, won: boolean | null, order: number, score: [number, number] | null = null): LiveRunSet => ({
  id,
  round: "R",
  identifier: id,
  state,
  winnerEntrantId: won === null ? null : won ? "me" : "them",
  me: { entrantId: "me", tag: "Me", playerId: "1", score: score?.[0] ?? null },
  opp: { entrantId: opp ? "them" : null, tag: opp, playerId: null, score: score?.[1] ?? null },
  order,
  groupId: "g",
});

describe("a player's run through a live bracket (round 455)", () => {
  it("shows the next set and who they lost to", () => {
    const run = summarizeRun([set("b", "done", "Zain", false, 2, [1, 3]), set("a", "done", "X", true, 1), set("c", "pending", "Y", null, 4e9)]);
    expect(run.status).toBe("next");
    expect(run.current?.id).toBe("c");
    expect(run.losses.map((s) => s.opp.tag)).toEqual(["Zain"]);
    expect(run.wins).toBe(1);
  });

  it("says they're playing when a set is on", () => {
    expect(summarizeRun([set("a", "done", "X", true, 1), set("b", "live", "Y", null, 4e9)]).status).toBe("playing");
  });

  it("is out after a last loss with nothing left, and waiting after a last win", () => {
    expect(summarizeRun([set("a", "done", "X", false, 1), set("b", "done", "Y", false, 2)]).status).toBe("out");
    expect(summarizeRun([set("a", "done", "X", true, 1)]).status).toBe("waiting");
  });

  it("doesn't count a DQ as a loss", () => {
    expect(summarizeRun([set("a", "done", "X", false, 1, [-1, 0])]).losses).toEqual([]);
  });
});
