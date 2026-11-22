import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {} }));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));

import { checkHandMajor, isManualEvent, majorHref, manualSlug, parseTop8, type HandMajorInput } from "@/lib/handMajors";

const APEX_2015: HandMajorInput = {
  name: "Apex 2015",
  start: "2015-01-30",
  end: "2015-02-01",
  city: "Secaucus",
  country: "",
  sourceUrl: "https://liquipedia.net/smash/Apex/2015",
  games: [
    { game: "melee", eventName: "", entrants: "1037", top8: "1. Armada\n2. Hungrybox\n3. Leffen\n4. Mew2King\nPPMD\nMango\nPlup\nSilentWolf" },
    { game: "pplus", eventName: "Project M Singles", entrants: "", top8: "ADHD\nM2K" },
    { game: "", eventName: "", entrants: "", top8: "" },
  ],
};

describe("parseTop8", () => {
  it("reads one name per line and gives double-elimination places", () => {
    expect(parseTop8("1st Ken\n2) Isai\n\n3. Azen\nKorean DJ\nM2K\nPC Chris\nForward\nChillin\nNinth").map((r) => [r.place, r.name])).toEqual([
      [1, "Ken"], [2, "Isai"], [3, "Azen"], [4, "Korean DJ"], [5, "M2K"], [5, "PC Chris"], [7, "Forward"], [7, "Chillin"],
    ]);
  });

  it("keeps a place typed at the start of a line (GENESIS 2: 5th, 6th, 7th, 8th)", () => {
    const genesis2 = ["1 Armada", "2 Mango", "3 Taj", "4 Hungrybox", "5 Mew2King", "6 Shroomed", "7th Dr. PeePee", "8. S2J"].join("\n");
    expect(parseTop8(genesis2).map((r) => [r.place, r.name])).toEqual([
      [1, "Armada"], [2, "Mango"], [3, "Taj"], [4, "Hungrybox"], [5, "Mew2King"], [6, "Shroomed"], [7, "Dr. PeePee"], [8, "S2J"],
    ]);
  });

  it("keeps names that start with a digit whole", () => {
    const apex = ["ZeRo", "Dabuz", "Mr.R", "6WX", "5 9B"].join("\n");
    expect(parseTop8(apex).map((r) => [r.place, r.name])).toEqual([[1, "ZeRo"], [2, "Dabuz"], [3, "Mr.R"], [4, "6WX"], [5, "9B"]]);
  });
});

describe("hand-added majors", () => {
  it("get a slug of their own and their own page", () => {
    expect(manualSlug("Evo World 2007", "2007-08-17")).toBe("manual/2007-evo-world-2007");
    expect(manualSlug("Révolution — Ōsaka!", "2008-01-01")).toBe("manual/2008-revolution-osaka");
    expect(majorHref("manual/2007-evo-world-2007")).toBe("/history/major/2007-evo-world-2007");
    expect(majorHref("genesis-5")).toBe("/events/genesis-5");
  });

  it("save facts with their source: dates, games, each game's top 8", () => {
    const r = checkHandMajor(APEX_2015);
    if ("error" in r) throw new Error(r.error.key);
    expect(r.slug).toBe("manual/2015-apex-2015");
    expect(r.row).toMatchObject({ start_at: "2015-01-30T12:00:00Z", end_at: "2015-02-02T00:00:00.000Z", games: ["melee", "pplus"], entrants: 1037, source: "manual", country: null });
    expect(r.events.map((e) => [e.eventId, e.name, e.top8.length])).toEqual([["manual-melee-1", "Melee Singles", 8], ["manual-pplus-2", "Project M Singles", 2]]);
  });

  it("refuse what's missing or out of range", () => {
    expect(checkHandMajor({ ...APEX_2015, sourceUrl: "" })).toHaveProperty("error");
    expect(checkHandMajor({ ...APEX_2015, sourceUrl: "http://example.com" })).toHaveProperty("error");
    expect(checkHandMajor({ ...APEX_2015, start: "2019-01-18" })).toHaveProperty("error"); // start.gg has it
    expect(checkHandMajor({ ...APEX_2015, end: "2015-01-01" })).toHaveProperty("error");
    expect(checkHandMajor({ ...APEX_2015, country: "USA" })).toHaveProperty("error");
    expect(checkHandMajor({ ...APEX_2015, games: [{ game: "melee", eventName: "", entrants: "", top8: "" }] })).toHaveProperty("error");
    expect(checkHandMajor({ ...APEX_2015, games: [{ game: "", eventName: "", entrants: "", top8: "Armada" }] })).toHaveProperty("error");
  });
});

describe("hand-added majors go back to Smash 64", () => {
  it("accept 1999, not 1998", () => {
    expect(checkHandMajor({ ...APEX_2015, start: "1999-06-01", end: "" })).not.toHaveProperty("error");
    expect(checkHandMajor({ ...APEX_2015, start: "1998-06-01", end: "" })).toHaveProperty("error");
  });
});

describe("isManualEvent", () => {
  it("is a hand-added major's bracket, or a 'manual-' bracket a start.gg major gained", () => {
    expect(isManualEvent("manual/2006-mlg-dallas", "manual-melee-1")).toBe(true);
    expect(isManualEvent("shine-2017", "manual-smash4-1")).toBe(true);
    expect(isManualEvent("shine-2017", "24857")).toBe(false);
  });
});
