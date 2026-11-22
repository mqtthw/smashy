import { describe, expect, it } from "vitest";
import { buildElimination, buildRoundRobin, reportResult, type EngineSet } from "@/lib/bracketEngine";
import { matchReport, pickSet } from "@/lib/challongeMirror";

const apply = (sets: EngineSet[], changed: EngineSet[]) => {
  const m = new Map(sets.map((s) => [s.key, s]));
  for (const c of changed) m.set(c.key, c);
  return [...m.values()];
};

describe("copying to Challonge", () => {
  it("picks the earliest uncopied set between two players, so a grand final reset maps in order", () => {
    let sets = buildElimination(["p1", "p2"], { double: true, bestOf: 3 });
    const play = (w: 1 | 2) => {
      const s = sets.find((x) => x.state === "ready")!;
      sets = apply(sets, reportResult(sets, s.key, w, w === 1 ? [2, 0] : [0, 2]));
    };
    // 2 players: winners final, then GF won by the losers side (p2), then the reset.
    play(1);
    play(2); // losers side? with 2 players: W1 then GF where p2 comes from losers
    while (sets.some((x) => x.state === "ready")) play(1);
    const copied = new Set<string>();
    const order: string[] = [];
    for (;;) {
      const s = pickSet(sets, copied, "p1", "p2");
      if (!s) break;
      copied.add(s.key);
      order.push(s.bracket);
    }
    const played = sets.filter((s) => s.state === "done" && s.p[0].id && s.p[1].id);
    expect(order).toHaveLength(played.length);
    expect(order.indexOf("GF")).toBeLessThan(order.indexOf("GF2") === -1 ? Infinity : order.indexOf("GF2"));
    expect(pickSet(sets, copied, "p1", "p3")).toBeNull();
  });

  it("reports scores per Challonge player, winner advancing; a DQ stays -1", () => {
    const sets = buildElimination(["a", "b"], { double: false, bestOf: 3 });
    const done = apply(sets, reportResult(sets, sets.find((s) => s.state === "ready")!.key, 2, [1, 2]));
    const s = done.find((x) => x.state === "done")!;
    const ids = (id: string) => `c-${id}`;
    expect(matchReport(s, ids)).toEqual([
      { participant_id: `c-${s.p[0].id}`, score_set: "1", rank: 2, advancing: false },
      { participant_id: `c-${s.p[1].id}`, score_set: "2", rank: 1, advancing: true },
    ]);
    const dq = apply(sets, reportResult(sets, sets.find((x) => x.state === "ready")!.key, 1, [0, -1])).find((x) => x.state === "done")!;
    expect(matchReport(dq, ids).map((r) => r.score_set)).toEqual(["0", "-1"]);
  });
});

import { CHARACTER_LIBRARIES } from "@/lib/essentials";
describe("character resource libraries", () => {
  it("are https links, no duplicates, no Discord file uploads", () => {
    for (const game of Object.values(CHARACTER_LIBRARIES)) {
      for (const lib of Object.values(game ?? {})) {
        const urls = lib.links.map((l) => l.url);
        expect(new Set(urls).size).toBe(urls.length);
        for (const u of urls) {
          expect(u.startsWith("https://")).toBe(true);
          expect(u).not.toMatch(/cdn\.discordapp\.com|\.iso\b/i);
        }
        expect(lib.credit.length).toBeGreaterThan(10);
      }
    }
  });
});

describe("copying a round robin to Challonge", () => {
  it("finds exactly one played set for every pair in a pool, in either order", () => {
    let sets = buildRoundRobin(["p1", "p2", "p3", "p4", "p5"], { bestOf: 3 });
    for (let s = sets.find((x) => x.state === "ready"); s; s = sets.find((x) => x.state === "ready")) sets = apply(sets, reportResult(sets, s.key, 1, [2, 1]));
    const copied = new Set<string>();
    const ids = ["p1", "p2", "p3", "p4", "p5"];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const set = pickSet(sets, copied, ids[j], ids[i]);
        expect(set, `${ids[i]} vs ${ids[j]}`).not.toBeNull();
        copied.add(set!.key);
        expect(pickSet(sets, copied, ids[i], ids[j])).toBeNull();
        expect(matchReport(set!, (id) => id).filter((r) => r.advancing).length).toBe(1);
      }
    }
    expect(copied.size).toBe(sets.length); // 10 sets for 5 players
  });
});
