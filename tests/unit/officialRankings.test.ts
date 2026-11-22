import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));

import { knownPlayers } from "@/components/history/OfficialRanking";
import type { MajorEvent } from "@/lib/majorEvents";
import { OFFICIAL_RANKINGS, allTimeRanking, officialRanking, officialRankings, officialRankingsIn, rankingPlaces, rankingTallies } from "@/lib/officialRankings";

describe("official rankings", () => {
  it("has at most one year-end ranking per game and year; numbered ones are a top 10 in order, tiered ones have tiers", () => {
    const keys = OFFICIAL_RANKINGS.filter((r) => !r.kind).map((r) => `${r.game}|${r.year}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const r of OFFICIAL_RANKINGS) {
      if (r.kind === "tiers") {
        expect(r.tiers?.length).toBeGreaterThan(0);
        continue;
      }
      expect(r.top.length).toBe(10);
      expect(r.top.map(([rank]) => rank)).toEqual([...r.top.map(([rank]) => rank)].sort((a, b) => a - b));
      expect(r.page).toMatch(/^[\w.%-]+$/);
    }
  });

  it("finds a year's ranking, and none for years without one", () => {
    expect(officialRanking(2016, "melee")?.top[0]).toEqual([1, "Armada"]);
    expect(officialRanking(2020, "melee")).toBeNull();
    expect(officialRankings(2020, "melee")).toEqual([]);
    expect(allTimeRanking("smash4")?.top[0]).toEqual([1, "ZeRo"]);
    expect(allTimeRanking("melee")).toBeNull();
    expect(officialRankingsIn(2014).map((r) => r.game).sort()).toEqual(["brawl", "melee", "melee"]); // SSBMRank 2014 and Summer 2014
    expect(officialRanking(2017, "smash4")?.top[0]).toEqual([1, "ZeRo"]);
    expect(officialRanking(2015, "smash4")).toBeNull(); // PGR v1 spans 2015-2016: not a year-end edition
    expect(officialRankings(2016, "smash4").map((r) => r.page)).toEqual(["PGR_v2", "PGR_v1"]); // year-end first
    expect(officialRankings(2021, "brawl").map((r) => r.page)).toEqual(["SSBBRank_2020-2022"]); // multi-year spans
    expect(officialRankings(2021, "melee").map((r) => r.kind)).toEqual(["tiers"]);
    expect(officialRankingsIn(2021).some((r) => r.kind === "tiers")).toBe(false);
  });

  it("links a ranked name to a player seen at the year's majors (sponsor tags and capitals ignored)", () => {
    const ev = (game: MajorEvent["game"], name: string, playerId: string | null): MajorEvent => ({ majorSlug: "m", eventId: "e", game, name: "Singles", entrants: 500, teams: false, online: false, top8: [{ place: 1, name, playerId }] });
    const known = knownPlayers([[ev("melee", "C9 | Mang0", "1000"), ev("ultimate", "MkLeo", "222927")]], "melee", new Map([["armada", "6189"]]));
    expect(known.get("mang0")).toBe("1000");
    expect(known.get("armada")).toBe("6189");
    expect(known.has("mkleo")).toBe(false);
  });
});

describe("rankingPlaces", () => {
  const key = (n: string) => n.split(" | ").at(-1)!.toLowerCase();
  it("finds a player's places in a game's numbered rankings, year-end first within a year", () => {
    const places = rankingPlaces("melee", new Set(["hungrybox"]), key);
    expect(places.slice(0, 2).map((p) => [p.ranking.year, p.ranking.kind ?? "year", p.rank])).toEqual([[2013, "year", 5], [2014, "year", 5]]);
    expect(places.some((p) => p.ranking.kind === "tiers")).toBe(false);
    expect(rankingPlaces("smash4", new Set(["hungrybox"]), key)).toEqual([]);
  });
});

describe("rankingTallies", () => {
  it("counts #1s and top 10s over year-end editions, joining tags that are one player", () => {
    const key = (n: string) => (/^mang[o0]$/i.test(n) ? "1000" : n.toLowerCase());
    const melee = rankingTallies("melee", key);
    const mango = melee.find((t) => t.key === "1000")!;
    expect([mango.firsts, mango.firstYear, mango.name]).toEqual([2, 2013, "Mang0"]); // SSBMRank 2013 and 2014
    expect(melee.find((t) => t.key === "hungrybox")?.firsts).toBe(3); // 2017-2019
    expect(rankingTallies("brawl", (n) => n.toLowerCase()).find((t) => t.key === "nairo")?.firsts).toBe(3); // 2014 tie, 2016-17, 2018-19
  });
});
