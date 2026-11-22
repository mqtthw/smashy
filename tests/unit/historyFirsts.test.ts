import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: () => {} }));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));

import { characterByYear, defensesIn, firstCharacterWins, firstWins, yearCharacters, firstWinsIn, gameRecords, handAddedPlacings, majorReturns, mostPlayedIn, namePlacings, playerMilestone, unlinkedNameKeys, rivalriesIn, seriesOf, titleDefenses, type WinBracket } from "@/lib/historyFirsts";

const b = (slug: string, date: string, winner: string, playerId: string | null, entrants: number | null = 1000, eventId = "e"): WinBracket => ({
  majorSlug: slug, majorName: slug, startAt: `${date}T00:00:00Z`, eventId: `${eventId}-${slug}`, name: "Singles", entrants, top8: [{ place: 1, name: winner, playerId }],
});

describe("firstWins", () => {
  it("keeps each winner's earliest major, counting a linked tag and a sponsor tag as the same player", () => {
    const all = firstWins(
      [b("m3", "2016-01-01", "C9 | Mang0", "1000"), b("m1", "2009-03-07", "Mango", null, null, "manual"), b("m2", "2015-06-01", "Armada", "6189")],
      "melee",
      new Map([["mango", "1000"]]),
    );
    expect(all.map((w) => [w.name, w.majorSlug])).toEqual([["Mango", "m1"], ["Armada", "m2"]]);
  });

  it("uses each major's biggest bracket, and skips start.gg brackets below the game's major size", () => {
    const all = firstWins([b("m1", "2020-01-01", "Side", "1", 40), b("m1", "2020-01-01", "Main", "2", 900), b("m2", "2021-01-01", "Small", "3", 20)], "melee", new Map());
    expect(all.map((w) => w.name)).toEqual(["Main"]);
  });
});

describe("firstWinsIn", () => {
  const all = firstWins([b("a", "2003-01-01", "Ken", null, null, "manual"), b("b", "2006-04-21", "PC Chris", null, null, "manual"), b("c", "2006-07-21", "Ken", null, null, "manual")], "melee", new Map());
  it("lists a year's breakthroughs, none for the first year on record", () => {
    expect(firstWinsIn(all, 2006).map((w) => w.name)).toEqual(["PC Chris"]);
    expect(firstWinsIn(all, 2003)).toEqual([]);
  });
});

describe("firstWins with hand-added names", () => {
  it("counts a hand-added name as the one start.gg player who placed under it, but not an ambiguous one", () => {
    const top = (slug: string, date: string, rows: [string, string | null][]): WinBracket => ({
      majorSlug: slug, majorName: slug, startAt: `${date}T00:00:00Z`, eventId: `manual-${slug}`, name: "Singles", entrants: null,
      top8: rows.map(([name, playerId], i) => ({ place: i + 1, name, playerId })),
    });
    const all = firstWins(
      [
        top("old", "2009-03-07", [["Mango", null]]),
        top("older", "2004-01-10", [["Ken", null]]),
        top("new", "2018-08-24", [["The Mango", "1000"], ["Mango", "1000"]]),
        top("x", "2019-01-01", [["Ken", "1"], ["Ken", "2"]]),
      ],
      "melee",
      new Map(),
    );
    expect(all.find((w) => w.playerId === "1000")?.majorSlug).toBe("old"); // Mango's first win stays 2009
    expect(all.find((w) => w.playerId === "1")?.majorSlug).toBe("x"); // two start.gg "Ken"s: 2004's Ken isn't merged
    expect(all.find((w) => w.key === "name:ken")?.majorSlug).toBe("older");
  });
});

