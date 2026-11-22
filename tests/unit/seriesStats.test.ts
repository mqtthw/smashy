// A weekly series across its editions: the player table, rivalries and the headline numbers.
import { describe, expect, it } from "vitest";
import { editionLabel, nameKey, rivalries, seriesName, seriesPlayers, seriesSummary, type SeriesEdition, type SeriesEntry } from "@/lib/seriesStats";

const entry = (eventId: string, key: string, name: string, place: number | null, handle: string | null = null): SeriesEntry => ({ eventId, key, name, handle, place });

describe("names", () => {
  it("drops the edition number from the series name", () => {
    expect(seriesName("Otaku Zone #12")).toBe("Otaku Zone");
    expect(seriesName("Weekly #3 ")).toBe("Weekly");
    expect(seriesName("Sunday Smash")).toBe("Sunday Smash");
    expect(seriesName("#4")).toBe("#4"); // nothing left: keep the name
  });

  it("labels an edition by its number, or its place in the series", () => {
    expect(editionLabel("Weekly #12", 0)).toBe("#12");
    expect(editionLabel("Weekly # 7", 0)).toBe("#7");
    expect(editionLabel("Weekly", 4)).toBe("#5");
  });

  it("matches walk-ins by name, any letter case", () => {
    expect(nameKey(" Fox Guy ")).toBe(nameKey("fox guy"));
  });
});

describe("the player table", () => {
  const entries = [
    entry("e1", "u1", "Ada", 1, "ada"),
    entry("e1", "u2", "Ben", 2),
    entry("e1", nameKey("Wes"), "Wes", 3),
    entry("e2", "u2", "Ben", 1),
    entry("e2", "u1", "Ada", 2, "ada"),
    entry("e2", nameKey("wes"), "wes", 9),
    entry("e3", "u1", "Ada", 1, "ada"),
    entry("e3", "u3", "Cy", null), // signed up for an edition that hasn't finished
  ];

  it("ranks by medals, then top 8s, then editions played", () => {
    const rows = seriesPlayers(entries);
    expect(rows.map((r) => [r.name, r.editions, r.gold, r.silver, r.bronze, r.top8, r.best])).toEqual([
      ["Ada", 3, 2, 1, 0, 3, 1],
      ["Ben", 2, 1, 1, 0, 2, 1],
      ["Wes", 2, 0, 0, 1, 1, 3], // the same walk-in two weeks running, matched by name
      ["Cy", 1, 0, 0, 0, 0, null],
    ]);
  });

  it("counts one entry per edition", () => {
    expect(seriesPlayers([entry("e1", "u1", "Ada", 1), entry("e1", "u1", "Ada", 1)])[0]).toMatchObject({ editions: 1, gold: 1 });
  });
});

describe("rivalries", () => {
  it("lists the pairs who met most, with each side's wins, closest first among equals", () => {
    const sets = [
      { a: "u1", b: "u2", winner: 1 as const },
      { a: "u2", b: "u1", winner: 1 as const },
      { a: "u1", b: "u2", winner: 1 as const },
      { a: "u1", b: "u3", winner: 1 as const },
      { a: "u3", b: "u1", winner: 2 as const },
      { a: "u2", b: "u3", winner: 2 as const },
      { a: "u3", b: "u4", winner: 1 as const },
      { a: "u4", b: "u3", winner: 1 as const },
    ];
    expect(rivalries(sets)).toEqual([
      { a: "u1", b: "u2", aWins: 2, bWins: 1, sets: 3 },
      { a: "u3", b: "u4", aWins: 1, bWins: 1, sets: 2 }, // 1–1 is closer than 2–0
      { a: "u1", b: "u3", aWins: 2, bWins: 0, sets: 2 },
    ]);
  });

  it("leaves out pairs who met once, and stops at the top few", () => {
    expect(rivalries([{ a: "u1", b: "u2", winner: 1 }])).toEqual([]);
    const many = Array.from({ length: 20 }, (_, i) => [{ a: `p${i}`, b: `q${i}`, winner: 1 as const }, { a: `p${i}`, b: `q${i}`, winner: 2 as const }]).flat();
    expect(rivalries(many, 2, 5)).toHaveLength(5);
  });
});

describe("the headline numbers", () => {
  const ed = (id: string, name: string, status: string, entries: number): SeriesEdition => ({ id, name, startsAt: `2026-11-0${id.slice(1)}T19:00:00Z`, status, entries });
  const editions = [ed("e1", "Weekly #1", "completed", 12), ed("e2", "Weekly #2", "completed", 20), ed("e3", "Weekly #3", "completed", 16), ed("e4", "Weekly #4", "completed", 18), ed("e5", "Weekly #5", "open", 6)];

  it("counts finished editions only, and finds the record and the current streak", () => {
    const won = new Map([["e1", "u2"], ["e2", "u1"], ["e3", "u1"], ["e4", "u1"]]);
    expect(seriesSummary(editions, won)).toEqual({ held: 4, average: 17, record: { label: "#2", entries: 20 }, winners: 2, streak: { key: "u1", wins: 3 } });
  });

  it("has nothing to say before an edition finishes", () => {
    expect(seriesSummary([ed("e1", "Weekly #1", "open", 4)], new Map())).toEqual({ held: 0, average: null, record: null, winners: 0, streak: null });
  });
});
