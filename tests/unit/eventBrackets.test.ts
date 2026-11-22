// Several brackets in one event: naming an extra bracket, who is out of a bracket so far, and who
// comes over when a host fills one bracket (say Redemption) from another.
import { describe, expect, it } from "vitest";
import { buildElimination, buildFinal, buildRoundRobin, disqualified, finalPlacements, outSoFar, reportResult, type EngineSet } from "@/lib/bracketEngine";
import { bracketFullName, cleanBracketName, defaultCut, planBringOver, type BringPlayer } from "@/lib/eventBrackets";

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);
const num = (id: string | null) => Number(id!.slice(1));
const apply = (sets: EngineSet[], changed: EngineSet[]) => {
  const map = new Map(sets.map((s) => [s.key, s]));
  for (const c of changed) map.set(c.key, c);
  return [...map.values()];
};
/** Play the ready sets that match, over and over: the better seed wins 2-0. `limit` stops after that many sets. */
function play(sets: EngineSet[], only: (s: EngineSet) => boolean = () => true, limit = 2000): EngineSet[] {
  for (let n = 0; n < limit; n++) {
    const next = sets.find((s) => s.state === "ready" && only(s));
    if (!next) return sets;
    const winner = (num(next.p[0].id) < num(next.p[1].id) ? 1 : 2) as 1 | 2;
    sets = apply(sets, reportResult(sets, next.key, winner, winner === 1 ? [2, 0] : [0, 2]));
  }
  return sets;
}
const round = (bracket: string, r: number) => (s: EngineSet) => s.bracket === bracket && s.round === r;
const placeOf = (list: { id: string; place: number }[]) => Object.fromEntries(list.map((p) => [p.id, p.place]));

describe("naming an extra bracket", () => {
  it("tidies the bracket's own name", () => {
    expect(cleanBracketName("  Redemption \n bracket ")).toBe("Redemption bracket");
    expect(cleanBracketName("x".repeat(50))).toHaveLength(30);
    expect(cleanBracketName(null)).toBe("");
  });

  it("goes by the main event's name and its own", () => {
    expect(bracketFullName("Otaku Zone #12", "Redemption")).toBe("Otaku Zone #12: Redemption");
  });

  it("cuts a long main name, never the bracket's own, to fit an event name", () => {
    const full = bracketFullName("A".repeat(80), "Amateur bracket");
    expect(full).toHaveLength(80);
    expect(full.endsWith(": Amateur bracket")).toBe(true);
  });
});

describe("who is out of a bracket so far", () => {
  it("places players as they're knocked out of a double elimination bracket", () => {
    let sets = play(buildElimination(ids(8), { double: true, bestOf: 3 }), round("W", 1));
    expect(outSoFar(sets, false)).toEqual([]); // one loss: everyone is still in

    // Half of losers round 1: one player is out. With the round unfinished the place can still improve.
    sets = play(sets, round("L", 1), 1);
    expect(outSoFar(sets, false).map((p) => p.place)).toEqual([8]);

    sets = play(sets, round("L", 1));
    expect(outSoFar(sets, false).map((p) => p.place)).toEqual([7, 7]);

    sets = play(play(sets, round("W", 2)), round("L", 2));
    const soFar = outSoFar(sets, false);
    expect(soFar.map((p) => p.place)).toEqual([5, 5, 7, 7]);
    expect(soFar.map((p) => p.id)).not.toContain("p1"); // still in

    // Those places are the ones the finished bracket gives them.
    const done = play(sets);
    const final = placeOf(finalPlacements(done));
    for (const p of soFar) expect(final[p.id]).toBe(p.place);
    expect(outSoFar(done, true)).toEqual(finalPlacements(done));
  });

  it("puts every first-round loser out in single elimination", () => {
    const sets = play(buildElimination(ids(8), { double: false, bestOf: 3 }), round("W", 1));
    const out = outSoFar(sets, false);
    expect(out.map((p) => p.id).sort()).toEqual(["p5", "p6", "p7", "p8"]);
    expect(out.every((p) => p.place === 5)).toBe(true);
  });

  it("counts a disqualified player as out, and remembers the disqualification", () => {
    let sets = buildElimination(ids(8), { double: true, bestOf: 3 });
    const set = sets.find((s) => s.state === "ready" && (s.p[0].id === "p8" || s.p[1].id === "p8"))!;
    const slot = set.p[0].id === "p8" ? 0 : 1;
    sets = apply(sets, reportResult(sets, set.key, (2 - slot) as 1 | 2, slot === 0 ? [-1, 0] : [0, -1])); // p8 never showed
    expect([...disqualified(sets)]).toEqual(["p8"]);
    expect(outSoFar(sets, false).map((p) => p.id)).toEqual(["p8"]);
  });

  it("has nobody out of pools until a final bracket is made, then everyone who missed it", () => {
    const pools = play(buildRoundRobin(ids(10), { bestOf: 3 }));
    expect(outSoFar(pools, false)).toEqual([]);
    const withFinal = [...pools, ...buildFinal(pools, 4, { double: true, bestOf: 3 })];
    const out = outSoFar(withFinal, false);
    expect(out.map((p) => p.id).sort()).toEqual(["p10", "p5", "p6", "p7", "p8", "p9"]);
    expect(out.map((p) => p.place)).toEqual([5, 5, 7, 7, 9, 9]); // after the four finalists
  });
});