describe("seriesOf", () => {
  it("groups a series' editions however they're numbered", () => {
    const same = (names: string[]) => expect(new Set(names.map(seriesOf)).size).toBe(1);
    same(["GENESIS", "GENESIS 2", "Genesis 9", "GENESIS X", "Genesis X2"]);
    same(["Smash Summit", "Smash Summit 2", "Smash Summit 14 Presented by Coinbase"]);
    same(["Tipped Off 11", "Tipped Off 12 , Presented by The Lab Gaming Center!", "Tipped Off 17: Haunted"]);
    same(["Smash 'N' Splash 2", "Smash'N'Splash 3"]);
    same(["Pound 2", "Pound V", "Pound 2016"]);
    same(["8th Kanto", "10th Kanto"]);
    same(["篝火#9", "篝火#11/KAGARIBI#11"]);
    same(["Glitch 8 - Missingno", "Glitch 8.5 - Konami Code"]);
    same(["CEO 2014", "CEO 2018 Fighting Game Championships"]);
    same(["Riptide", "Riptide 2022"]);
    same(["Smash Summit 3", "Smash Summit - Spring 2017", "Smash Summit 5"]);
    same(["Glitch 8 - Missingno", "Glitch - Regen"]);
    same(["KTAR 6", "KTAR XX - 2 Day Smash 4 Event"]);
    same(["Low Tier City 3", "Low Tide City 2021", "Kumite in Texas / Low Tier City 6"]);
    same(["The Big Balc", "The Bigger Balc", "The Even Bigger Balc"]);
    same(["Let's Make BIG Moves 2023", "Luminosity Makes BIG Moves 2025"]);
    same(["2005 MLG National Championships", "MLG National Championship 2010"]);
    same(["EVO World 2007", "EVO 2009"]);
  });

  it("keeps different series apart", () => {
    expect(seriesOf("Battle of BC 4")).not.toBe(seriesOf("Battle of the Five Gods"));
    expect(seriesOf("8th Kanto")).not.toBe(seriesOf("8th Kansai"));
    expect(seriesOf("2GGC: Genesis Saga")).not.toBe(seriesOf("2GGC: Nairo Saga"));
    expect(seriesOf("EVO 2013")).not.toBe(seriesOf("EVO Japan 2018"));
  });
});

describe("titleDefenses", () => {
  const all = titleDefenses(
    [
      b("g1", "2009-07-10", "Mango", null, null, "manual"),
      b("evo13", "2013-07-12", "Mango", null, null, "manual"),
      b("g2", "2011-01-14", "Mango", null, null, "manual"),
      b("g3", "2016-01-15", "Armada", "6189"),
      b("g4", "2017-01-20", "Armada", "6189"),
      b("g5", "2018-01-19", "Armada", "6189"),
      b("g6", "2019-01-18", "Hungrybox", "1004"),
    ].map((x) => ({ ...x, majorName: x.majorSlug.startsWith("evo") ? "EVO 2013" : `Genesis ${x.majorSlug.slice(1)}` })),
    "melee",
    new Map(),
  );
  it("lists each repeat champion with how many editions in a row", () => {
    expect(all.map((d) => [d.name, d.majorName, d.previousName, d.streak])).toEqual([
      ["Mango", "Genesis 2", "Genesis 1", 2],
      ["Armada", "Genesis 4", "Genesis 3", 2],
      ["Armada", "Genesis 5", "Genesis 4", 3],
    ]);
    expect(defensesIn(all, 2018).map((d) => d.streak)).toEqual([3]);
  });
});

describe("majorReturns", () => {
  it("lists a win two years or more after the same player's previous one", () => {
    const all = majorReturns(
      [
        b("a", "2010-01-01", "Mango", null, null, "manual"),
        b("b", "2011-06-01", "C9 | Mang0", "1000"),
        b("c", "2014-03-01", "Mang0", "1000"),
        b("d", "2015-01-01", "Armada", "6189"),
        b("e", "2015-12-01", "Mang0", "1000"),
      ],
      "melee",
      new Map(),
    );
    expect(all.map((r) => [r.name, r.majorSlug, r.previousSlug])).toEqual([["Mang0", "c", "b"]]);
  });
});

