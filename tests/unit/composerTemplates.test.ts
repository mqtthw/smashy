import { describe, expect, it } from "vitest";
import { composerTemplates, withFresh } from "@/lib/composerTemplates";
import type { HistoryEntry } from "@/lib/startgg";

const NOW = 1_800_000_000;
const entry = (eventId: string, startAt: number, placement: number | null, tournamentName = `T${eventId}`): HistoryEntry => ({
  eventId, eventName: "Melee Singles", game: "melee", tournamentName, tournamentSlug: tournamentName.toLowerCase(),
  city: null, startAt, timezone: null, placement, numEntrants: 20, isOnline: false,
});

describe("composerTemplates", () => {
  it("offers tonight's placement before the hours-old history has it", () => {
    const fresh = [entry("225", NOW - 5 * 3600, 5, "The Contract #225")];
    const history = [entry("225", NOW - 5 * 3600, null), entry("200", NOW - 90 * 86400, 49)];
    const { results, signups } = composerTemplates(fresh, history, NOW);
    expect(results.map((e) => [e.eventId, e.placement])).toEqual([["225", 5], ["200", 49]]);
    expect(signups).toEqual([]);
  });
  it("lists a new sign-up the history doesn't have yet, soonest first", () => {
    const fresh = [entry("b", NOW + 7 * 86400, null), entry("a", NOW + 3600, null)];
    const { signups } = composerTemplates(fresh, [entry("old", NOW - 3 * 86400, null)], NOW);
    expect(signups.map((e) => e.eventId)).toEqual(["a", "b"]);
  });
});

describe("withFresh", () => {
  it("swaps in a placement that just came in and adds tonight's event on top", () => {
    const history = [entry("200", NOW - 90 * 86400, 49), entry("150", NOW - 300 * 86400, 17)];
    const fresh = [entry("225", NOW - 5 * 3600, 5), entry("200", NOW - 90 * 86400, 49)];
    expect(withFresh(history, fresh).map((e) => e.eventId)).toEqual(["225", "200", "150"]);
  });
  it("doesn't add events older than the page (they belong on later pages)", () => {
    const history = [entry("200", NOW - 90 * 86400, 49)];
    expect(withFresh(history, [entry("old", NOW - 400 * 86400, 3)]).map((e) => e.eventId)).toEqual(["200"]);
  });
});

describe("composerTemplates: leagues that run for weeks", () => {
  const base = { eventName: "Melee Division 3", game: "melee" as const, tournamentName: "Texas Arcadian League: Season 2", tournamentSlug: "texas-arcadian-league-season-2", city: null, timezone: null, placement: null, numEntrants: 18, isOnline: true };
  const DAY = 86400;
  const now = 1_800_000_000;
  it("keeps an unfinished event that start.gg says is running, weeks after it started", () => {
    const league = { ...base, eventId: "1", startAt: now - 20 * DAY, running: true };
    expect(composerTemplates([league], [], now).signups.map((e) => e.eventId)).toEqual(["1"]);
  });
  it("still drops an old unfinished event that isn't running, and a running one after ten weeks", () => {
    const stale = { ...base, eventId: "2", startAt: now - 3 * DAY };
    const ancient = { ...base, eventId: "3", startAt: now - 80 * DAY, running: true };
    expect(composerTemplates([stale, ancient], [], now).signups).toEqual([]);
  });
});
