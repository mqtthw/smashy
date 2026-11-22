import { describe, expect, it } from "vitest";
import type { EngineSet } from "@/lib/bracketEngine";
import { screenLists } from "@/lib/venueScreen";

let n = 0;
const set = (identifier: string, state: EngineSet["state"], over: Partial<EngineSet> = {}): EngineSet =>
  ({
    key: identifier,
    bracket: "W",
    round: 1,
    idx: n++,
    pool: null,
    identifier,
    bestOf: 3,
    p: [{ id: `${identifier}-1` }, { id: `${identifier}-2` }],
    score: [null, null],
    winner: null,
    state,
    winnerTo: null,
    loserTo: null,
    ...over,
  }) as unknown as EngineSet;

const ids = (rows: { set: EngineSet }[]) => rows.map((r) => r.set.identifier);

describe("the venue screen", () => {
  it("puts called and playing sets under Play now, the rest of the ready sets under Up next", () => {
    const sets = [set("A", "ready"), set("B", "live"), set("C", "ready"), set("D", "done"), set("E", "waiting")];
    const { now, next } = screenLists(sets, { A: "Setup 1" });
    expect(ids(now)).toEqual(["A", "B"]);
    expect(ids(next)).toEqual(["C"]);
  });

  it("orders Play now: stream first, then setups in natural order, then sets with no setup", () => {
    const sets = [set("A", "live"), set("B", "ready"), set("C", "live"), set("D", "ready"), set("E", "ready")];
    const { now } = screenLists(sets, { B: "Setup 10", C: "Setup 2", D: "Stream", E: "setup 1" });
    expect(ids(now)).toEqual(["D", "E", "C", "B", "A"]);
    expect(now[0].setup).toBe("Stream");
    expect(now[4]).toMatchObject({ setup: null, live: true });
  });

  it("lists Up next from the earliest round on, winners before losers of the same depth", () => {
    const sets = [set("L1", "ready", { bracket: "L", round: 1 }), set("W2", "ready", { round: 2 }), set("W1", "ready", { round: 1 }), set("GF", "ready", { bracket: "GF" })];
    expect(ids(screenLists(sets).next)).toEqual(["W1", "L1", "W2", "GF"]);
  });

  it("leaves out a set until both players are known", () => {
    const sets = [set("A", "ready", { p: [{ id: "x" }, { id: null }] as unknown as EngineSet["p"] })];
    expect(screenLists(sets, { A: "Setup 1" })).toEqual({ now: [], next: [], later: 0 });
  });

  it("names each player once under Up next (a round robin has every set ready at once)", () => {
    const pair = (id: string, a: string, b: string, state: EngineSet["state"] = "ready") => set(id, state, { bracket: "RR", p: [{ id: a }, { id: b }] as unknown as EngineSet["p"] });
    // Round 1: A (dan-ivy), B (eve-hugo). Round 2: C (alice-ivy), D (dan-eve), E (alice-zed).
    const sets = [pair("A", "dan", "ivy"), pair("B", "eve", "hugo"), pair("C", "alice", "ivy"), pair("D", "dan", "eve"), pair("E", "alice", "zed")];
    const quiet = screenLists(sets);
    expect(ids(quiet.next)).toEqual(["A", "B", "E"]);
    expect(quiet.later).toBe(2);
    // Once A is on a setup, its players are busy: nothing else of theirs is "up next".
    const called = screenLists(sets, { A: "Setup 1" });
    expect(ids(called.now)).toEqual(["A"]);
    expect(ids(called.next)).toEqual(["B", "E"]);
    expect(called.later).toBe(2);
  });

  it("ignores a blank setup name", () => {
    const { now, next } = screenLists([set("A", "ready")], { A: "   " });
    expect(now).toEqual([]);
    expect(ids(next)).toEqual(["A"]);
  });
});