describe("bringing players over from another bracket", () => {
  const acct = (n: number): BringPlayer => ({ id: `p${n}`, tag: `Player ${n}`, guest: false, seed: n });
  const walkIn = (n: number, tag: string): BringPlayer => ({ id: `g${n}`, tag, guest: true, seed: n });
  const base = { disqualified: new Set<string>(), hereIds: new Set<string>(), hereTags: [] as string[], room: 64, highestSeed: 0 };

  it("takes the players who placed at the cut or lower, best finisher first", () => {
    const players = [acct(1), acct(2), acct(3), acct(4), acct(5), acct(6), acct(7), acct(8)];
    // p1 to p4 are still playing; 5th: p5, p6; 7th: p7, p8.
    const places = new Map([["p7", 7], ["p8", 7], ["p5", 5], ["p6", 5]]);
    const plan = planBringOver({ ...base, players, places, cut: 5 });
    expect(plan.add.map((p) => [p.id, p.seed])).toEqual([["p5", 1], ["p6", 2], ["p7", 3], ["p8", 4]]);
    expect(plan.stillIn).toBe(4);

    const lower = planBringOver({ ...base, players, places, cut: 7 });
    expect(lower.add.map((p) => p.id)).toEqual(["p7", "p8"]);
    expect(lower.above).toBe(2);
    expect(lower.stillIn).toBe(4); // never moved, whatever the cut
  });

  it("leaves out disqualified players and anyone already here (accounts by account, walk-ins by tag)", () => {
    const players = [acct(5), acct(6), acct(7), walkIn(8, "Fox Guy"), walkIn(9, "Marth")];
    const places = new Map([["p5", 5], ["p6", 5], ["p7", 7], ["g8", 7], ["g9", 9]]);
    const plan = planBringOver({
      ...base,
      players,
      places,
      cut: 5,
      disqualified: new Set(["p7"]),
      hereIds: new Set(["p5"]),
      hereTags: ["Player 5", " fox guy "],
      highestSeed: 3,
    });
    expect(plan.add.map((p) => [p.tag, p.seed])).toEqual([["Player 6", 4], ["Marth", 5]]);
    expect(plan.already).toEqual(["Player 5", "Fox Guy"]);
    expect(plan.leftOut).toEqual(["Player 7"]);
  });

  it("stops at the bracket's cap", () => {
    const players = [acct(5), acct(6), acct(7)];
    const places = new Map([["p5", 5], ["p6", 5], ["p7", 7]]);
    const plan = planBringOver({ ...base, players, places, cut: 2, room: 2 });
    expect(plan.add.map((p) => p.id)).toEqual(["p5", "p6"]);
    expect(plan.noRoom).toEqual(["Player 7"]);
  });

  it("brings everyone when there's no cut, placed or not", () => {
    const players = [acct(3), acct(1), acct(2)];
    const plan = planBringOver({ ...base, players, places: new Map(), cut: null });
    expect(plan.add.map((p) => p.id)).toEqual(["p1", "p2", "p3"]); // in their seed order
    expect(plan.stillIn).toBe(0);
  });

  it("runs out of seed numbers at 512 without stopping", () => {
    const plan = planBringOver({ ...base, players: [acct(1), acct(2)], places: new Map(), cut: null, highestSeed: 511 });
    expect(plan.add.map((p) => p.seed)).toEqual([512, null]);
  });

  it("starts the cut at the half of the field that goes out first", () => {
    expect([2, 5, 8, 16, 20, 32, 33].map(defaultCut)).toEqual([2, 5, 5, 9, 17, 17, 33]);
  });
});
