// Looking up start.gg players who may not be on Smashy: their public tag, and finding them by tag.
// Only what start.gg shows publicly on brackets is read: the tag, the sponsor prefix and the profile
// code. Never a real name, photo, location or birthday.
// Cached for hours and shared by every server ("use cache: remote"), so start.gg is asked once.
// Whoever start.gg returns is also added to Smashy's saved list of players (rememberPlayers), which
// is what lets the next tag search find them without start.gg.
import "server-only";
import { cacheLife } from "next/cache";
import { rememberPlayers } from "./playerIndex";
import { rankPlayerHits, type PlayerHit, type PlayerMatch } from "./playerSearch";
import { regionFromGeo, startggRegionFilter } from "./regions";
import { SUPPORTED_GAME_IDS, startggQuery } from "./startgg";
import { gameOfEvent, type GameKey } from "./games";
import type { PlayerResult } from "./playerResults";

const HOURS = { stale: 300, revalidate: 3600, expire: 86400 };
const MINUTES = { stale: 60, revalidate: 300, expire: 3600 };

export type StartggPlayer = { playerId: string; tag: string; prefix: string | null; profileUrl: string | null };
type RawPlayer = { id: string | number; gamerTag: string | null; prefix: string | null; user?: { slug: string | null } | null };

function toPlayer(raw: RawPlayer | null | undefined): StartggPlayer | null {
  if (!raw?.gamerTag) return null;
  const slug = raw.user?.slug && /^user\/[0-9a-z]+$/i.test(raw.user.slug) ? raw.user.slug : null;
  return { playerId: String(raw.id), tag: raw.gamerTag, prefix: raw.prefix || null, profileUrl: slug ? `https://www.start.gg/${slug}` : null };
}

/** One start.gg player's tag and sponsor, or null if there's no such player. */
export async function getStartggPlayer(playerId: string): Promise<StartggPlayer | null> {
  "use cache: remote";
  if (!/^\d{1,12}$/.test(playerId)) {
    cacheLife(HOURS);
    return null;
  }
  const { player } = await startggQuery<{ player: RawPlayer | null }>(`query Player($id: ID!) { player(id: $id) { id gamerTag prefix user { slug } } }`, { id: playerId });
  cacheLife(player ? HOURS : MINUTES);
  const found = toPlayer(player);
  if (found) await rememberPlayers([found]);
  return found;
}

/** The player behind a start.gg profile link ("user/3f297e74"). */
export async function getStartggPlayerBySlug(slug: string): Promise<StartggPlayer | null> {
  "use cache: remote";
  if (!/^user\/[0-9a-f]{6,12}$/.test(slug)) {
    cacheLife(HOURS);
    return null;
  }
  const { user } = await startggQuery<{ user: { slug: string | null; player: RawPlayer | null } | null }>(`query Profile($slug: String!) { user(slug: $slug) { slug player { id gamerTag prefix } } }`, { slug });
  cacheLife(user?.player ? HOURS : MINUTES);
  const found = user?.player ? toPlayer({ ...user.player, user: { slug: user.slug } }) : null;
  if (found) await rememberPlayers([found]);
  return found;
}

// Where a tag is looked for. Featured tournaments are where known players show up; the viewer's
// region is where the people they actually play show up.
const PER_PAGE = 50; // tournaments per request (about 1.5 seconds each; they run side by side)
const FEATURED_DAYS = 540;
const REGION_DAYS = 120;
const FIND = (filter: string, extra = "") => `query FindPlayers($q: String!, $page: Int!, $games: [ID]!, $after: Timestamp!, $before: Timestamp!${extra}) {
  tournaments(query: { page: $page, perPage: ${PER_PAGE}, sortBy: "startAt desc", filter: { past: true, videogameIds: $games, afterDate: $after, beforeDate: $before, ${filter} } }) {
    nodes { name participants(query: { perPage: 4, filter: { search: { fieldsToSearch: ["gamerTag"], searchString: $q } } }) { nodes { gamerTag prefix player { id } } } }
  }
}`;
const FIND_FEATURED = FIND("isFeatured: true");
const FIND_REGION = FIND("countryCode: $countryCode, addrState: $addrState", ", $countryCode: String, $addrState: String");
type FindReply = { tournaments: { nodes: { name: string; participants: { nodes: { gamerTag: string | null; prefix: string | null; player: { id: string | number } | null }[] | null } | null }[] | null } | null };

async function findIn(query: string, variables: Record<string, unknown>): Promise<PlayerMatch[]> {
  const data = await startggQuery<FindReply>(query, variables);
  return (data.tournaments?.nodes ?? []).flatMap((t) =>
    (t.participants?.nodes ?? []).flatMap((p) => (p.player && p.gamerTag ? [{ playerId: String(p.player.id), tag: p.gamerTag, prefix: p.prefix || null, tournament: t.name }] : [])),
  );
}

export type PlayerSearch = { hits: PlayerHit[]; partial: boolean };

/**
 * start.gg players whose tag contains `q` (pass it trimmed and lower-cased, so searches share a
 * cached answer). start.gg can't search players, only one tournament's sign-up list, so this asks
 * about the 100 most recent featured tournaments and the 50 most recent ones in `region`, in three
 * requests. Someone who entered none of those isn't found: their start.gg profile link still works
 * (getStartggPlayerBySlug). `partial` = part of the search failed and the list may be missing people.
 */
