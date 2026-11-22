// Seasons: points per placement, best N events, merges, the minimum to be ranked, ties, and the CSV.
import { describe, expect, it } from "vitest";
import { computeStandings, DEFAULT_POINTS, findStandingRow, standingRowId, pointsFor, readPointsTable, movementMark, movementSinceLatest, standingsCsv, standingsText, writePointsTable, type SeasonEventData } from "@/lib/seasonsMath";

const ev = (id: string, heldOn: string, results: [string, string, number][], weight = 1): SeasonEventData => ({
  id, name: `Weekly ${id}`, heldOn, weight, results: results.map(([key, name, place]) => ({ key, name, place })),
});

describe("season points", () => {
  it("gives the row a placement falls in", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 13, 97, 300].map((p) => pointsFor(p, DEFAULT_POINTS))).toEqual([100, 80, 65, 55, 45, 45, 35, 35, 25, 25, 18, 1, 1]);
    expect(pointsFor(1, [[2, 10]])).toBe(0);
  });

  it("reads a typed table and writes it back", () => {
    expect(readPointsTable("1: 100, 2: 80\n5th = 40")).toEqual([[1, 100], [2, 80], [5, 40]]);
    expect(readPointsTable("2: 80\n1: 100")).toEqual([[1, 100], [2, 80]]);
    expect(readPointsTable("first: 100")).toBeNull();
    expect(readPointsTable("1: 100, 1: 90")).toBeNull();
    expect(readPointsTable("")).toBeNull();
    expect(writePointsTable([[1, 100], [2, 80]])).toBe("1: 100\n2: 80");
  });

  it("adds up a season: weights, best N, merges, minimum, ties", () => {
    const events = [
      ev("a", "2026-09-01", [["u:1", "Blair", 1], ["s:9", "Ash", 2], ["g:cam", "Cam", 3]]),
      ev("b", "2026-09-08", [["s:9", "Ash", 1], ["g:blair_sa", "blair_sa", 2], ["g:cam", "Cam", 3]]),
      ev("c", "2026-09-15", [["u:1", "Blair", 2], ["s:9", "Ash", 1]], 1.5),
    ];
    const rows = computeStandings({
      events,
      overrides: [{ key: "g:blair_sa", displayName: null, mergedInto: "u:1", leftOut: false }, { key: "u:1", displayName: "Blair (SA)", mergedInto: null, leftOut: false }],
      points: DEFAULT_POINTS,
      bestOf: 2,
      minEvents: 2,
    });
    // Ash: 80, 100, 150 → best 2 = 250. Blair: 100, 80 (as blair_sa), 120 → best 2 = 220. Cam: 65 + 65 = 130.
    expect(rows.map((r) => [r.name, r.rank, r.points, r.events])).toEqual([["Ash", 1, 250, 3], ["Blair (SA)", 2, 220, 3], ["Cam", 3, 130, 2]]);
    expect(rows[0].results.filter((r) => !r.counted).map((r) => r.eventId)).toEqual(["a"]);

    // A linked start.gg player counts as their member; left-out players vanish; one event is below the minimum.
    const linked = computeStandings({
      events: [ev("a", "2026-09-01", [["u:1", "Blair", 1], ["s:9", "Ash", 2]]), ev("b", "2026-09-08", [["s:7", "Blair", 1], ["s:9", "Ash", 2]])],
      overrides: [{ key: "s:9", displayName: null, mergedInto: null, leftOut: true }],
      points: DEFAULT_POINTS,
      bestOf: null,
      minEvents: 3,
      autoMerge: new Map([["s:7", "u:1"]]),
    });
    expect(linked.map((r) => [r.key, r.rank, r.points])).toEqual([["u:1", null, 200]]);
  });

  it("shares ranks on ties and keeps a player's best placement when merged entries met", () => {
    const rows = computeStandings({
      events: [ev("a", "2026-09-01", [["g:x", "X", 1], ["g:x2", "X alt", 3], ["g:y", "Y", 2], ["g:z", "Z", 2]])],
      overrides: [{ key: "g:x2", displayName: null, mergedInto: "g:x", leftOut: false }],
      points: DEFAULT_POINTS,
      bestOf: null,
      minEvents: 1,
    });
    expect(rows.map((r) => [r.name, r.rank, r.points])).toEqual([["X", 1, 100], ["Y", 2, 80], ["Z", 2, 80]]);

    // Merged into someone who last played earlier: they keep their own name.
    const kept = computeStandings({
      events: [ev("new", "2026-09-19", [["g:falco", "Falco", 2]]), ev("old", "2026-09-18", [["g:cast", "Castbros", 2]])],
      overrides: [{ key: "g:falco", displayName: null, mergedInto: "g:cast", leftOut: false }],
      points: DEFAULT_POINTS,
      bestOf: null,
      minEvents: 1,
    });
    expect(kept.map((r) => [r.name, r.points])).toEqual([["Castbros", 160]]);
    expect(kept[0].keys.sort()).toEqual(["g:cast", "g:falco"]);
  });

  it("shows how players moved since the latest event", () => {
    const opts = {
      events: [ev("a", "2026-09-01", [["g:x", "X", 1], ["g:y", "Y", 2], ["g:z", "Z", 3]]), ev("b", "2026-09-08", [["g:z", "Z", 1], ["g:w", "W", 2], ["g:x", "X", 9]])],
      overrides: [], points: DEFAULT_POINTS, bestOf: null, minEvents: 1,
    };
    const now = computeStandings(opts); // Z 165, X 125, W 80, Y 80
    const moved = movementSinceLatest(opts, now);
    expect(moved.get("g:z")).toEqual({ kind: "up", by: 2 });
    expect(moved.get("g:x")).toEqual({ kind: "down", by: 1 });
    expect(moved.get("g:w")).toEqual({ kind: "new" });
    expect(moved.get("g:y")).toEqual({ kind: "down", by: 1 }); // was 2nd, now tied 3rd
    // One event day: nothing to compare with.
    expect(movementSinceLatest({ ...opts, events: [opts.events[0]] }, computeStandings({ ...opts, events: [opts.events[0]] })).size).toBe(0);
  });

  it("puts the movement in the pasted text", () => {
    const rows = computeStandings({ events: [ev("a", "2026-09-01", [["g:a", "A", 1], ["g:b", "B", 2]])], overrides: [], points: DEFAULT_POINTS, bestOf: null, minEvents: 1 })
      .map((r, i) => ({ ...r, movement: i === 0 ? ({ kind: "up", by: 2 } as const) : ({ kind: "new" } as const) }));
    expect(standingsText("S", rows, "u", "A player", (n) => `${n} pts`, 10, "nuevo")).toBe("🏆 S\n🥇 A · 100 pts (▲2)\n🥈 B · 80 pts (nuevo)\nu");
    expect([movementMark({ kind: "down", by: 1 }), movementMark({ kind: "same" }), movementMark(null)]).toEqual(["▼1", "", ""]);
  });

  it("writes the standings as text to paste, teens unnamed and only ranked players", () => {
    const rows = computeStandings({ events: [ev("a", "2026-09-01", [["u:1", "Ash", 1], ["u:2", "Teen", 2], ["g:c", "Cam", 3]])], overrides: [], points: DEFAULT_POINTS, bestOf: null, minEvents: 1 })
      .map((r) => ({ ...r, hidden: r.key === "u:2" }));
    expect(standingsText("SA Fall", rows, "https://x.test/s", "A player", (n) => `${n} pts`)).toBe("🏆 SA Fall\n🥇 Ash · 100 pts\n🥈 A player · 80 pts\n🥉 Cam · 65 pts\nhttps://x.test/s");
  });

  it("writes a CSV that hides teens from guests and can't run formulas", () => {
    const rows = computeStandings({ events: [ev("a", "2026-09-01", [["u:1", "=cmd", 1], ["u:2", "Teen, Kid", 2]])], overrides: [], points: DEFAULT_POINTS, bestOf: null, minEvents: 1 });
    const csv = standingsCsv(rows, (r) => r.key === "u:2", "A player");
    expect(csv).toBe("rank,player,points,events,best\r\n1,'=cmd,100,1,1\r\n2,A player,80,1,2\r\n");
  });

  it("adds a column per event (oldest first) with each player's place", () => {
    const events = [ev("b", "2026-09-08", [["g:c", "Cam", 1], ["u:1", "Ash", 3]]), ev("a", "2026-09-01", [["u:1", "Ash", 1], ["g:c", "Cam", 2]]), ev("c", "2026-09-15", [["u:1", "Ash", 2]])];
    const rows = computeStandings({ events, overrides: [], points: DEFAULT_POINTS, bestOf: null, minEvents: 1 });
    const csv = standingsCsv(rows, () => false, "A player", events);
    const [head, ...lines] = csv.trim().split("\r\n");
    expect(head).toBe("rank,player,points,events,best,2026-09-01 Weekly a,2026-09-08 Weekly b,2026-09-15 Weekly c");
    expect(lines.find((l) => l.includes("Ash"))).toMatch(/,1,3,2$/);
    expect(lines.find((l) => l.includes("Cam"))).toMatch(/,2,1,$/);
  });
});

describe("findStandingRow", () => {
  const rows = [
    { name: "Walky", rank: 1 },
    { name: "Walkman", rank: 2 },
    { name: "Ada", rank: 3 },
    { name: "SecretTeen", rank: 4, hidden: true },
  ];
  it("prefers an exact name, ignoring case", () => {
    expect(findStandingRow(rows, "walky")?.rank).toBe(1);
  });
  it("takes a partial name only when one player matches", () => {
    expect(findStandingRow(rows, "da")?.name).toBe("Ada");
    expect(findStandingRow(rows, "walk")).toBeNull();
  });
  it("never matches a hidden player", () => {
    expect(findStandingRow(rows, "SecretTeen")).toBeNull();
    expect(findStandingRow(rows, "teen")).toBeNull();
  });
  it("matches nothing for an empty query", () => {
    expect(findStandingRow(rows, "  ")).toBeNull();
  });
});

describe("standingRowId", () => {
  it("makes a safe page address from a player key", () => {
    expect(standingRowId("g:walky")).toBe("p-g-walky");
    expect(standingRowId("s:12345")).toBe("p-s-12345");
    expect(standingRowId("g:<b>x y</b>")).toBe("p-g--b-x-y--b-");
  });
});
