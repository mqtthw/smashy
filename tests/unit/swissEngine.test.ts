// Swiss inside the bracket engine: rounds built one at a time, results, byes, drops, finishing.
import { describe, expect, it } from "vitest";
import {
  buildSwissRound,
  finalPlacements,
  fixResult,
  isFinished,
  knockedOut,
  reportResult,
  roundLabel,
  swissDropped,
  swissProgress,
  swissSeeds,
  swissTable,
  swissTotalRounds,
  undoResult,
  type EngineSet,
} from "@/lib/bracketEngine";
import { bracketPreview } from "@/lib/bracketPreview";

const seeding = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, seed: i + 1 }));
const apply = (sets: EngineSet[], changed: EngineSet[]) => {
  const map = new Map(sets.map((s) => [s.key, s]));
  for (const c of changed) map.set(c.key, c);
  return [...map.values()];
};
const num = (id: string | null) => Number(id!.slice(1));
/** Report every open set of the latest round: the better seed wins 2-0 unless `upset` says otherwise. */
function playRound(sets: EngineSet[], upset: (s: EngineSet) => boolean = () => false): EngineSet[] {
  let out = sets;
  const { round } = swissProgress(sets);
  for (const s of sets.filter((x) => x.round === round && x.state === "ready")) {
    const better = num(s.p[0].id) < num(s.p[1].id) ? 1 : 2;
    const winner = (upset(s) ? 3 - better : better) as 1 | 2;
    out = apply(out, reportResult(out, s.key, winner, winner === 1 ? [2, 0] : [0, 2]));
  }
  return out;
}
/** Add the next round the way the server does: everyone still in, paired on the results so far. */
function nextRound(sets: EngineSet[]): EngineSet[] {
  const dropped = swissDropped(sets);
  return [...sets, ...buildSwissRound(swissSeeds(sets).filter((p) => !dropped.has(p.id)), sets, { bestOf: 3 })];
}