export async function searchStartggPlayers(q: string, region: string): Promise<PlayerSearch> {
  "use cache: remote";
  const now = Math.floor(Date.now() / 1000);
  const base = { q, games: SUPPORTED_GAME_IDS, before: now };
  const runs = await Promise.allSettled([
    findIn(FIND_FEATURED, { ...base, page: 1, after: now - FEATURED_DAYS * 86400 }),
    findIn(FIND_FEATURED, { ...base, page: 2, after: now - FEATURED_DAYS * 86400 }),
    findIn(FIND_REGION, { ...base, page: 1, after: now - REGION_DAYS * 86400, ...startggRegionFilter(region) }),
  ]);
  const found = runs.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  if (!found.length) throw (runs[0] as PromiseRejectedResult).reason; // start.gg is down: nothing to keep
  const partial = found.length < runs.length;
  cacheLife(partial ? MINUTES : HOURS);
  const matches = found.flat();
  await rememberPlayers(matches); // everyone who matched, not only the ones shown
  return { hits: rankPlayerHits(q, matches), partial };
}

type RawStanding = {
  placement: number | null;
  entrant: { event: { id: number; name: string; numEntrants: number | null; startAt: number | null; videogame: { id: number | string } | null; teamRosterSize: { maxPlayers: number | null } | null; tournament: { name: string; slug: string | null } | null } | null } | null;
};

/**
 * A player's latest placements on start.gg (newest first), in the games Smashy covers: one
 * request, kept in the shared cache for an hour.
 */
export async function getPlayerResults(playerId: string): Promise<PlayerResult[]> {
  "use cache: remote";
  cacheLife(HOURS);
  if (!/^\d{1,12}$/.test(playerId)) return [];
  const { player } = await startggQuery<{ player: { recentStandings: RawStanding[] | null } | null }>(
    `query PlayerResults($id: ID!) { player(id: $id) { recentStandings(limit: 20) { placement entrant { event {
      id name numEntrants startAt videogame { id } teamRosterSize { maxPlayers } tournament { name slug }
    } } } } }`,
    { id: playerId },
  );
  return (player?.recentStandings ?? []).flatMap((s) => {
    const e = s.entrant?.event;
    const game = gameOfEvent(e);
    if (!e || !game || !s.placement) return [];
    return [
      {
        eventId: String(e.id),
        eventName: e.name,
        tournament: e.tournament?.name ?? "",
        tournamentSlug: e.tournament?.slug?.replace(/^tournament\//, "") ?? null,
        entrants: e.numEntrants ?? 0,
        startAt: e.startAt,
        game,
        placement: s.placement,
        doubles: (e.teamRosterSize?.maxPlayers ?? 1) > 1,
      },
    ];
  });
}

/** One upcoming tournament on a player's start.gg account, with the brackets in Smashy's games. */
export type UpcomingTournament = {
  slug: string;
  name: string;
  startAt: number;
  timezone: string | null;
  city: string | null;
  region: string | null;
  online: boolean;
  events: { name: string; game: GameKey }[];
};

/**
 * The tournaments a player's start.gg account is on, still to come, soonest first (round 797: following a
 * player). start.gg lists the ones the account signed up for and also ones it helps run, and can't tell the
 * two apart, so the page says so. Only tournaments with a bracket in Smashy's games. A player whose start.gg
 * player has no account (added by an organizer) has none. One request, kept in the shared cache for hours.
 */
export async function getPlayerUpcoming(playerId: string): Promise<UpcomingTournament[]> {
  "use cache: remote";
  cacheLife("hours");
  if (!/^\d{1,12}$/.test(playerId)) return [];
  type Raw = {
    slug: string; name: string; startAt: number; timezone: string | null; city: string | null; addrState: string | null; countryCode: string | null; isOnline: boolean | null;
    events: { name: string; videogame: { id: number | string } | null }[] | null;
  };
  const { player } = await startggQuery<{ player: { user: { tournaments: { nodes: Raw[] | null } | null } | null } | null }>(
    `query PlayerUpcoming($id: ID!, $games: [ID]) { player(id: $id) { user { tournaments(query: { page: 1, perPage: 10, filter: { upcoming: true } }) { nodes {
      slug name startAt timezone city addrState countryCode isOnline events(filter: { videogameId: $games }) { name videogame { id } }
    } } } } }`,
    { id: playerId, games: SUPPORTED_GAME_IDS },
  );
  return (player?.user?.tournaments?.nodes ?? [])
    .flatMap((r): UpcomingTournament[] => {
      const events = (r.events ?? []).flatMap((e) => {
        const game = gameOfEvent(e);
        return game ? [{ name: e.name, game }] : [];
      });
      if (!events.length || !r.slug) return [];
      return [{
        slug: r.slug.replace(/^tournament\//, ""), name: r.name, startAt: r.startAt, timezone: r.timezone, city: r.city,
        region: regionFromGeo(r.countryCode, r.addrState), online: !!r.isOnline, events,
      }];
    })
    .sort((a, b) => a.startAt - b.startAt);
}
