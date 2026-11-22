import { describe, expect, it } from "vitest";
import { applyLive, freshLive, livePhase, liveScore, type LiveState } from "@/lib/liveSet";
import type { StrikeRules } from "@/lib/striking";

const box: StrikeRules = {
  starters: ["Battlefield", "Final Destination", "Pokémon Stadium 2", "Smashville", "Town and City"],
  counterpicks: ["Kalos Pokémon League", "Yoshi's Story"],
  pattern: "1-2-1",
  bans: 2,
  dsr: "modified",
  bestOf: 3,
};
const start = (first: 1 | 2 = 1): LiveState => ({ ...freshLive(), first });

describe("live sets", () => {
  it("a longer set uses the ruleset's own number of bans for longer sets", () => {
    const rules: StrikeRules = { ...box, bans: 1, bansLong: 0, bestOfLong: 5 };
    const afterGame1: LiveState = { ...start(), struck: [], games: [{ stage: "Battlefield", winner: 1 }] };
    // Best of 3: the winner bans 1, then the loser picks.
    expect(livePhase(rules, 3, afterGame1)).toMatchObject({ kind: "ban", turn: 1, count: 1 });
    // Best of 5: no bans, so the loser picks straight away, from every stage.
    const pick = livePhase(rules, 5, afterGame1);
    expect(pick).toMatchObject({ kind: "pick", turn: 2 });
    expect(pick.kind === "pick" && pick.options).toHaveLength(7);
    // A ban sent anyway is refused.
    expect(() => applyLive(rules, 5, afterGame1, 1, { type: "ban", stage: "Smashville" })).toThrow();
  });

  it("game 1: strikes in the ruleset's pattern from the coin-flip winner", () => {
    let s = start(2); // player 2 strikes first: 2, 1, 1, 2
    expect(livePhase(box, 3, s)).toMatchObject({ kind: "strike", turn: 2, count: 1 });
    expect(() => applyLive(box, 3, s, 1, { type: "strike", stage: "Battlefield" })).toThrow(/turn/);
    s = applyLive(box, 3, s, 2, { type: "strike", stage: "Final Destination" });
    expect(livePhase(box, 3, s)).toMatchObject({ kind: "strike", turn: 1, count: 2 });
    s = applyLive(box, 3, s, 1, { type: "strike", stage: "Smashville" });
    s = applyLive(box, 3, s, 1, { type: "strike", stage: "Town and City" });
    expect(() => applyLive(box, 3, s, 2, { type: "strike", stage: "Smashville" })).toThrow(/can't be chosen/);
    s = applyLive(box, 3, s, 2, { type: "strike", stage: "Battlefield" });
    expect(livePhase(box, 3, s)).toEqual({ kind: "play", stage: "Pokémon Stadium 2", game: 1 });
  });

  it("both players must agree on a game; a different answer is a dispute", () => {
    let s: LiveState = { ...start(), stage: "Battlefield" };
    s = applyLive(box, 3, s, 1, { type: "report", winner: 1 });
    expect(s.games).toHaveLength(0); // waiting for the other player
    const disputed = applyLive(box, 3, s, 2, { type: "report", winner: 2 });
    expect(disputed.report?.disputed).toBe(true);
    s = applyLive(box, 3, s, 2, { type: "report", winner: 1 });
    expect(liveScore(s)).toEqual([1, 0]);
    expect(s.stage).toBeNull();
  });

  it("after a game: the winner bans 2, the loser picks, and can't go back to the last stage they won on", () => {
    let s: LiveState = { ...start(), games: [{ stage: "Smashville", winner: 2 }, { stage: "Battlefield", winner: 1 }] };
    // Player 1 won the last game: player 1 bans 2, then player 2 picks (not Smashville, where they last won).
    expect(livePhase(box, 3, s)).toMatchObject({ kind: "ban", turn: 1, count: 2 });
    s = applyLive(box, 3, s, 1, { type: "ban", stage: "Final Destination" });
    s = applyLive(box, 3, s, 1, { type: "ban", stage: "Town and City" });
    const pick = livePhase(box, 3, s);
    expect(pick.kind).toBe("pick");
    if (pick.kind === "pick") {
      expect(pick.turn).toBe(2);
      expect(pick.options).not.toContain("Smashville");
      expect(pick.options).not.toContain("Final Destination");
    }
    expect(() => applyLive(box, 3, s, 2, { type: "pick", stage: "Smashville" })).toThrow();
    s = applyLive(box, 3, s, 2, { type: "pick", stage: "Yoshi's Story" });
    expect(livePhase(box, 3, s)).toMatchObject({ kind: "play", stage: "Yoshi's Story", game: 3 });
  });

  it("ends when someone reaches the wins needed", () => {
    const s: LiveState = { ...start(), games: [{ stage: "a", winner: 1 }, { stage: "b", winner: 1 }] };
    expect(livePhase(box, 3, s)).toEqual({ kind: "done", winner: 1 });
    expect(() => applyLive(box, 3, s, 1, { type: "report", winner: 1 })).toThrow(/over/);
    expect(livePhase(box, 5, s).kind).not.toBe("done"); // best of 5 needs 3
  });
});
