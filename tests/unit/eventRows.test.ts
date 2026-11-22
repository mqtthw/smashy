// The Events list's rows are built on the server with only what the list shows (round 666).
import { describe, expect, it } from "vitest";
import { eventRows } from "@/lib/eventRows";
import type { SmashyTournament } from "@/lib/startgg";
import type { ExpectedWeekly } from "@/lib/weeklies";

const tournament = (over: Partial<SmashyTournament> = {}): SmashyTournament => ({
  id: "1", slug: "alamo-12", name: "The Alamo #12", city: "San Antonio", venueName: "Game Spot", venueAddress: "1 Main St",
  startAt: 1_000_000, endAt: 1_010_000, timezone: "America/Chicago", numAttendees: 40, isRegistrationOpen: true,
  imageUrl: "https://images.start.gg/a.png", bannerUrl: "https://images.start.gg/b.png", startggUrl: "https://start.gg/x", registerUrl: "https://start.gg/x/register",
  events: [
    { id: "e1", name: "Melee Singles", game: "melee", startAt: 1_000_000, numEntrants: 30 },
    { id: "e2", name: "Melee Doubles", game: "melee", startAt: 1_003_600, numEntrants: 12 },
  ],
  streams: [{ source: "TWITCH", name: "alamo" }],
  ...over,
});
const weekly: ExpectedWeekly = {
  id: "contract--sa", name: "The Contract #225", seriesName: "The Contract", city: "San Antonio", venueName: null, venueAddress: "2 Main St",
  startAt: 900_000, timezone: "America/Chicago", intervalDays: 7, games: [{ game: "ultimate", typicalEntrants: 50 }],
  events: [{ name: "Ultimate Singles", game: "ultimate", startAt: null }], imageUrl: null,
  lastEdition: { name: "The Contract #224", slug: "contract-224", startAt: 300_000, entrants: 48 }, editionsSeen: 6,
};

describe("Events list rows", () => {
  it("keeps only what the list shows, biggest bracket per game", () => {
    const [row] = eventRows([tournament()], [], 500_000);
    expect(row).toEqual({
      key: "1", href: "/events/alamo-12", name: "The Alamo #12", city: "San Antonio", venueName: "Game Spot", startAt: 1_000_000,
      timezone: "America/Chicago", games: [{ game: "melee", entrants: 30 }],
      events: [
        { name: "Melee Singles", game: "melee", startAt: 1_000_000, entrants: 30 },
        { name: "Melee Doubles", game: "melee", startAt: 1_003_600, entrants: 12 },
      ],
      expected: false, live: false,
    });
  });

  it("puts expected weeklies in date order and marks running tournaments live", () => {
    const rows = eventRows([tournament()], [weekly], 1_005_000);
    expect(rows.map((r) => r.href)).toEqual(["/events/weekly/contract--sa", "/events/alamo-12"]);
    expect(rows[0]).toMatchObject({ expected: true, live: false, games: [{ game: "ultimate", entrants: null }] });
    expect(rows[1].live).toBe(true);
  });
});
