import { describe, expect, it } from "vitest";
import {
  buildElimination,
  buildRoundRobin,
  canUndo,
  eliminationPlacements,
  fixResult,
  laterPlayed,
  isFinished,
  reportResult,
  roundRobinStandings,
  seedOrder,
  undoResult,
  type EngineSet,
} from "@/lib/bracketEngine";

const players = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);

/** Apply changed sets onto the full list (like saving to the database). */
function apply(sets: EngineSet[], changed: EngineSet[]): EngineSet[] {
  const m = new Map(sets.map((s) => [s.key, s]));
  for (const c of changed) m.set(c.key, c);
  return [...m.values()];
}

/** Play the whole bracket: the better seed (lower number) always wins 2-0 (or `upset` decides). */
function playAll(sets: EngineSet[], pick?: (s: EngineSet) => 1 | 2): EngineSet[] {
  for (let guard = 0; guard < 500; guard++) {
    const next = sets.find((s) => s.state === "ready");
    if (!next) return sets;
    const seedNo = (id: string | null) => Number(id?.slice(1) ?? 999);
    const w = pick ? pick(next) : seedNo(next.p[0].id) < seedNo(next.p[1].id) ? 1 : 2;
    sets = apply(sets, reportResult(sets, next.key, w, w === 1 ? [2, 0] : [0, 2]));
  }
  throw new Error("bracket never finished");
}

