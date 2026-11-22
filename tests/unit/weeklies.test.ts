import { describe, expect, it } from "vitest";
import type { SmashyTournament } from "@/lib/startgg";
import { predictWeeklies, seriesIdFor, seriesKey } from "@/lib/weeklies";

const DAY = 86400;

/** A fake past tournament at a Chicago local time (CDT = UTC-5 before Nov 1 2026, CST = UTC-6 after). */
function tournament(name: string, city: string, unix: number, entrants = 11): SmashyTournament {
  return {
    id: name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    city,
    venueName: null,
    venueAddress: "7022 Bandera Rd",
    startAt: unix,
    endAt: null,
    timezone: "America/Chicago",
    numAttendees: entrants,
    isRegistrationOpen: false,
    imageUrl: null,
    bannerUrl: null,
    startggUrl: "",
    registerUrl: "",
    events: [{ id: name + "-e", name: "Melee Singles", game: "melee", startAt: unix, numEntrants: entrants }],
    streams: [],
  };
}

// Mondays at 7:00 PM CDT (00:00 UTC Tuesday): Oct 12, 19, 26, then Nov 2 at 7:00 PM CST (01:00 UTC).
const oct12 = Date.UTC(2026, 9, 13, 0, 0) / 1000;
const contract = [
  tournament("The Contract #221", "San Antonio", oct12),
  tournament("The Contract #222", "San Antonio", oct12 + 7 * DAY),
  tournament("The Contract #223", "San Antonio", oct12 + 14 * DAY),
  tournament("The Contract #224", "San Antonio", Date.UTC(2026, 10, 3, 1, 0) / 1000),
];

describe("seriesKey / seriesIdFor", () => {
  it.each([
    ["The Contract #224", "the contract"],
    ["Moonwalk Tournament Series: 131 (COSTUME CONTEST!!!)", "moonwalk tournament series"],
    ["Monday Night Melee 520 - Swiss Party!!!", "monday night melee"],
    ["Springtown Slam Melee 10.29.26", "springtown slam melee"],
  ])("%s -> %s", (name, key) => {
    expect(seriesKey(name)).toBe(key);
  });
  it("builds stable ids", () => {
    expect(seriesIdFor("The Contract #224", "San Antonio")).toBe("the-contract--san-antonio");
  });
});

describe("predictWeeklies", () => {
  const now = Date.UTC(2026, 10, 6, 18, 0) / 1000; // Fri Nov 6, 2026

  it("predicts the next edition with the next number, same local time across daylight saving", () => {
    const [p] = predictWeeklies(contract, [], now);
    expect(p.name).toBe("The Contract #225");
    expect(p.intervalDays).toBe(7);
    // Mon Nov 9, 7:00 PM CST = Tue Nov 10 01:00 UTC
    expect(p.startAt).toBe(Date.UTC(2026, 10, 10, 1, 0) / 1000);
    expect(p.games).toEqual([{ game: "melee", typicalEntrants: 11 }]);
  });

  it("skips series whose next edition is already on start.gg", () => {
    const posted = tournament("The Contract #225", "San Antonio", Date.UTC(2026, 10, 10, 1, 0) / 1000);
    expect(predictWeeklies(contract, [posted], now)).toEqual([]);
  });

  it("needs at least 3 editions", () => {
    expect(predictWeeklies(contract.slice(-2), [], now)).toEqual([]);
  });

  it("stops predicting series that have gone quiet", () => {
    const muchLater = now + 30 * DAY;
    expect(predictWeeklies(contract, [], muchLater)).toEqual([]);
  });
});
