// The stream kit: a player's run through the bracket, and what's up next after the set on stream.
import { describe, expect, it } from "vitest";
import { buildElimination, reportResult, type EngineSet } from "@/lib/bracketEngine";
import { pathRecord, playerPath, upNext } from "@/lib/commentary";

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);
const apply = (sets: EngineSet[], changed: EngineSet[]) => {
  const map = new Map(sets.map((s) => [s.key, s]));
  for (const c of changed) map.set(c.key, c);
  return [...map.values()];
};
/** Report the ready set between these two: `a` wins `score`. */
const win = (sets: EngineSet[], a: string, b: string, score: [number, number] = [2, 0]) => {
  const s = sets.find((x) => x.state === "ready" && [x.p[0].id, x.p[1].id].includes(a) && [x.p[0].id, x.p[1].id].includes(b))!;
  const slot = s.p[0].id === a ? 1 : 2;
  return apply(sets, reportResult(sets, s.key, slot, slot === 1 ? score : [score[1], score[0]]));
};

describe("a player's run through the bracket", () => {
  // 8 players, double elimination: p8 loses to p1, then beats p5's loser on the losers side.
  let sets = buildElimination(ids(8), { double: true, bestOf: 3 });
  sets = win(sets, "p1", "p8");
  sets = win(sets, "p4", "p5", [2, 1]);
  sets = win(sets, "p2", "p7");
  sets = win(sets, "p3", "p6");
  sets = win(sets, "p8", "p5", [2, 1]);

  it("lists finished sets in the order played, from the player's side", () => {
    const path = playerPath(sets, "p8");
    expect(path.map((p) => [p.opponent, p.won, p.score])).toEqual([
      ["p1", false, [0, 2]],
      ["p5", true, [2, 1]],
    ]);
    expect(pathRecord(path)).toEqual({ wins: 1, losses: 1 });
  });

  it("is empty before a player has finished a set", () => {
    expect(playerPath(buildElimination(ids(4), { double: false, bestOf: 3 }), "p1")).toEqual([]);
  });

  it("leaves out byes", () => {
    // 5 players: the top three seeds start with a bye.
    const odd = buildElimination(ids(5), { double: false, bestOf: 3 });
    expect(playerPath(odd, "p1")).toEqual([]);
  });
});

describe("up next", () => {
  const sets = buildElimination(ids(8), { double: true, bestOf: 3 });

  it("lists the playable sets earliest first, leaving out the one on stream", () => {
    const first = sets.filter((s) => s.state === "ready").sort((a, b) => a.idx - b.idx);
    expect(upNext(sets, first[0].key).map((s) => s.key)).toEqual(first.slice(1).map((s) => s.key));
    expect(upNext(sets, null, 2)).toHaveLength(2);
  });

  it("has nothing when every set is waiting or finished", () => {
    expect(upNext(sets.map((s) => ({ ...s, state: "waiting" as const })), null)).toEqual([]);
  });
});