describe("seeding", () => {
  it("puts top seeds on opposite sides", () => {
    expect(seedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
    expect(seedOrder(4)).toEqual([1, 4, 2, 3]);
  });
});

describe("single elimination", () => {
  it("builds rounds and gives top seeds byes", () => {
    const sets = buildElimination(players(6), { double: false, bestOf: 3 });
    expect(sets.filter((s) => s.bracket === "W" && s.round === 1)).toHaveLength(4);
    // Seeds 1 and 2 face byes and are already in round 2.
    const byes = sets.filter((s) => s.state === "bye");
    expect(byes).toHaveLength(2);
    const r2 = sets.filter((s) => s.round === 2);
    expect(r2.flatMap((s) => s.p.map((x) => x.id)).filter(Boolean).sort()).toEqual(["p1", "p2"]);
  });

  it("plays to a champion with shared 3rd place", () => {
    const done = playAll(buildElimination(players(4), { double: false, bestOf: 3 }));
    expect(isFinished(done)).toBe(true);
    expect(eliminationPlacements(done).sort((a, b) => a.place - b.place || a.id.localeCompare(b.id))).toEqual([
      { id: "p1", place: 1 },
      { id: "p2", place: 2 },
      { id: "p3", place: 3 },
      { id: "p4", place: 3 },
    ]);
  });
});

describe("double elimination", () => {
  it("has the right number of losers rounds and sends drops to the losers side", () => {
    const sets = buildElimination(players(8), { double: true, bestOf: 3 });
    const lRounds = new Set(sets.filter((s) => s.bracket === "L").map((s) => s.round));
    expect([...lRounds].sort()).toEqual([1, 2, 3, 4]);
    expect(sets.filter((s) => s.bracket === "W" && s.round === 1).every((s) => s.loserTo?.key.startsWith("L1-"))).toBe(true);
    expect(sets.find((s) => s.key === "W3-0")!.loserTo).toEqual({ key: "L4-0", slot: 2 });
  });

  it("plays out with standard placements (1, 2, 3, 4, 5, 5, 7, 7)", () => {
    const done = playAll(buildElimination(players(8), { double: true, bestOf: 3 }));
    expect(isFinished(done)).toBe(true);
    const places = eliminationPlacements(done).map((p) => p.place);
    expect(places).toEqual([1, 2, 3, 4, 5, 5, 7, 7]);
    expect(done.find((s) => s.bracket === "GF2")!.state).toBe("skipped"); // winners-side player won GF
  });

  it("plays a grand final reset when the losers-side player wins", () => {
    let sets = buildElimination(players(4), { double: true, bestOf: 3 });
    // Favor seeds everywhere except the grand final, which the losers-side player wins.
    sets = playAll(sets, (s) => {
      if (s.bracket === "GF") return 2;
      const n = (id: string | null) => Number(id?.slice(1) ?? 999);
      return n(s.p[0].id) < n(s.p[1].id) ? 1 : 2;
    });
    const reset = sets.find((s) => s.bracket === "GF2")!;
    expect(reset.state).toBe("done");
    expect(isFinished(sets)).toBe(true);
    expect(eliminationPlacements(sets)[0].place).toBe(1);
  });

  it("handles byes in both brackets (5 players)", () => {
    const done = playAll(buildElimination(players(5), { double: true, bestOf: 3 }));
    expect(isFinished(done)).toBe(true);
    const ids = eliminationPlacements(done).map((p) => p.id).sort();
    expect(ids).toEqual(["p1", "p2", "p3", "p4", "p5"]);
  });

  it("works with 2 and 3 players", () => {
    for (const n of [2, 3]) {
      const done = playAll(buildElimination(players(n), { double: true, bestOf: 3 }));
      expect(isFinished(done)).toBe(true);
      expect(eliminationPlacements(done)).toHaveLength(n);
    }
  });

  it("uses the longer best-of for top 8 sets in a big bracket", () => {
    const sets = buildElimination(players(16), { double: true, bestOf: 3, bestOfTop: 5 });
    expect(sets.find((s) => s.bracket === "W" && s.round === 1)!.bestOf).toBe(3);
    expect(sets.find((s) => s.bracket === "GF")!.bestOf).toBe(5);
    expect(sets.find((s) => s.key === "W4-0")!.bestOf).toBe(5);
  });
});

describe("fixing mistakes", () => {
  it("undoes a result until a later set is played", () => {
    let sets = buildElimination(players(4), { double: true, bestOf: 3 });
    sets = apply(sets, reportResult(sets, "W1-0", 1, [2, 1]));
    expect(canUndo(sets, "W1-0")).toBe(true);
    const undone = apply(sets, undoResult(sets, "W1-0"));
    expect(undone.find((s) => s.key === "W1-0")!.state).toBe("ready");
    expect(undone.find((s) => s.key === "W2-0")!.p[0].id).toBeNull();
    // Play forward: once the next set is done, W1-0 can't be undone.
    sets = apply(sets, reportResult(sets, "W1-1", 1, [2, 0]));
    sets = apply(sets, reportResult(sets, "W2-0", 1, [2, 0]));
    expect(canUndo(sets, "W1-0")).toBe(false);
    expect(() => undoResult(sets, "W1-0")).toThrow();
  });

  it("refuses bad results", () => {
    const sets = buildElimination(players(4), { double: false, bestOf: 3 });
    expect(() => reportResult(sets, "W2-0", 1, [2, 0])).toThrow(); // players not in yet
    expect(() => reportResult(sets, "W1-0", 1, [-1, 2])).toThrow(); // winner DQ'd
    const ok = reportResult(sets, "W1-0", 1, [0, -1]); // DQ win
    expect(ok.find((s) => s.key === "W1-0")!.score).toEqual([0, -1]);
  });
});

describe("round robin", () => {
  it("everyone in a pool plays everyone once", () => {
    const sets = buildRoundRobin(players(5), { bestOf: 3 });
    expect(sets).toHaveLength(10); // 5 choose 2
    const pairs = new Set(sets.map((s) => [s.p[0].id, s.p[1].id].sort().join("-")));
    expect(pairs.size).toBe(10);
  });

  it("splits big groups into pools of up to 8 with snake seeding", () => {
    const sets = buildRoundRobin(players(12), { bestOf: 3 });
    const pools = new Set(sets.map((s) => s.pool));
    expect(pools.size).toBe(2);
    const inPool1 = new Set(sets.filter((s) => s.pool === 1).flatMap((s) => s.p.map((p) => p.id)));
    expect(inPool1.has("p1") && inPool1.has("p4") && !inPool1.has("p2")).toBe(true);
  });

  it("ranks by set wins, then game difference", () => {
    const done = playAll(buildRoundRobin(players(4), { bestOf: 3 }));
    expect(isFinished(done)).toBe(true);
    expect(roundRobinStandings(done).map((r) => [r.id, r.wins, r.place])).toEqual([
      ["p1", 3, 1],
      ["p2", 2, 2],
      ["p3", 1, 3],
      ["p4", 0, 4],
    ]);
  });
});

describe("every bracket size finishes", () => {
  it("single and double elimination from 2 to 40 players, with random upsets", () => {
    let seed = 7;
    const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    for (let n = 2; n <= 40; n++) {
      for (const double of [false, true]) {
        const done = playAll(buildElimination(players(n), { double, bestOf: 3 }), () => (rand() < 0.5 ? 1 : 2));
        expect(isFinished(done), `${double ? "double" : "single"} ${n}`).toBe(true);
        const places = eliminationPlacements(done);
        expect(new Set(places.map((p) => p.id)).size, `${double ? "double" : "single"} ${n}`).toBe(n);
        expect(places.filter((p) => p.place === 1)).toHaveLength(1);
      }
    }
  });
});

describe("DQs", () => {
  it("a player DQ'd in winners is out, not dropped to losers, and still gets a placement", () => {
    let sets = buildElimination(players(4), { double: true, bestOf: 3 });
    // p4 (W1-0 slot 2 vs p1) no-shows.
    const w1 = sets.find((s) => s.key === "W1-0")!;
    const p1Slot = w1.p[0].id === "p1" ? 1 : 2;
    sets = apply(sets, reportResult(sets, "W1-0", p1Slot, p1Slot === 1 ? [0, -1] : [-1, 0]));
    const l1 = sets.find((s) => s.key === "L1-0")!;
    expect(l1.p.some((x) => x.id === "p4")).toBe(false); // not sent to losers
    const done = playAll(sets);
    expect(isFinished(done)).toBe(true);
    const places = eliminationPlacements(done);
    expect(places.map((p) => p.id).sort()).toEqual(["p1", "p2", "p3", "p4"]);
    expect(places.find((p) => p.id === "p4")!.place).toBe(4); // knocked out first
  });
});

describe("fixResult (host fixes a score after later sets were played)", () => {
  const winnerOf = (s: EngineSet) => (s.winner ? s.p[s.winner - 1].id : null);
  const firstW1 = (sets: EngineSet[]) => sets.filter((s) => s.bracket === "W" && s.round === 1 && s.state === "done")[0];

  it("changes only the score when the winner stays the same", () => {
    const done = playAll(buildElimination(players(8), { double: true, bestOf: 3 }));
    const s = firstW1(done);
    const { changed, cleared } = fixResult(done, s.key, s.winner!, s.winner === 1 ? [2, 1] : [1, 2]);
    expect(cleared).toEqual([]);
    expect(changed).toHaveLength(1);
    expect(changed[0].score).toEqual(s.winner === 1 ? [2, 1] : [1, 2]);
    expect(isFinished(apply(done, changed))).toBe(true);
  });

  it("flips the winner: later played sets are cleared and the new winner moves on", () => {
    const done = playAll(buildElimination(players(8), { double: true, bestOf: 3 }));
    const s = firstW1(done);
    const loser = s.p[2 - s.winner!].id;
    const later = laterPlayed(done, s.key);
    expect(later.length).toBeGreaterThan(0);
    const flip = (s.winner === 1 ? 2 : 1) as 1 | 2;
    const { changed, cleared } = fixResult(done, s.key, flip, flip === 1 ? [2, 1] : [1, 2]);
    expect(cleared.sort()).toEqual(later.map((t) => t.key).sort());
    const after = apply(done, changed);
    expect(winnerOf(after.find((x) => x.key === s.key)!)).toBe(loser);
    expect(isFinished(after)).toBe(false);
    // The new winner is waiting in the next winners set.
    const next = after.find((x) => x.key === s.winnerTo!.key)!;
    expect(next.p[s.winnerTo!.slot - 1].id).toBe(loser);
    // Replaying finishes the bracket again.
    expect(isFinished(playAll(after))).toBe(true);
  });

  it("fixes a grand final the other way (reset cleared)", () => {
    // Losers-side player wins GF1, so a reset is played; then the host fixes GF1 to the winners-side player.
    let sets = playAll(buildElimination(players(4), { double: true, bestOf: 3 }), (s) => (s.bracket === "GF" ? 2 : Number(s.p[0].id?.slice(1)) < Number(s.p[1].id?.slice(1)) ? 1 : 2));
    const gf = sets.find((s) => s.bracket === "GF")!;
    expect(sets.find((s) => s.bracket === "GF2")!.state).toBe("done");
    const { changed } = fixResult(sets, gf.key, 1, [2, 0]);
    sets = apply(sets, changed);
    expect(sets.find((s) => s.bracket === "GF2")!.state).toBe("skipped");
    expect(isFinished(sets)).toBe(true);
    expect(eliminationPlacements(sets)[0]).toMatchObject({ id: gf.p[0].id, place: 1 });
  });

  it("can't be used on a set without a result as a fix (it just reports it)", () => {
    const fresh = buildElimination(players(4), { double: false, bestOf: 3 });
    const ready = fresh.find((s) => s.state === "ready")!;
    expect(fixResult(fresh, ready.key, 1, [2, 0]).changed.some((s) => s.key === ready.key && s.state === "done")).toBe(true);
  });
});

describe("knocked out", () => {
  it("knocks out exactly the players who end up with a placement other than 1st", async () => {
    const { knockedOut } = await import("@/lib/bracketEngine");
    for (const double of [false, true]) {
      let sets = buildElimination(players(8), { double, bestOf: 3 });
      const out: string[] = [];
      for (let guard = 0; guard < 500; guard++) {
        const next = sets.find((s) => s.state === "ready");
        if (!next) break;
        const seedNo = (id: string | null) => Number(id?.slice(1) ?? 999);
        const w = seedNo(next.p[0].id) < seedNo(next.p[1].id) ? 1 : 2;
        sets = apply(sets, reportResult(sets, next.key, w, w === 1 ? [2, 0] : [0, 2]));
        const who = knockedOut(sets, sets.find((s) => s.key === next.key)!);
        if (who) out.push(who);
      }
      // Everyone but the champion was knocked out exactly once, at the moment they lost for good.
      expect(out.sort(), `double=${double}`).toEqual(players(8).filter((p) => p !== "p1").sort());
      expect(new Set(out).size).toBe(7);
    }
  });
  it("a winners-side loss in double elimination doesn't knock you out", async () => {
    const { knockedOut } = await import("@/lib/bracketEngine");
    let sets = buildElimination(players(4), { double: true, bestOf: 3 });
    const first = sets.find((s) => s.state === "ready" && s.bracket === "W")!;
    sets = apply(sets, reportResult(sets, first.key, 1, [2, 0]));
    expect(knockedOut(sets, sets.find((s) => s.key === first.key)!)).toBeNull();
  });
});

describe("brackets that end on a DQ or a bye", () => {
  it("2 players, one no-shows: the bracket finishes with the other as champion (the grand final is a bye)", () => {
    let sets = buildElimination(players(2), { double: true, bestOf: 3 });
    sets = apply(sets, reportResult(sets, "W1-0", 1, [0, -1])); // p2 DQ'd
    expect(sets.find((s) => s.bracket === "GF")!.state).toBe("bye");
    expect(sets.some((s) => s.state === "ready")).toBe(false); // nothing left to play
    expect(isFinished(sets)).toBe(true);
    expect(eliminationPlacements(sets)).toEqual([{ id: "p1", place: 1 }, { id: "p2", place: 2 }]);
    // The host can still undo the DQ: the bracket is in play again.
    expect(canUndo(sets, "W1-0")).toBe(true);
    sets = apply(sets, undoResult(sets, "W1-0"));
    expect(isFinished(sets)).toBe(false);
    expect(sets.find((s) => s.key === "W1-0")!.state).toBe("ready");
  });

  it("the winners-side finalist is DQ'd in the grand final: no reset, the other finalist wins", () => {
    let sets = buildElimination(players(4), { double: true, bestOf: 3 });
    sets = playAll(sets, (s) => (s.bracket === "GF" ? 1 : Number(s.p[0].id!.slice(1)) < Number(s.p[1].id!.slice(1)) ? 1 : 2));
    // Replay the grand final the other way: p1 (winners side, slot 1) no-shows.
    sets = apply(sets, undoResult(sets, sets.find((s) => s.bracket === "GF")!.key));
    const gf = sets.find((s) => s.bracket === "GF")!;
    sets = apply(sets, reportResult(sets, gf.key, 2, [-1, 0]));
    expect(sets.find((s) => s.bracket === "GF2")!.state).toBe("skipped");
    expect(isFinished(sets)).toBe(true);
    const places = eliminationPlacements(sets);
    expect(places[0]).toEqual({ id: gf.p[1].id, place: 1 });
    expect(places.find((p) => p.id === gf.p[0].id)!.place).toBe(2);
    expect(places).toHaveLength(4);
  });

  it("a normal grand final loss by the winners-side player still plays the reset", () => {
    let sets = buildElimination(players(4), { double: true, bestOf: 3 });
    sets = playAll(sets, (s) => (s.bracket === "GF" ? 2 : Number(s.p[0].id!.slice(1)) < Number(s.p[1].id!.slice(1)) ? 1 : 2));
    // playAll stops when nothing is ready, so the reset was played too (by seed).
    expect(sets.find((s) => s.bracket === "GF2")!.state).toBe("done");
    expect(isFinished(sets)).toBe(true);
  });
});

describe("top 8 in single elimination", () => {
  it("starts at the quarter-finals (8 players left), a round earlier than the winners side of double elimination", () => {
    const single = buildElimination(players(16), { double: false, bestOf: 3, bestOfTop: 5 });
    expect(single.find((s) => s.key === "W1-0")!.bestOf).toBe(3); // round of 16
    expect(single.find((s) => s.key === "W2-0")!.bestOf).toBe(5); // quarter-final
    expect(single.find((s) => s.key === "W4-0")!.bestOf).toBe(5); // final
    const double = buildElimination(players(16), { double: true, bestOf: 3, bestOfTop: 5 });
    expect(double.find((s) => s.key === "W2-0")!.bestOf).toBe(3); // winners quarter-final: 12 players still in
    expect(double.find((s) => s.key === "W3-0")!.bestOf).toBe(5); // winners semi-final
  });
});

describe("which set a player should play now", () => {
  it("round robin: both opponents are pointed at the same set, whatever order the sets load in", async () => {
    const { currentSetFor } = await import("@/lib/bracketEngine");
    const sets = buildRoundRobin(players(6), { bestOf: 3 });
    for (const order of [sets, [...sets].reverse(), [...sets].sort((a, b) => a.key.localeCompare(b.key) * -1)]) {
      for (const id of players(6)) {
        const mine = currentSetFor(order, id)!;
        const opponent = mine.p[0].id === id ? mine.p[1].id! : mine.p[0].id!;
        expect(mine.round).toBe(1); // the first round comes first
        expect(currentSetFor(order, opponent)!.key).toBe(mine.key);
      }
    }
  });
  it("a set already being played comes before an earlier one that's only called", async () => {
    const { currentSetFor } = await import("@/lib/bracketEngine");
    const sets = buildRoundRobin(players(4), { bestOf: 3 });
    const later = sets.find((s) => s.round === 3 && s.p.some((x) => x.id === "p1"))!;
    const marked = sets.map((s) => (s.key === later.key ? { ...s, state: "live" as const } : s));
    expect(currentSetFor(marked, "p1")!.key).toBe(later.key);
    expect(currentSetFor(sets, "nobody")).toBeUndefined();
  });
});
