// Pools or Swiss rounds, then a final bracket for the top players (the engine's side of it).
import { describe, expect, it } from "vitest";
import {
  buildFinal,
  buildRoundRobin,
  buildSwissRound,
  canUndo,
  finalPlacements,
  finalQualifiers,
  firstPartDone,
  isElimination,
  isFinished,
  reportResult,
  swissDropped,
  swissProgress,
  swissSeeds,
  type EngineSet,
} from "@/lib/bracketEngine";

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);
const num = (id: string | null) => Number(id!.slice(1));
const apply = (sets: EngineSet[], changed: EngineSet[]) => {
  const map = new Map(sets.map((s) => [s.key, s]));
  for (const c of changed) map.set(c.key, c);
  return [...map.values()];
};
/** Play every set that can be played, over and over: the better seed wins 2-0. */
function play(sets: EngineSet[]): EngineSet[] {
  for (let n = 0; n < 2000; n++) {
    const next = sets.find((s) => s.state === "ready");
    if (!next) return sets;
    const winner = (num(next.p[0].id) < num(next.p[1].id) ? 1 : 2) as 1 | 2;
    sets = apply(sets, reportResult(sets, next.key, winner, winner === 1 ? [2, 0] : [0, 2]));
  }
  return sets;
}
const withFinal = (sets: EngineSet[], size: number, double: boolean) => [...sets, ...buildFinal(sets, size, { double, bestOf: 3 })];

describe("round robin pools into a final bracket", () => {
  // 10 players: two pools of five by snake seeding (pool 1: seeds 1, 4, 5, 8, 9; pool 2: 2, 3, 6, 7, 10).
  const pools = play(buildRoundRobin(ids(10), { bestOf: 3 }));

  it("isn't over when the pools are done if a final bracket follows", () => {
    expect(firstPartDone(pools)).toBe(true);
    expect(isFinished(pools)).toBe(true); // pools only: the standings decide it
    expect(isFinished(pools, { finalFormat: "double_elim" })).toBe(false); // waiting for the host to start the final
    expect(firstPartDone(pools.map((s, i) => (i === 0 ? { ...s, state: "ready" as const, winner: null } : s)))).toBe(false);
  });

  it("sends through each pool's winner, then each pool's runner-up", () => {
    expect(finalQualifiers(pools, 4)).toEqual(["p1", "p2", "p4", "p3"]);
    expect(finalQualifiers(pools, 2)).toEqual(["p1", "p2"]);
    expect(finalQualifiers(pools, 64)).toHaveLength(10); // never more than there are players
  });

  it("builds the final from that seeding, with letters carrying on after the pools", () => {
    const final = buildFinal(pools, 4, { double: true, bestOf: 3 });
    expect(final.every(isElimination)).toBe(true);
    const firstRound = final.filter((s) => s.bracket === "W" && s.round === 1).sort((a, b) => a.idx - b.idx);
    expect(firstRound.map((s) => [s.p[0].id, s.p[1].id])).toEqual([["p1", "p3"], ["p2", "p4"]]); // 1 v 4, 2 v 3
    expect(pools.filter((s) => s.identifier)).toHaveLength(20); // A to T
    expect(final.find((s) => s.bracket === "W" && s.round === 1 && s.idx === 0)?.identifier).toBe("U"); // the first set of the final
    expect(new Set([...pools, ...final].map((s) => s.identifier).filter(Boolean)).size).toBe(20 + final.filter((s) => s.identifier).length);
  });

  it("finishes when the final has a champion, and places everyone: finalists first, then the rest by the pools", () => {
    let sets = withFinal(pools, 4, true);
    expect(isFinished(sets)).toBe(false);
    expect(isFinished(sets, { finalFormat: "double_elim" })).toBe(false);
    sets = play(sets);
    expect(isFinished(sets, { finalFormat: "double_elim" })).toBe(true);
    const places = finalPlacements(sets);
    expect(places.slice(0, 4).map((p) => [p.id, p.place])).toEqual([["p1", 1], ["p2", 2], ["p3", 3], ["p4", 4]]);
    // The six who didn't go through: placed 5th down, in the order the pools left them (level records share a place).
    const rest = places.slice(4);
    expect(rest.map((p) => p.id).sort()).toEqual(["p10", "p5", "p6", "p7", "p8", "p9"]);
    expect(rest[0].place).toBe(5);
    expect(rest.map((p) => p.place)).toEqual([5, 5, 7, 7, 9, 9]); // pool mates on the same record in each pool
    expect(places).toHaveLength(10);
  });

  it("settles a tie at the cut by seed", () => {
    // Four players where everyone but the winner ends 1-2 with the same game difference.
    let sets = buildRoundRobin(ids(4), { bestOf: 3 });
    const win = (a: string, b: string) => {
      const s = sets.find((x) => (x.p[0].id === a && x.p[1].id === b) || (x.p[0].id === b && x.p[1].id === a))!;
      const winner = (s.p[0].id === a ? 1 : 2) as 1 | 2;
      sets = apply(sets, reportResult(sets, s.key, winner, winner === 1 ? [2, 0] : [0, 2]));
    };
    win("p1", "p2"); win("p1", "p3"); win("p1", "p4"); // p1 beats everyone
    win("p2", "p3"); win("p3", "p4"); win("p4", "p2"); // the other three beat each other in a circle
    expect(finalQualifiers(sets, 2, ids(4))).toEqual(["p1", "p2"]); // p2 is the best seed of the three
    expect(finalQualifiers(sets, 3, ["p1", "p4", "p3", "p2"])).toEqual(["p1", "p4", "p3"]); // a different seeding, a different order
  });

  it("has nothing to build with fewer than two qualifiers", () => {
    expect(buildFinal(pools, 1, { double: false, bestOf: 3 })).toEqual([]);
  });
});

