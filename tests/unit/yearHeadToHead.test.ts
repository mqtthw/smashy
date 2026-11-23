import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: async () => {}, after: () => {} }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));

import type { MajorEvent } from "@/lib/majorEvents";
import { gridPlayers, hasGrid, nameGridId, yearGrid, yearRecord, type GridSet } from "@/lib/yearHeadToHead";

let n = 0;
const set = (p1: string | null, n1: string, p2: string | null, n2: string, winner: 1 | 2, major = "m", sort = 0): GridSet => ({
  set_id: String(++n), major_slug: major, round: "Round", sort_order: sort, p1_id: p1, p1_name: n1, p1_score: winner === 1 ? 3 : 1, p2_id: p2, p2_name: n2, p2_score: winner === 2 ? 3 : 1, winner,
});
const players = [{ playerId: "1", name: "Mang0" }, { playerId: "2", name: "Armada" }, { playerId: "3", name: "Hungrybox" }];

describe("yearGrid", () => {
  it("counts each set once from both sides, with totals", () => {
    const g = yearGrid(players, [set("1", "Mang0", "2", "Armada", 1), set("2", "Armada", "1", "Mang0", 1), set("3", "Hungrybox", "1", "Mang0", 1)], new Map());
    expect(g.cells["1"]["2"]).toEqual({ wins: 1, losses: 1 });
    expect(g.cells["2"]["1"]).toEqual({ wins: 1, losses: 1 });
    expect(g.cells["1"]["3"]).toEqual({ wins: 0, losses: 1 });
    expect(g.cells["2"]["3"]).toBeUndefined(); // never played
    expect(g.totals["1"]).toEqual({ wins: 1, losses: 2 });
    expect(g.sets).toBe(3);
  });

  it("leaves out sets against players outside the grid, and counts tags an admin linked", () => {
    const g = yearGrid(players, [set("1", "Mang0", "99", "Someone", 1), set(null, "C9 | Mango", "2", "Armada", 2)], new Map([["mango", "1"]]));
    expect(g.sets).toBe(1);
    expect(g.cells["2"]["1"]).toEqual({ wins: 1, losses: 0 });
  });
});

describe("gridPlayers", () => {
  const ev = (top8: MajorEvent["top8"]): MajorEvent => ({ majorSlug: "m", eventId: "e", game: "melee", name: "Melee Singles", entrants: 1000, teams: false, online: false, top8 });
  it("takes the year's most successful players with a start.gg id, without hidden ones", () => {
    const year = [[ev([{ place: 1, name: "Mang0", playerId: "1" }, { place: 2, name: "Old Tag", playerId: null }, { place: 3, name: "Armada", playerId: "2" }])], [ev([{ place: 1, name: "Armada", playerId: "2" }, { place: 2, name: "Hidden", playerId: "4" }])]];
    expect(gridPlayers(year, "melee", new Set(["4"])).map((p) => p.playerId)).toEqual(["2", "1"]);
  });
  it("by name, also takes players without a start.gg id (years read by hand)", () => {
    const year = [[ev([{ place: 1, name: "Ken", playerId: null }, { place: 2, name: "Azen", playerId: null }, { place: 3, name: "Mew2King", playerId: "1003" }])]];
    expect(gridPlayers(year, "melee", new Set(), 12, true).map((p) => p.playerId)).toEqual(["n-ken", "n-azen", "1003"]);
  });
});

describe("counting by name", () => {
  it("a side without an id counts as its name; with names off it doesn't count", () => {
    const players = [{ playerId: nameGridId("Ken"), name: "Ken" }, { playerId: nameGridId("Azen"), name: "Azen" }, { playerId: "1003", name: "Mew2King" }];
    const sets = [set(null, "Ken", null, "Azen", 1), set(null, "Azen", "1003", "Mew2King", 2), set(null, "Sponsor | Ken", "1003", "Mew2King", 1)];
    const g = yearGrid(players, sets, new Map(), true);
    expect(g.cells["n-ken"]["n-azen"]).toEqual({ wins: 1, losses: 0 });
    expect(g.cells["n-ken"]["1003"]).toEqual({ wins: 1, losses: 0 });
    expect(g.totals["1003"]).toEqual({ wins: 1, losses: 1 });
    expect(yearGrid(players, sets, new Map()).sets).toBe(0);
    expect(yearRecord("n-ken", sets, new Map(), ["m"], new Set(), true).wins).toBe(2);
  });
});

describe("yearRecord", () => {
  it("lists a player's sets against anyone, newest major first, then bracket order, from their side", () => {
    const sets = [
      set("1", "C9 | Mang0", "99", "Someone", 1, "old", 1),
      set("2", "Armada", "1", "Mang0", 1, "new", 5),
      set("1", "Mang0", null, "Local Hero", 1, "new", 2),
      set("2", "Armada", "3", "Hungrybox", 1, "new", 1), // not Mang0's
    ];
    const r = yearRecord("1", sets, new Map(), ["new", "old"]);
    expect([r.wins, r.losses]).toEqual([2, 1]);
    expect(r.sets.map((s) => [s.majorSlug, s.opp.name, s.won, s.myScore, s.oppScore])).toEqual([
      ["new", "Local Hero", true, 3, 1],
      ["new", "Armada", false, 1, 3],
      ["old", "Someone", true, 3, 1],
    ]);
  });

  it("leaves out opponents who asked not to be listed", () => {
    const r = yearRecord("1", [set("1", "Mang0", "4", "Hidden", 2), set("1", "Mang0", "2", "Armada", 1)], new Map(), ["m"], new Set(["4"]));
    expect([r.wins, r.losses, r.sets.length]).toEqual([1, 0, 1]);
  });
});

describe("hasGrid", () => {
  it("2014 on always; earlier years only with sets read by hand", () => {
    expect(hasGrid(2014, [])).toBe(true);
    expect(hasGrid(2013, [])).toBe(false);
    expect(hasGrid(2013, [2013])).toBe(true);
    expect(hasGrid(2012, [2013])).toBe(false);
  });
});
