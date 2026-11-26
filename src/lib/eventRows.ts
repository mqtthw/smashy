// Rows for the Events list (src/components/EventsBrowser.tsx), built on the server (round 666): the list
// used to receive every tournament with all its fields (venue address, streams, banners, start.gg and
// sign-up links…) and pick a few in the browser, so the Events tab's answer was about 115 KB.
import type { EventTime } from "@/components/events/EventTimes";
import { isRunning } from "./format";
import type { GameKey } from "./games";
import type { SmashyTournament } from "./startgg";
import type { ExpectedWeekly } from "./weeklies";

// One row in the list: a posted start.gg tournament, or a weekly we expect but isn't posted yet.
export type EventRow = {
  key: string;
  href: string;
  name: string;
  city: string | null;
  venueName: string | null;
  startAt: number;
  timezone: string | null;
  games: { game: GameKey; entrants: number | null }[];
  events: EventTime[]; // each bracket and when it starts
  expected: boolean;
  live: boolean; // started and not over yet
  /** The venue on the map, for "Near me" (round 855); null when not known. */
  lat?: number | null;
  lng?: number | null;
};

// One badge per game. A tournament can run several brackets per game (singles, doubles,
// redemption); the biggest one is usually the main event, so show its entrant count.
function tournamentRow(t: SmashyTournament, now: number): EventRow {
  const byGame = new Map<GameKey, number>();
  for (const e of t.events) byGame.set(e.game, Math.max(byGame.get(e.game) ?? 0, e.numEntrants ?? 0));
  return {
    key: t.id,
    href: `/events/${t.slug}`,
    name: t.name,
    city: t.city,
    venueName: t.venueName,
    startAt: t.startAt,
    timezone: t.timezone,
    games: [...byGame.entries()].map(([game, entrants]) => ({ game, entrants })),
    events: t.events.map((e) => ({ name: e.name, game: e.game, startAt: e.startAt, entrants: e.numEntrants })),
    expected: false,
    live: isRunning(t, now),
    lat: t.lat ?? null,
    lng: t.lng ?? null,
  };
}

function expectedRow(e: ExpectedWeekly): EventRow {
  return {
    key: `expected-${e.id}`,
    href: `/events/weekly/${e.id}`,
    name: e.name,
    city: e.city,
    venueName: e.venueName,
    startAt: e.startAt,
    timezone: e.timezone,
    games: e.games.map((g) => ({ game: g.game, entrants: null })),
    events: e.events ?? [],
    expected: true,
    live: false,
  };
}

/** The list's rows, soonest first: posted tournaments and the weeklies expected but not posted yet. */
export function eventRows(tournaments: SmashyTournament[], expected: ExpectedWeekly[], now: number): EventRow[] {
  return [...tournaments.map((t) => tournamentRow(t, now)), ...expected.map(expectedRow)].sort((a, b) => a.startAt - b.startAt);
}
