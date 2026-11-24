// Telling same-named players apart in player search (round 782): major top 8s per player, and the order.
import { describe, expect, it } from "vitest";
import { byMajors, majorSummaries, roughCount } from "@/lib/playerSearch";

const rows = [
  { game: "melee", top8: [{ playerId: "1", place: 1 }, { playerId: "2", place: 5 }, { playerId: null, place: 3 }] },
  { game: "melee", top8: [{ playerId: "1", place: 2 }] },
  { game: "ultimate", top8: [{ playerId: "1", place: 7 }, { playerId: "9", place: 1 }] },
];

describe("majorSummaries", () => {
  it("counts top 8s and wins for the players asked about, most-played game first", () => {
    const m = majorSummaries(rows, ["1", "2", "3"]);
    expect(m.get("1")).toEqual({ top8s: 3, wins: 1, games: ["melee", "ultimate"] });
    expect(m.get("2")).toEqual({ top8s: 1, wins: 0, games: ["melee"] });
    expect(m.has("3")).toBe(false); // no top 8s: no line
    expect(m.has("9")).toBe(false); // not asked about
  });
  it("counts a player once per bracket", () => {
    expect(majorSummaries([{ game: "melee", top8: [{ playerId: "1", place: 1 }, { playerId: "1", place: 1 }] }], ["1"]).get("1")?.top8s).toBe(1);
  });
});

describe("byMajors", () => {
  const hits = [{ playerId: "5", tag: "Zain" }, { playerId: "1", tag: "Zain" }, { playerId: "2", tag: "Zaina" }, { playerId: "7", tag: "zain" }];
  it("puts the player with the most top 8s first among the same tag, and keeps the rest in order", () => {
    expect(byMajors("zain", hits, majorSummaries(rows, ["1", "2", "5", "7"])).map((h) => h.playerId)).toEqual(["1", "5", "7", "2"]);
  });
  it("never lifts a looser match above an exact one", () => {
    const m = new Map([["2", { top8s: 50, wins: 9, games: ["melee"] }]]);
    expect(byMajors("zain", hits, m).map((h) => h.playerId)).toEqual(["5", "1", "7", "2"]);
  });
});

describe("roughCount", () => {
  it("is exact below 10 and rounds down to a five after", () => {
    expect([0, 9, 10, 14, 76, 80].map(roughCount)).toEqual(["0", "9", "10+", "10+", "75+", "80+"]);
  });
});