describe("rivalriesIn", () => {
  const gf = (slug: string, date: string, w: [string, string | null], l: [string, string | null]): WinBracket => ({
    majorSlug: slug, majorName: slug, startAt: `${date}T00:00:00Z`, eventId: `manual-${slug}`, name: "Singles", entrants: null,
    top8: [{ place: 1, name: w[0], playerId: w[1] }, { place: 2, name: l[0], playerId: l[1] }],
  });
  it("counts the year's repeated grand finals, leader first", () => {
    const all = rivalriesIn(
      [
        gf("a", "2018-01-01", ["Armada", "6189"], ["Hungrybox", "1004"]),
        gf("b", "2018-03-01", ["Liquid | Hungrybox", "1004"], ["Armada", "6189"]),
        gf("c", "2018-05-01", ["Hungrybox", null], ["Armada", null]),
        gf("d", "2018-06-01", ["Plup", "15990"], ["Hungrybox", "1004"]),
        gf("e", "2019-01-01", ["Plup", "15990"], ["Hungrybox", "1004"]),
      ],
      "melee",
      new Map(),
      2018,
    );
    expect(all.map((r) => [r.a.name, r.aWins, r.b.name, r.bWins, r.finals.length])).toEqual([["Hungrybox", 2, "Armada", 1, 3]]);
  });
});

describe("gameRecords", () => {
  const named = (x: WinBracket, majorName: string): WinBracket => ({ ...x, majorName });
  const r = gameRecords(
    [
      named(b("s1", "2015-11-05", "Armada", "6189"), "Smash Summit"),
      named(b("s2", "2016-04-21", "Armada", "6189"), "Smash Summit 2"),
      named(b("s3", "2016-11-03", "Armada", "6189"), "Smash Summit 3"),
      named(b("g1", "2009-07-10", "Mango", "1000"), "Genesis"),
      named(b("e1", "2013-07-12", "Mang0", "1000"), "EVO 2013"),
      named(b("g9", "2023-04-07", "Mang0", "1000"), "Genesis 9"),
    ],
    "melee",
    new Map(),
  );
  it("counts wins, the longest run once, and returns longest gap first", () => {
    expect(r.wins.map((w) => [w.name, w.wins])).toEqual([["Mang0", 3], ["Armada", 3]]);
    expect(r.top8s.map((w) => [w.name, w.top8s])).toEqual([["Mang0", 3], ["Armada", 3]]);
    expect(r.runs.map((d) => [d.name, d.streak, d.majorName])).toEqual([["Armada", 3, "Smash Summit 3"]]);
    expect(r.returns.map((x) => [x.majorName, x.previousName])).toEqual([["Genesis 9", "EVO 2013"], ["EVO 2013", "Genesis"]]);
  });
});

describe("hand-added names and a stray second account", () => {
  it("goes to the account that placed under the name at least five times as often as the rest", () => {
    const top = (slug: string, date: string, name: string, playerId: string | null): WinBracket => ({
      majorSlug: slug, majorName: slug, startAt: `${date}T00:00:00Z`, eventId: `manual-${slug}`, name: "Singles", entrants: null,
      top8: [{ place: 1, name, playerId }],
    });
    const brackets = [top("old", "2012-01-01", "SuPeRbOoMfAn", null), top("odd", "2017-01-01", "SuPeRbOoMfAn", "42049")];
    for (let i = 0; i < 5; i++) brackets.push(top(`m${i}`, `2018-0${i + 1}-01`, "PG | SuPeRbOoMfAn", "31578"));
    expect(gameRecords(brackets, "smash64", new Map()).wins.map((w) => [w.playerId, w.wins])).toEqual([["31578", 6], ["42049", 1]]);
  });
});