describe("Swiss rounds into a final bracket", () => {
  let swiss = play(buildSwissRound(ids(8).map((id, i) => ({ id, seed: i + 1 })), [], { bestOf: 3 }));
  for (let round = 2; round <= 3; round++) {
    const dropped = swissDropped(swiss);
    swiss = play([...swiss, ...buildSwissRound(swissSeeds(swiss).filter((p) => !dropped.has(p.id)), swiss, { bestOf: 3 })]);
  }

  it("waits for the host after the last Swiss round, then takes the top of the standings", () => {
    expect(isFinished(swiss)).toBe(true); // Swiss only
    expect(isFinished(swiss, { finalFormat: "single_elim" })).toBe(false);
    expect(finalQualifiers(swiss, 4)[0]).toBe("p1"); // the 3-0 player
    expect(finalQualifiers(swiss, 4)).toHaveLength(4);
  });

  it("plays a single elimination final and places all eight", () => {
    const sets = play(withFinal(swiss, 4, false));
    expect(isFinished(sets, { finalFormat: "single_elim", swissRounds: 3 })).toBe(true);
    const places = finalPlacements(sets);
    expect(places[0]).toEqual({ id: "p1", place: 1 });
    expect(places.slice(0, 4).map((p) => p.place)).toEqual([1, 2, 3, 3]); // the two semi-final losers share 3rd
    expect(places.slice(4).map((p) => p.place)[0]).toBe(5);
    expect(new Set(places.map((p) => p.id)).size).toBe(8);
  });

  it("doesn't send through a player who left", () => {
    // p1 no-shows a new fourth round: they're out of the event, so the next best player takes the spot.
    const dropped = swissDropped(swiss);
    let more = [...swiss, ...buildSwissRound(swissSeeds(swiss).filter((p) => !dropped.has(p.id)), swiss, { bestOf: 3 })];
    const set = more.find((s) => s.round === 4 && (s.p[0].id === "p1" || s.p[1].id === "p1"))!;
    const p1Slot = set.p[0].id === "p1" ? 0 : 1;
    more = apply(more, reportResult(more, set.key, (2 - p1Slot) as 1 | 2, p1Slot === 0 ? [-1, 0] : [0, -1]));
    more = play(more);
    expect(finalQualifiers(more, 4)).not.toContain("p1");
    expect(finalQualifiers(more, 4)).toHaveLength(4);
  });
});

describe("results the next part was built from (round 632)", () => {
  it("can't undo a pool result once the final bracket exists", () => {
    const pools = play(buildRoundRobin(ids(6), { bestOf: 3 }));
    const pool = pools.find((s) => s.state === "done")!;
    expect(canUndo(pools, pool.key)).toBe(true);
    expect(canUndo(withFinal(pools, 4, true), pool.key)).toBe(false);
  });

  it("can't undo an earlier Swiss round once the next was paired, and waits for every round's sets", () => {
    const r1 = play(buildSwissRound(ids(8).map((id, i) => ({ id, seed: i + 1 })), [], { bestOf: 3 }));
    const first = r1.find((s) => s.state === "done")!;
    const r2 = [...r1, ...buildSwissRound(swissSeeds(r1), r1, { bestOf: 3 })];
    expect(canUndo(r2, first.key)).toBe(false);
    const played = play(r2);
    expect(swissProgress(played).complete).toBe(true);
    const reopened = played.map((s) => (s.key === first.key ? { ...s, state: "ready" as const, winner: null } : s));
    expect(swissProgress(reopened).complete).toBe(false);
  });

  it("doesn't send a player DQ'd in their pool to the final", () => {
    let pools = buildRoundRobin(ids(6), { bestOf: 3 });
    const set = pools.find((s) => s.state === "ready" && (s.p[0].id === "p1" || s.p[1].id === "p1"))!;
    const slot = set.p[0].id === "p1" ? 0 : 1;
    pools = apply(pools, reportResult(pools, set.key, (2 - slot) as 1 | 2, slot === 0 ? [-1, 0] : [0, -1]));
    pools = play(pools);
    expect(finalQualifiers(pools, 4)).not.toContain("p1");
    expect(finalQualifiers(pools, 4)).toHaveLength(4);
  });
});