describe("a Swiss event in the engine", () => {
  it("starts with round 1 by seed, lettered A, B, C…", () => {
    const sets = buildSwissRound(seeding(8), [], { bestOf: 3 });
    expect(sets.map((s) => [s.bracket, s.round, s.identifier, s.p[0].id, s.p[1].id, s.state])).toEqual([
      ["SW", 1, "A", "p1", "p5", "ready"],
      ["SW", 1, "B", "p2", "p6", "ready"],
      ["SW", 1, "C", "p3", "p7", "ready"],
      ["SW", 1, "D", "p4", "p8", "ready"],
    ]);
    expect(roundLabel(sets[0], 0, 0, false)).toBe("Round 1");
    expect(swissSeeds(sets)).toEqual(seeding(8));
  });

  it("gives the odd player a bye that counts as a win and isn't a set to play", () => {
    const sets = buildSwissRound(seeding(5), [], { bestOf: 3 });
    const bye = sets.find((s) => s.state === "bye")!;
    expect(bye).toMatchObject({ winner: 1, identifier: null, p: [{ id: "p5", bye: false }, { id: null, bye: true }] });
    expect(sets.filter((s) => s.state === "ready")).toHaveLength(2);
    expect(swissSeeds(sets)).toEqual(seeding(5)); // the bye is the last seed
    expect(swissTable(sets).find((r) => r.id === "p5")).toMatchObject({ wins: 1, losses: 0, byes: 1 });
    expect(swissProgress(sets)).toEqual({ round: 1, complete: false });
  });

  it("runs 8 players through 3 rounds: letters carry on, nobody meets twice, and it finishes with one 3-0", () => {
    let sets = buildSwissRound(seeding(8), [], { bestOf: 3 });
    expect(swissTotalRounds(sets)).toBe(3);
    sets = playRound(sets);
    expect(swissProgress(sets)).toEqual({ round: 1, complete: true });
    expect(isFinished(sets)).toBe(false);
    sets = nextRound(sets);
    expect(sets.filter((s) => s.round === 2).map((s) => s.identifier)).toEqual(["E", "F", "G", "H"]);
    sets = nextRound(playRound(sets));
    expect(isFinished(playRound(sets).slice(0, -1).concat(sets.at(-1)!))).toBe(false); // one set of the last round still open
    sets = playRound(sets);
    expect(isFinished(sets)).toBe(true);
    const pairs = sets.map((s) => [s.p[0].id, s.p[1].id].sort().join("v"));
    expect(new Set(pairs).size).toBe(pairs.length);
    const table = swissTable(sets);
    expect(table[0]).toMatchObject({ id: "p1", wins: 3, losses: 0 });
    expect(table.filter((r) => r.wins === 3)).toHaveLength(1);
    expect(finalPlacements(sets)[0]).toEqual({ id: "p1", place: 1 });
    expect(finalPlacements(sets).map((p) => p.place).sort((a, b) => a - b)[7]).toBeLessThanOrEqual(8);
    expect(knockedOut(sets, sets[0])).toBeNull(); // nobody is knocked out of a Swiss
  });

  it("follows the host's number of rounds instead of the usual one", () => {
    let sets = playRound(buildSwissRound(seeding(8), [], { bestOf: 3 }));
    expect(isFinished(sets, { swissRounds: 1 })).toBe(true);
    expect(isFinished(sets, { swissRounds: 5 })).toBe(false);
    for (let r = 2; r <= 3; r++) sets = playRound(nextRound(sets));
    expect(isFinished(sets)).toBe(true); // the usual 3
    expect(isFinished(sets, { swissRounds: 5 })).toBe(false); // the host asked for 5
  });

  it("leaves a disqualified player out of the next rounds, and keeps them in the standings", () => {
    let sets = buildSwissRound(seeding(6), [], { bestOf: 3 });
    const a = sets[0]; // p1 v p4
    sets = apply(sets, reportResult(sets, a.key, 1, [0, -1])); // p4 didn't show
    sets = playRound(sets);
    expect([...swissDropped(sets)]).toEqual(["p4"]);
    sets = nextRound(sets);
    const round2 = sets.filter((s) => s.round === 2);
    expect(round2.flatMap((s) => [s.p[0].id, s.p[1].id])).not.toContain("p4");
    expect(round2.filter((s) => s.state === "bye")).toHaveLength(1); // five left: one sits out
    expect(swissTable(sets).map((r) => r.id)).toContain("p4");
  });

  it("ends early when fewer than two players are left", () => {
    let sets = buildSwissRound(seeding(2), [], { bestOf: 3 });
    sets = apply(sets, reportResult(sets, sets[0].key, 1, [0, -1]));
    expect(isFinished(sets, { swissRounds: 3 })).toBe(true);
    expect(buildSwissRound(swissSeeds(sets).filter((p) => !swissDropped(sets).has(p.id)), sets, { bestOf: 3 })).toEqual([]);
  });

  it("lets the host correct a result without touching other sets, and undo one before the next round", () => {
    let sets = playRound(buildSwissRound(seeding(4), [], { bestOf: 3 }));
    sets = nextRound(sets);
    const first = sets.find((s) => s.identifier === "A")!;
    const fixed = fixResult(sets, first.key, 2, [1, 2]); // the other player actually won
    expect(fixed.cleared).toEqual([]);
    expect(fixed.changed.map((s) => s.key)).toEqual([first.key]);
    expect(swissTable(apply(sets, fixed.changed)).find((r) => r.id === "p3")).toMatchObject({ wins: 1 });
    // A plain undo would put the set back up to play while the next round is under way (round 632):
    // only before the next round is paired.
    expect(() => undoResult(sets, first.key)).toThrow();
    const before = playRound(buildSwissRound(seeding(4), [], { bestOf: 3 }));
    const a = before.find((s) => s.identifier === "A")!;
    expect(undoResult(before, a.key).map((s) => [s.key, s.state])).toEqual([[a.key, "ready"]]);
  });

  it("shares a final place only when every tiebreak is level", () => {
    // Four players, one round: both winners are 1-0 with the same game difference and opponents' wins.
    const sets = playRound(buildSwissRound(seeding(4), [], { bestOf: 3 }));
    expect(finalPlacements(sets).map((p) => [p.id, p.place])).toEqual([["p1", 1], ["p2", 1], ["p3", 3], ["p4", 3]]);
  });
});

describe("the round 1 preview before a Swiss starts", () => {
  it("shows the first round's tables and the bye", () => {
    const ids = ["a", "b", "c", "d", "e"];
    expect(bracketPreview(ids, "swiss")).toEqual({ kind: "elimination", matches: [["a", "c"], ["b", "d"], ["e", null]] });
  });
});