describe("gameRecords top 8s", () => {
  it("counts each player's top 8 finishes in main brackets, ties included", () => {
    const t = (slug: string, date: string, rows: [number, string, string | null][]): WinBracket => ({
      majorSlug: slug, majorName: slug, startAt: `${date}T00:00:00Z`, eventId: `manual-${slug}`, name: "Singles", entrants: null,
      top8: rows.map(([place, name, playerId]) => ({ place, name, playerId })),
    });
    const r = gameRecords(
      [t("a", "2010-01-01", [[1, "Mango", "1000"], [2, "Armada", "6189"], [5, "PPMD", "3"]]), t("b", "2011-01-01", [[1, "Armada", "6189"], [5, "Mango", "1000"], [5, "PPMD", "3"], [9, "Lucky", "4"]])],
      "melee",
      new Map(),
    );
    expect(r.top8s.map((w) => [w.name, w.top8s])).toEqual([["Mango", 2], ["Armada", 2], ["PPMD", 2]]);
  });
});

describe("playerMilestone", () => {
  const named = (x: WinBracket, majorName: string): WinBracket => ({ ...x, majorName });
  const brackets = [
    named(b("g1", "2009-07-10", "Mang0", null, null, "manual"), "Genesis"),
    named(b("e1", "2013-07-12", "Mang0", "1000"), "EVO 2013"),
    named(b("e2", "2014-07-11", "C9 | Mang0", "1000"), "EVO 2014"),
    named(b("g9", "2023-04-07", "Mang0", "1000"), "Genesis 9"),
    named(b("x", "2015-01-01", "Armada", "6189"), "Apex 2015"),
  ];
  it("gives a player's wins, first win, longest run and longest wait", () => {
    const m = playerMilestone(brackets, "melee", new Map(), "1000")!;
    expect([m.wins, m.first?.majorSlug, m.run?.majorName, m.run?.streak, m.wait?.majorName, m.wait?.previousName]).toEqual([4, "g1", "EVO 2014", 2, "Genesis 9", "EVO 2014"]);
    expect(playerMilestone(brackets, "melee", new Map(), "999")).toBeNull();
  });
});

describe("handAddedPlacings", () => {
  const t = (slug: string, date: string, rows: [number, string, string | null][], eventId = `manual-${slug}`): WinBracket => ({
    majorSlug: slug, majorName: slug, startAt: `${date}T00:00:00Z`, eventId, name: "P+ Singles", entrants: 300,
    top8: rows.map(([place, name, playerId]) => ({ place, name, playerId })),
  });
  it("finds a player's hand-added placings by the name they placed under at start.gg majors", () => {
    const brackets = [
      t("sg", "2019-01-01", [[1, "PPU | Switch", "77"], [2, "Malachi", "88"]], "12345"),
      t("sns3", "2017-06-02", [[1, "Switch", null], [2, "Sothe", null], [7, "Malachi", null]]),
      t("ltc5", "2017-08-05", [[1, "Malachi", null], [8, "Switch", null]]),
    ];
    expect(handAddedPlacings(brackets, "pplus", new Map(), "77").map((r) => [r.slug, r.place])).toEqual([["sns3", 1], ["ltc5", 8]]);
    expect(handAddedPlacings(brackets, "pplus", new Map(), "999")).toEqual([]);
  });
});

describe("namePlacings", () => {
  it("lists a name's placings that no start.gg player stands for, best per major", () => {
    const t = (slug: string, date: string, rows: [number, string, string | null][], name = "Singles"): WinBracket => ({
      majorSlug: slug, majorName: slug, startAt: `${date}T00:00:00Z`, eventId: `manual-${slug}-${name}`, name, entrants: 500,
      top8: rows.map(([place, n, playerId]) => ({ place, name: n, playerId })),
    });
    const brackets = [
      t("a", "2015-01-31", [[1, "ZeRo", null], [2, "Nairo", "16104"]]),
      t("a", "2015-01-31", [[1, "ZeRo", null]], "Amateur Bracket"),
      t("b", "2016-06-01", [[3, "Tempo | ZeRo", null]]),
      t("c", "2017-01-01", [[1, "Nairo", "16104"]]),
    ];
    expect(namePlacings(brackets, "smash4", new Map(), "zero").map((p) => [p.slug, p.place, p.side])).toEqual([["b", 3, false], ["a", 1, false]]);
    expect(namePlacings(brackets, "smash4", new Map([["zero", "99"]]), "zero")).toEqual([]); // linked: it's a player's now
    expect(namePlacings(brackets, "smash4", new Map(), "nairo")).toEqual([]);
  });
});

