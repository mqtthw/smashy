import { describe, expect, it } from "vitest";
import { bracketStandings, podium, podiumLine, podiumPlacements } from "@/lib/brackets/podium";
import type { Bracket, BracketSet, SetPlayer } from "@/lib/brackets/types";

const p = (name: string, won: boolean): SetPlayer => ({ entrantId: name, name, prefix: null, seed: null, score: won ? 3 : 1, won });
const set = (id: string, round: number, a: string, b: string, state: BracketSet["state"] = "done"): BracketSet => ({
  id, identifier: id, round, roundLabel: "", winnersSide: round > 0, state,
  players: [p(a, state === "done"), p(b, false)], waitingOn: [null, null], completedAt: null,
});
const bracket = (sets: BracketSet[], type: Bracket["type"] = "double", finished = true): Bracket => ({
  event: { source: "startgg", eventId: "1", eventName: "", game: null, tournamentName: "", tournamentSlug: null, sourceUrl: "", groups: [] },
  groupId: "g", type, finished, live: !finished,
  rounds: [...new Set(sets.map((s) => s.round))].map((r) => ({ key: String(r), label: "", winnersSide: r > 0, round: r, sets: sets.filter((s) => s.round === r) })),
});

describe("podium", () => {
  it("reads 1st and 2nd from Grand Finals and 3rd from Losers Finals", () => {
    const b = bracket([set("W", 2, "Ann", "Bo"), set("GF", 3, "Ann", "Cy"), set("LF", -3, "Cy", "Bo"), set("L1", -2, "Bo", "Dee")]);
    expect(podium(b)).toMatchObject({ first: { name: "Ann" }, second: { name: "Cy" }, third: { name: "Bo" } });
  });
  it("uses the Grand Final reset when it was played, and ignores an unplayed one", () => {
    const reset = bracket([set("GF", 3, "Ann", "Cy"), set("GF2", 4, "Cy", "Ann"), set("LF", -3, "Cy", "Bo")]);
    expect(podium(reset)?.first.name).toBe("Cy");
    const none = bracket([set("GF", 3, "Ann", "Cy"), set("GF2", 4, "Cy", "Ann", "pending"), set("LF", -3, "Cy", "Bo")]);
    expect(podium(none)?.first.name).toBe("Ann");
  });
  it("uses the reset when start.gg puts it in the same round as the Grand Final", () => {
    // Genesis X Ultimate: Sonix won GF1 from losers, Zomba won the reset (both are round 3 on start.gg).
    const gf = { ...set("GF", 3, "Sonix", "Zomba"), completedAt: 100 };
    const reset = { ...set("GF2", 3, "Zomba", "Sonix"), completedAt: 200 };
    expect(podium(bracket([reset, gf, set("LF", -3, "Sonix", "Sparg0")]))).toMatchObject({ first: { name: "Zomba" }, second: { name: "Sonix" }, third: { name: "Sparg0" } });
    expect(podium(bracket([gf, { ...reset, completedAt: null }]))?.first.name).toBe("Zomba"); // no times: the later set in order
  });
  it("has no 3rd in single elimination, and nothing until the bracket is finished", () => {
    expect(podium(bracket([set("F", 2, "Ann", "Bo")], "single"))).toMatchObject({ first: { name: "Ann" }, second: { name: "Bo" }, third: null });
    expect(podium(bracket([set("F", 2, "Ann", "Bo")], "double", false))).toBeNull();
    expect(podium(bracket([set("F", 2, "Ann", "Bo")], "round_robin"))).toBeNull();
  });
  it("only counts the final phase's single bracket, not a pool", () => {
    const b = bracket([set("F", 2, "Ann", "Bo")], "single");
    const groups = [
      { id: "p1", label: "Pools · Pool A", phase: "Pools" },
      { id: "p2", label: "Pools · Pool B", phase: "Pools" },
      { id: "g", label: "Top 8", phase: "Top 8" },
    ];
    expect(podium({ ...b, event: { ...b.event, groups } })?.first.name).toBe("Ann");
    expect(podium({ ...b, groupId: "p1", event: { ...b.event, groups } })).toBeNull();
  });
  it("writes a one-line summary and numbered placements", () => {
    const top = podium(bracket([set("GF", 3, "Ann", "Cy"), set("LF", -3, "Cy", "Bo")]))!;
    expect(podiumLine(top)).toBe("🏆 Ann won · 2nd Cy · 3rd Bo");
    expect(podiumPlacements(top).map((p) => `${p.place}:${p.tag}`)).toEqual(["1:Ann", "2:Cy", "3:Bo"]);
  });
});

describe("bracketStandings", () => {
  const places = (b: Bracket, max?: number) => bracketStandings(b, max)?.map((r) => `${r.place}:${r.player.name}`);
  it("reads a double-elimination Top 8 from the losers rounds", () => {
    const b = bracket([
      set("GF", 4, "Ann", "Cy"),
      set("LF", -5, "Cy", "Bo"),
      set("LS", -4, "Cy", "Dee"),
      set("L3a", -3, "Dee", "Eve"), set("L3b", -3, "Cy", "Fay"),
      set("L2a", -2, "Eve", "Gus"), set("L2b", -2, "Fay", "Hal"),
      set("L1a", -1, "Gus", "Ivy"), set("L1b", -1, "Hal", "Jo"),
    ]);
    expect(places(b)).toEqual(["1:Ann", "2:Cy", "3:Bo", "4:Dee", "5:Eve", "5:Fay", "7:Gus", "7:Hal"]);
    expect(places(b, 6)).toEqual(["1:Ann", "2:Cy", "3:Bo", "4:Dee", "5:Eve", "5:Fay"]);
    expect(places(b, 5)).toEqual(["1:Ann", "2:Cy", "3:Bo", "4:Dee"]); // the tie for 5th doesn't fit: left out whole
  });
  it("shares 3rd and 5th in single elimination", () => {
    const b = bracket([
      set("F", 3, "Ann", "Bo"),
      set("S1", 2, "Ann", "Cy"), set("S2", 2, "Bo", "Dee"),
      set("Q1", 1, "Ann", "Eve"), set("Q2", 1, "Cy", "Fay"), set("Q3", 1, "Bo", "Gus"), set("Q4", 1, "Dee", "Hal"),
    ], "single");
    expect(places(b)).toEqual(["1:Ann", "2:Bo", "3:Cy", "3:Dee", "5:Eve", "5:Fay", "5:Gus", "5:Hal"]);
  });
  it("has nothing for a bracket that isn't finished", () => {
    expect(bracketStandings(bracket([set("F", 2, "Ann", "Bo")], "double", false))).toBeNull();
  });
});
