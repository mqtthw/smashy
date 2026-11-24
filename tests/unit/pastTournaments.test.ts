import { describe, expect, it } from "vitest";
import { biggestBracket, canSearch, pastRows, readPastQuery } from "@/lib/pastTournaments";
import type { SmashyEvent, SmashyTournament } from "@/lib/startgg";

const ev = (game: SmashyEvent["game"], n: number | null): SmashyEvent => ({ id: `${game}${n}`, name: `${game} singles`, game, startAt: null, numEntrants: n });
const tour = (id: string, startAt: number, events: SmashyEvent[]): SmashyTournament => ({
  id, slug: id, name: id, city: null, venueName: null, venueAddress: null, startAt, endAt: null, timezone: null, numAttendees: null,
  isRegistrationOpen: false, imageUrl: null, bannerUrl: null, startggUrl: "", registerUrl: "", events, streams: [],
});

describe("readPastQuery", () => {
  it("keeps known values and drops the rest", () => {
    expect(readPastQuery({ region: "FR", q: "  Smash   Sans Fil ", game: "pplus", year: "2019", min: "100", sort: "biggest" }, 2026)).toEqual({
      region: "FR", name: "Smash Sans Fil", game: "pplus", year: 2019, min: 100, sort: "biggest",
    });
    expect(readPastQuery({ region: "XX", q: "a", game: "tekken", year: "1999", min: "73", sort: "x" }, 2026)).toEqual({
      region: null, name: null, game: null, year: null, min: 0, sort: "newest",
    });
    expect(readPastQuery({ year: "2027" }, 2026).year).toBeNull();
  });
  it("needs a region or a name", () => {
    expect(canSearch(readPastQuery({}, 2026))).toBe(false);
    expect(canSearch(readPastQuery({ q: "genesis" }, 2026))).toBe(true);
    expect(canSearch(readPastQuery({ region: "US-CA" }, 2026))).toBe(true);
  });
});

describe("pastRows", () => {
  const list = [
    tour("small", 300, [ev("melee", 20)]),
    tour("big-pm", 100, [ev("pplus", 150), ev("melee", 40)]),
    tour("mid", 200, [ev("melee", 90), ev("ultimate", 120)]),
    tour("cancelled", 400, [ev("melee", 0)]),
  ];
  it("measures the biggest bracket in the game asked for", () => {
    expect(biggestBracket(list[2], "melee")).toBe(90);
    expect(biggestBracket(list[2], null)).toBe(120);
    expect(biggestBracket(list[1], "smash64")).toBe(0);
  });
  it("filters by size and sorts newest or biggest first, leaving out brackets with nobody", () => {
    expect(pastRows(list, { game: null, min: 0, sort: "newest" }).map((t) => t.id)).toEqual(["small", "mid", "big-pm"]);
    expect(pastRows(list, { game: "pplus", min: 100, sort: "newest" }).map((t) => t.id)).toEqual(["big-pm"]);
    expect(pastRows(list, { game: "melee", min: 32, sort: "biggest" }).map((t) => t.id)).toEqual(["mid", "big-pm"]);
  });
});
