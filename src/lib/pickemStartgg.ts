// Pick'em for majors: what it needs from start.gg (an event, its top seeds, its final standings,
// and a major's singles events). Kept in the shared cache, so a busy pick'em page costs start.gg a
// handful of requests, not one per visitor. Server-only.
import "server-only";
import { cacheLife } from "next/cache";
import { gameOfEvent, type GameKey } from "./games";
import { PICKABLE_SEEDS, type Seed } from "./pickem";
import { startggQuery } from "./startgg";

export type PickemEvent = {
  id: string;
  name: string;
  state: string | null; // CREATED, ACTIVE, COMPLETED
  startAt: number | null; // unix seconds: picks lock then
  tournament: string;
  tournamentSlug: string | null;
  game: GameKey | null;
  entrants: number;
  singles: boolean;
  seeds: Seed[]; // the top seeds, seed 1 first (empty until start.gg has seeded the event)
};

type RawEvent = {
  id: number;
  name: string;
  state: string | null;
  startAt: number | null;
  numEntrants: number | null;
  teamRosterSize: { maxPlayers: number | null } | null;
  videogame: { id: number | string } | null;
  tournament: { name: string; slug: string | null } | null;
  phases: { phaseOrder: number | null; seeds: { nodes: { seedNum: number | null; entrant: { participants: { player: { id: number; gamerTag: string; prefix: string | null } | null }[] | null } | null }[] | null } | null }[] | null;
};

/** One start.gg event for pick'em, with its top 32 seeds. Null if there's no such event. */
export async function getPickemEvent(eventId: string): Promise<PickemEvent | null> {
  "use cache: remote";
  if (!/^\d{1,12}$/.test(eventId)) {
    cacheLife("hours");
    return null;
  }
  const { event } = await startggQuery<{ event: RawEvent | null }>(
    `query PickemEvent($id: ID!) { event(id: $id) {
      id name state startAt numEntrants teamRosterSize { maxPlayers } videogame { id } tournament { name slug }
      phases { phaseOrder seeds(query: { page: 1, perPage: ${PICKABLE_SEEDS}, sortBy: "seedNum" }) {
        nodes { seedNum entrant { participants { player { id gamerTag prefix } } } }
      } }
    } }`,
    { id: eventId },
  );
  if (!event) {
    cacheLife("hours");
    return null;
  }
  // Seeds change until the event starts; after that, only the state matters.
  if (event.state === "COMPLETED") cacheLife("days");
  else cacheLife({ stale: 120, revalidate: 600, expire: 3600 });
  // The first phase that has seeds (pools), by its order.
  const phase = [...(event.phases ?? [])].sort((a, b) => (a.phaseOrder ?? 99) - (b.phaseOrder ?? 99)).find((p) => p.seeds?.nodes?.length);
  const seeds: Seed[] = [];
  for (const n of phase?.seeds?.nodes ?? []) {
    const people = n.entrant?.participants ?? [];
    const player = people.length === 1 ? people[0]?.player : null; // singles only
    if (!player || !n.seedNum) continue;
    seeds.push({ playerId: String(player.id), tag: player.gamerTag, prefix: player.prefix || null, seed: n.seedNum });
  }
  seeds.sort((a, b) => a.seed - b.seed);
  return {
    id: String(event.id),
    name: event.name,
    state: event.state,
    startAt: event.startAt,
    tournament: event.tournament?.name ?? "",
    tournamentSlug: event.tournament?.slug?.replace(/^tournament\//, "") ?? null,
    game: gameOfEvent(event),
    entrants: event.numEntrants ?? 0,
    singles: !event.teamRosterSize || (event.teamRosterSize.maxPlayers ?? 1) <= 1,
    seeds,
  };
}

/**
 * A finished event's top 8 (player id -> placement), from start.gg's final standings. Null until
 * the event is completed.
 */
export async function getPickemStandings(eventId: string): Promise<Map<string, number> | null> {
  "use cache: remote";
  if (!/^\d{1,12}$/.test(eventId)) {
    cacheLife("hours");
    return null;
  }
  const { event } = await startggQuery<{ event: { state: string | null; standings: { nodes: { placement: number; entrant: { participants: { player: { id: number } | null }[] | null } | null }[] | null } | null } | null }>(
    `query PickemStandings($id: ID!) { event(id: $id) { state standings(query: { page: 1, perPage: 12 }) { nodes { placement entrant { participants { player { id } } } } } } }`,
    { id: eventId },
  );
  if (event?.state !== "COMPLETED") {
    cacheLife({ stale: 120, revalidate: 600, expire: 3600 });
    return null;
  }
  cacheLife("days");
  const out = new Map<string, number>();
  for (const n of event.standings?.nodes ?? []) {
    const people = n.entrant?.participants ?? [];
    if (people.length === 1 && people[0]?.player) out.set(String(people[0].player.id), n.placement);
  }
  return out;
}

export type PickemChoice = { id: string; name: string; startAt: number | null; state: string | null; game: GameKey; entrants: number };

/** A major's singles events in the games Smashy covers, earliest first. */
export async function getMajorSinglesEvents(slug: string): Promise<PickemChoice[]> {
  "use cache: remote";
  cacheLife({ stale: 300, revalidate: 1800, expire: 7200 });
  const { tournament } = await startggQuery<{ tournament: { events: { id: number; name: string; startAt: number | null; state: string | null; numEntrants: number | null; videogame: { id: number | string } | null; teamRosterSize: { maxPlayers: number | null } | null }[] | null } | null }>(
    `query PickemEvents($slug: String!) { tournament(slug: $slug) { events { id name startAt state numEntrants videogame { id } teamRosterSize { maxPlayers } } } }`,
    { slug },
  );
  return (tournament?.events ?? [])
    .flatMap((e) => {
      const game = gameOfEvent(e);
      const singles = !e.teamRosterSize || (e.teamRosterSize.maxPlayers ?? 1) <= 1;
      // Big enough to be worth picking (a side event with a dozen players isn't).
      return game && singles && (e.numEntrants ?? 0) >= 16 ? [{ id: String(e.id), name: e.name, startAt: e.startAt, state: e.state, game, entrants: e.numEntrants ?? 0 }] : [];
    })
    .sort((a, b) => (a.startAt ?? 0) - (b.startAt ?? 0));
}
