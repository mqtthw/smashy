import { describe, expect, it } from "vitest";
import { hostedRecord } from "@/lib/hostedRecord";
import { seedByPlacement } from "@/lib/hostedRecord";

describe("hostedRecord", () => {
  it("counts sets, games and events; DQs count as sets only; byes and unfinished sets are skipped", () => {
    const me = "me";
    const r = hostedRecord(me, [
      { event_id: "e1", p1_id: me, p2_id: "a", p1_score: 2, p2_score: 1, winner: 1 },
      { event_id: "e1", p1_id: "b", p2_id: me, p1_score: 2, p2_score: 0, winner: 1 },
      { event_id: "e2", p1_id: me, p2_id: "c", p1_score: 0, p2_score: -1, winner: 1 }, // opponent DQ'd
      { event_id: "e2", p1_id: me, p2_id: null, p1_score: null, p2_score: null, winner: 1 }, // bye
      { event_id: "e3", p1_id: me, p2_id: "d", p1_score: null, p2_score: null, winner: null }, // not played yet
    ]);
    expect(r).toEqual({ events: 2, setWins: 2, setLosses: 1, gameWins: 2, gameLosses: 3 });
  });
});

import { headToHead, seedByRecord } from "@/lib/hostedRecord";

describe("seedByRecord", () => {
  it("ranks by smoothed win rate, then sets played; no record goes last in its current order", () => {
    const players = [{ userId: "new1" }, { userId: "a" }, { userId: "b" }, { userId: "new2" }, { userId: "c" }];
    const records = { a: { setWins: 1, setLosses: 0 }, b: { setWins: 9, setLosses: 1 }, c: { setWins: 2, setLosses: 2 } };
    expect(seedByRecord(players, records).map((p) => p.userId)).toEqual(["b", "a", "c", "new1", "new2"]);
  });
});

describe("headToHead", () => {
  it("counts finished sets between the two players only", () => {
    const s = (p1: string, p2: string, winner: number | null) => ({ event_id: "e", p1_id: p1, p2_id: p2, p1_score: null, p2_score: null, winner });
    expect(headToHead("a", "b", [s("a", "b", 1), s("b", "a", 1), s("b", "a", 2), s("a", "c", 1), s("a", "b", null)])).toEqual([2, 1]);
  });
});

import { medalTable } from "@/lib/hostedRecord";

describe("medalTable", () => {
  it("orders by golds, then silvers, then bronzes, ignoring 4th and below", () => {
    const t = medalTable([
      { userId: "a", place: 2 }, { userId: "a", place: 2 },
      { userId: "b", place: 1 },
      { userId: "c", place: 3 }, { userId: "c", place: 2 },
      { userId: "d", place: 5 },
    ]);
    expect(t.map((r) => r.userId)).toEqual(["b", "a", "c"]);
    expect(t[1]).toEqual({ userId: "a", gold: 0, silver: 2, bronze: 0 });
  });
});

describe("seedByPlacement", () => {
  const players = ["a", "b", "c", "d", "e"].map((userId) => ({ userId }));
  it("puts last time's best finishers first and newcomers after, in their current order", () => {
    expect(seedByPlacement(players, { c: 1, a: 3, e: 2 }).map((p) => p.userId)).toEqual(["c", "e", "a", "b", "d"]);
  });
  it("keeps tied players in the order they're in now", () => {
    expect(seedByPlacement(players, { d: 5, b: 5, a: 1 }).map((p) => p.userId)).toEqual(["a", "b", "d", "c", "e"]);
  });
  it("changes nothing when nobody was there", () => {
    expect(seedByPlacement(players, {}).map((p) => p.userId)).toEqual(["a", "b", "c", "d", "e"]);
  });
});
