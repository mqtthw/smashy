import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));

import type { MajorEvent } from "@/lib/majorEvents";
import { applyNameLinks, linkedId, linksForGame, nameKey, readPlayerId, safeToBulkLink, type UnlinkedName } from "@/lib/playerLinks";
import { yearTally } from "@/lib/yearTally";

describe("nameKey", () => {
  it("ignores capitals, spaces and dots, keeps other alphabets", () => {
    expect(nameKey("Dr. PeePee")).toBe("drpeepee");
    expect(nameKey("Silent Wolf")).toBe(nameKey("SilentWolf"));
    expect(nameKey("Mango")).not.toBe(nameKey("Mang0")); // different spellings stay different: an admin links them
    expect(nameKey("あばだんご")).toBe("あばだんご");
  });
});

describe("readPlayerId", () => {
  it("reads an id or a Smashy player page link", () => {
    expect(readPlayerId(" 1000 ")).toBe("1000");
    expect(readPlayerId("https://smashy.gg/players/1004")).toBe("1004");
    expect(readPlayerId("smashy.gg/players/6189?tab=x")).toBe("6189");
    expect(readPlayerId("Mango")).toBeNull();
  });
});

describe("applyNameLinks", () => {
  const ev = (top8: MajorEvent["top8"], teams = false): MajorEvent => ({ majorSlug: "m", eventId: "manual-melee-1", game: "melee", name: "Melee Singles", entrants: 300, teams, online: false, top8 });
  const links = new Map([["mango", "1000"]]);

  it("gives a linked name its player, and leaves ids and teams alone", () => {
    const [singles, doubles] = applyNameLinks([ev([{ place: 1, name: "Mango", playerId: null }, { place: 2, name: "Armada", playerId: "6189" }]), ev([{ place: 1, name: "Mango", playerId: null }], true)], links);
    expect(singles.top8.map((r) => r.playerId)).toEqual(["1000", "6189"]);
    expect(doubles.top8[0].playerId).toBeNull();
  });

  it("lets a year tally count a linked name with the same player's start.gg results", () => {
    const year = [[ev([{ place: 1, name: "Mang0", playerId: "1000" }])], [ev([{ place: 1, name: "Mango", playerId: null }])]];
    expect(yearTally(year, "melee").rows.length).toBe(2);
    expect(yearTally(year.map((e) => applyNameLinks(e, links)), "melee").rows.map((r) => [r.playerId, r.wins])).toEqual([["1000", 2]]);
  });
});

describe("safeToBulkLink", () => {
  const n = (suggestions: UnlinkedName["suggestions"]): UnlinkedName => ({ key: "armada", name: "Armada", placings: 30, games: ["melee"], suggestions });
  it("links in bulk only one player seen at a major under that name, with nobody else", () => {
    expect(safeToBulkLink(n([{ playerId: "6189", tag: "Armada", atMajor: true, everyGame: true }]))).toBe(true);
    // Seen at majors in only some of the name's games: a link counts for all games, so an admin checks.
    expect(safeToBulkLink(n([{ playerId: "40621", tag: "Zero", atMajor: true, everyGame: false }]))).toBe(false);
    expect(safeToBulkLink(n([{ playerId: "1", tag: "Ken", atMajor: false }]))).toBe(false); // only in the player index
    expect(safeToBulkLink(n([{ playerId: "6189", tag: "Armada", atMajor: true, everyGame: true }, { playerId: "2", tag: "Armada", atMajor: false }]))).toBe(false);
    expect(safeToBulkLink(n([]))).toBe(false);
  });
});

describe("per-game links", () => {
  // "zero" in every game is Gonzalo (ZeRo); Smash 64 has its own Zero.
  const links = new Map([["zero", "1"], ["smash64:zero", "40621"], ["ken", "9"]]);
  it("prefers a game's own link, then one for every game", () => {
    expect(linkedId(links, "smash4", "zero")).toBe("1");
    expect(linkedId(links, "smash64", "zero")).toBe("40621");
    expect(linkedId(links, null, "zero")).toBe("1");
    expect(linkedId(links, "melee", "nobody")).toBeUndefined();
  });
  it("gives one game's view of the links", () => {
    expect([...linksForGame(links, "smash64")].sort()).toEqual([["ken", "9"], ["zero", "40621"]]);
    expect([...linksForGame(links, "melee")].sort()).toEqual([["ken", "9"], ["zero", "1"]]);
    expect(linksForGame(links, null).get("zero")).toBe("1");
  });
  it("fills placings by their event's game", () => {
    const ev = (game: "smash4" | "smash64") => ({ majorSlug: "m", eventId: game, game, name: "Singles", entrants: 100, teams: false, online: false, top8: [{ place: 1, name: "Zero", playerId: null }] });
    expect(applyNameLinks([ev("smash4"), ev("smash64")], links).map((e) => e.top8[0].playerId)).toEqual(["1", "40621"]);
  });
});