describe("unlinkedNameKeys", () => {
  it("keeps only names no start.gg player stands for", () => {
    const t: WinBracket = { majorSlug: "a", majorName: "a", startAt: "2015-01-01T00:00:00Z", eventId: "manual-a", name: "Singles", entrants: 100,
      top8: [{ place: 1, name: "ZeRo", playerId: null }, { place: 2, name: "Nairo", playerId: null }, { place: 3, name: "Nairo", playerId: "16104" }] };
    expect([...unlinkedNameKeys([t], new Map())]).toEqual(["zero"]);
  });
});

describe("mostPlayedIn", () => {
  it("counts each placing's characters once, most first", () => {
    expect(mostPlayedIn([{ characters: ["Marth", "Captain Falcon"] }, { characters: ["Marth"] }, {}, { characters: ["Fox", "Marth"] }])).toEqual(["Marth", "Captain Falcon", "Fox"]);
    expect(mostPlayedIn([])).toEqual([]);
  });
});

describe("yearCharacters", () => {
  it("counts the year's top 8 characters once per placing, joining spellings, with what was known", () => {
    const majors = [
      { majorSlug: "a", startAt: "2008-03-01T00:00:00Z", rows: [["Fox", "Falco"], ["Fox"], [], ["Jigglypuff"]] },
      { majorSlug: "b", startAt: "2008-07-01T00:00:00Z", rows: [["Marth"], ["Fox", "Fox"]] },
      { majorSlug: "c", startAt: "2009-01-01T00:00:00Z", rows: [["Sheik"]] },
    ];
    const y = yearCharacters(majors, 2008);
    expect(y.characters.map((c) => [c.name, c.n])).toEqual([["Fox", 3], ["Falco", 1], ["Jigglypuff", 1], ["Marth", 1]]);
    expect([y.placings, y.known, y.majors]).toEqual([6, 5, 2]);
    expect(yearCharacters(majors, 2010).characters).toEqual([]);
  });
});

describe("characterByYear", () => {
  it("gives a character's top 8 placings per year, only for years where most characters are known", () => {
    const row = (c: string) => [c];
    const majors = [
      { majorSlug: "a", startAt: "2006-01-01T00:00:00Z", rows: ["Fox", "Fox", "Marth", "Sheik", "Peach", "Falco", "Fox", "Samus"].map(row) },
      { majorSlug: "b", startAt: "2007-01-01T00:00:00Z", rows: [...["Fox", "Fox", "Marth"].map(row), ...Array.from({ length: 13 }, () => [])] },
      { majorSlug: "c", startAt: "2008-01-01T00:00:00Z", rows: ["Marth", "Sheik", "Peach", "Falco", "Samus", "Marth", "Sheik", "Peach"].map(row) },
    ];
    expect(characterByYear(majors, "fox")).toEqual([{ year: 2006, n: 3, known: 8 }, { year: 2008, n: 0, known: 8 }]);
  });
});

describe("firstCharacterWins", () => {
  it("keeps each character's earliest win, joining spellings", () => {
    const w = (slug: string, date: string, name: string, characters: string[]) => ({ majorSlug: slug, majorName: slug, startAt: date, key: name, playerId: null, name, characters });
    const firsts = firstCharacterWins([w("b", "2005-01-01", "Ken", ["Marth"]), w("a", "2003-01-01", "Azen", ["Marth", "Fox"]), w("c", "2008-01-01", "Mango", ["Jigglypuff", "fox"])]);
    expect(Object.fromEntries([...firsts].map(([k, v]) => [k, v.majorSlug]))).toEqual({ marth: "a", fox: "a", jigglypuff: "c" });
  });
});
