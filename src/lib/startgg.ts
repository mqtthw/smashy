// start.gg API client. Server-only: the token must never reach the browser.
// Docs: https://developer.start.gg/docs/intro (limit: 80 requests / 60s, 1000 objects / request)

import { cacheLife } from "next/cache";
import { GAMES, GAME_KEYS, gameOfEvent, type GameKey } from "./games";
import { HOME_REGION, regionFromGeo, startggRegionFilter } from "./regions";

const API_URL = "https://api.start.gg/gql/alpha";
export const SUPPORTED_GAME_IDS = GAME_KEYS.flatMap((key) => GAMES[key].startggIds);

// start.gg allows 80 requests a minute per token, shared by everything (majors scan, brackets,
// event pages). Smashy paces itself at 70 a minute (per server), and if start.gg still says
// "slow down" it waits and retries, so a busy live major makes pages slower instead of broken.
const PER_MINUTE = 70;
const recent: number[] = []; // when recent requests were sent (ms)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// How long a request waits in line for a free slot before giving up with "busy" (round 515). Waiting
// without a limit let a flood (a crawler, a big bracket) queue requests for over five minutes, until
// Vercel killed them at its 300-second limit: 923 such timeouts in the week to 2026-11-18, each one
// billed for the whole five minutes. A visitor is better off with a quick "busy, try again".
export const MAX_SLOT_WAIT_MS = 10_000;

/** When the next request may go, or null to send now. `recent` is oldest first. Exported for tests. */
export function slotWait(sent: readonly number[], now: number, perMinute = PER_MINUTE): number | null {
  const live = sent.filter((t) => t > now - 60_000);
  return live.length < perMinute ? null : live[live.length - perMinute] + 60_000 - now + 25;
}

const BUSY = "start.gg is busy right now (rate limited): too many requests waiting";

// The whole site's count (round 518): each server's own count above can't see the others (servers in
// more than one region, and dev servers with the same key), so together they went over start.gg's 80
// and every page got "Rate limit exceeded". The database keeps one count for all of them.
const SITE_PER_MINUTE = 75;
// When the shared count can't be reached (database slow or down, or not set up yet), the server's own
// count is used alone for a minute rather than asking again before every request.
let siteCountOffUntil = 0;
type SlotTaker = () => Promise<number | null>;

type SiteAnswer = { granted: number; waitMs: number } | null;
// Requests waiting on the same server share one database call (round 562; round 560 asked once per
// start.gg request, then took 4 at a time, but unused slots still counted for the minute and filled
// the site's allowance). A server asks for exactly as many slots as it has requests waiting.
const MAX_BATCH = 8;

// One spare slot is taken with each ask and kept for 3 seconds (round 580): Smash history's saves and
// other loops ask start.gg one request at a time, so each request needed its own database call (605
// in 40 minutes on 2026-11-19). The next request in a loop uses the spare. At most one slot is wasted
// when a loop stops.
const SPARE_MS = 3_000;

/**
 * This server's share of the site-wide count. Each call waits for one slot; calls made while the
 * database is being asked are answered together by the next ask, and a spare from the last ask is
 * used first. Resolves 0 to go, milliseconds to wait, or null when there's no shared count.
 * Exported (with stand-ins for the database and the clock) for tests.
 */
export function siteSlots(ask: (want: number) => Promise<SiteAnswer>, now: () => number = Date.now) {
  const waiting: ((answer: number | null) => void)[] = [];
  let spareUntil = 0; // a slot this server holds, usable until then
  let asking = false;
  async function pump() {
    if (asking) return;
    asking = true;
    try {
      await null; // let requests started at the same moment (Promise.all) join this ask
      while (waiting.length) {
        if (spareUntil > now()) {
          spareUntil = 0;
          waiting.shift()!(0);
          continue;
        }
        const want = Math.min(waiting.length, MAX_BATCH);
        const r = await ask(want + 1);
        if (!r) {
          for (const w of waiting.splice(0)) w(null);
        } else if (r.granted > 0) {
          const served = waiting.splice(0, r.granted);
          for (const w of served) w(0);
          if (r.granted > served.length) spareUntil = now() + SPARE_MS;
        } else {
          // None free: wait, spread a little so waiting requests don't all ask again at the same moment.
          for (const w of waiting.splice(0)) w(r.waitMs + Math.floor(Math.random() * 250));
        }
      }
    } finally {
      asking = false;
    }
  }
  return () =>
    new Promise<number | null>((resolve) => {
      waiting.push(resolve);
      void pump();
    });
}

const takeSiteSlot = siteSlots(async (want) => {
  // No database key (tests, scripts): this server's own count only.
  if (Date.now() < siteCountOffUntil || !process.env.SUPABASE_SECRET_KEY) return null;
  try {
    const { createAdminClient } = await import("./supabase/admin");
    const { data, error } = await createAdminClient()
      .rpc("take_startgg_slots", { want, per_minute: SITE_PER_MINUTE })
      .abortSignal(AbortSignal.timeout(2_000));
    const row = (Array.isArray(data) ? data[0] : data) as { granted?: unknown; wait_ms?: unknown } | null;
    if (error || typeof row?.granted !== "number" || typeof row.wait_ms !== "number") throw error ?? new Error("no answer");
    return { granted: row.granted, waitMs: row.wait_ms };
  } catch (e) {
    siteCountOffUntil = Date.now() + 60_000;
    console.error("start.gg site-wide count unavailable, using this server's own:", e instanceof Error ? e.message : e);
    return null;
  }
});

/**
 * Waits for a free start.gg slot: this server's own count first, then the whole site's. Gives up with
 * "busy" when the wait would pass the deadline. Exported (with a stand-in for the database) for tests.
 */
export async function waitForSlot(takeSite: SlotTaker = takeSiteSlot, deadline = Date.now() + MAX_SLOT_WAIT_MS): Promise<void> {
  for (;;) {
    const now = Date.now();
    while (recent.length && recent[0] <= now - 60_000) recent.shift();
    const wait = slotWait(recent, now);
    if (wait === null) {
      recent.push(now);
      break;
    }
    if (now + wait > deadline) throw new Error(BUSY);
    await sleep(wait);
  }
  for (;;) {
    const wait = await takeSite();
    if (!wait) return; // a slot (0), or no shared count (null)
    if (Date.now() + wait > deadline) throw new Error(BUSY);
    await sleep(wait);
  }
}

/** How many start.gg requests this server sent in the last minute (start.gg allows the whole site 80). */
export function startggLoad(): number {
  const now = Date.now();
  while (recent.length && recent[0] <= now - 60_000) recent.shift();
  return recent.length;
}

class RateLimited extends Error {}

/** Where a field sits in a start.gg reply, e.g. ["event", "phases", 0, "phaseGroups", "nodes", 3, "startAt"]. */
export type StartggPath = readonly (string | number)[];
export type StartggOptions = {
  /**
   * start.gg can fail on single fields and still send everything else (for old events it fails on
   * every pool's start time). When every error in a reply sits at a path this accepts, the reply
   * is used anyway and those fields are null. Without it, any error fails the whole request.
   */
  ignoreErrorAt?: (path: StartggPath) => boolean;
};

export async function startggQuery<T>(query: string, variables: Record<string, unknown>, options: StartggOptions = {}): Promise<T> {
  const token = process.env.STARTGG_API_TOKEN;
  if (!token) {
    throw new Error("STARTGG_API_TOKEN is missing. Add it to .env.local (see .env.example).");
  }

  for (let attempt = 0; ; attempt++) {
    await waitForSlot();
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query, variables }),
        // Give up after 15 seconds: a start.gg that has stopped answering must not hold a page open
        // (the pages that use this already show a "couldn't load" note when it fails).
        signal: AbortSignal.timeout(15_000),
      });
      const json = await res.json().catch(() => ({}));
      const errors: { message?: string; path?: StartggPath }[] | undefined = Array.isArray(json.errors) ? json.errors : undefined;
      const message: string = errors?.[0]?.message ?? json.message ?? res.statusText;
      if (res.status === 429 || /rate limit/i.test(message ?? "")) throw new RateLimited(message);
      const ignore = options.ignoreErrorAt;
      const onlyIgnored = !!ignore && json.data != null && !!errors?.length && errors.every((e) => Array.isArray(e.path) && ignore(e.path));
      if (!res.ok || (json.errors && !onlyIgnored)) throw new Error(`start.gg request failed: ${message}`);
      // A reply with neither data nor errors happens when start.gg is struggling: say so plainly.
      if (json.data == null) throw new Error("start.gg request failed: no data in the reply");
      return json.data as T;
    } catch (e) {
      // A bare "TimeoutError" in the error log didn't say which request was slow (round 641): name it.
      if (e instanceof Error && e.name === "TimeoutError") {
        throw new Error(`start.gg didn't answer within 15 seconds (${query.match(/^\s*query\s+(\w+)/)?.[1] ?? "unnamed query"})`);
      }
      if (!(e instanceof RateLimited) || attempt >= 2) {
        throw e instanceof RateLimited ? new Error(`start.gg is busy right now (rate limited): ${e.message}`) : e;
      }
      await sleep(attempt === 0 ? 2_000 : 6_000);
    }
  }
}

/**
 * start.gg's "Your query complexity is too high" (more than 1,000 objects in one reply). Only some
 * events or players are that big, so callers retry in smaller pieces rather than failing (round 517).
 */
export function isTooComplex(e: unknown): boolean {
  return e instanceof Error && /query complexity is too high/i.test(e.message);
}

// ---------- Shapes we use in the app ----------

/** A start.gg account's profile picture URL (the biggest size), or null if they haven't set one. */
export async function getStartggProfileImage(startggUserId: number): Promise<string | null> {
  const data = await startggQuery<{ user: { images: { url: string; width: number | null }[] | null } | null }>(
    `query ProfileImage($id: ID!) { user(id: $id) { images(type: "profile") { url width } } }`,
    { id: startggUserId },
  );
  const images = [...(data.user?.images ?? [])].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  return images[0]?.url ?? null;
}

export type SmashyEvent = {
  id: string;
  name: string;
  game: GameKey;
  startAt: number | null;
  numEntrants: number | null;
  online?: boolean; // only kept on a single tournament's page (lists skip online brackets)
  /** start.gg's own word on the event (round 453): "CREATED" (not started), "ACTIVE" (being played) or "COMPLETED". */
  state?: string | null;
};

export type SmashyTournament = {
  id: string;
  slug: string; // e.g. "the-alamo-weekly-12" (without the "tournament/" prefix)
  name: string;
  city: string | null;
  venueName: string | null;
  venueAddress: string | null;
  startAt: number; // unix seconds
  endAt: number | null;
  timezone: string | null;
  numAttendees: number | null;
  isRegistrationOpen: boolean;
  imageUrl: string | null;
  bannerUrl: string | null;
  startggUrl: string;
  registerUrl: string;
  events: SmashyEvent[];
  streams: { source: string; name: string }[]; // e.g. { source: "TWITCH", name: "vgbootcamp" }
  /** Smashy's region code from the venue's country and state (round 704), e.g. "US-TX"; null if not a listed region. */
  region?: string | null;
  /** The venue on the map (round 855, Events' "Near me"); missing on copies saved before then. */
  lat?: number | null;
  lng?: number | null;
};

// ---------- Raw start.gg response shapes ----------

type RawEvent = {
  id: string;
  name: string;
  startAt: number | null;
  numEntrants: number | null;
  isOnline: boolean | null;
  state?: string | null;
  videogame: { id: string } | null;
};

type RawTournament = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  venueName: string | null;
  venueAddress: string | null;
  startAt: number;
  endAt: number | null;
  timezone: string | null;
  numAttendees: number | null;
  isRegistrationOpen: boolean | null;
  images: { type: string; url: string }[] | null;
  events: RawEvent[] | null;
  streams?: { streamName: string | null; streamSource: string | null }[] | null;
  addrState?: string | null;
  countryCode?: string | null;
  lat?: number | null;
  lng?: number | null;
};

const TOURNAMENT_FIELDS = `
  id name slug city addrState countryCode lat lng venueName venueAddress startAt endAt timezone numAttendees isRegistrationOpen
  images { type url }
  streams { streamName streamSource }
  events(filter: { videogameId: $videogameIds }) {
    id name state startAt numEntrants isOnline videogame { id }
  }
`;

// TOs sometimes publish practice brackets named "test"; hide those.
const TEST_NAME = /\btest/i;

// Which brackets to keep: "in_person" (the regional lists: in-person only), "online" (the Online tab:
// online only), or "all" (a single tournament's page, so links from My sets and brackets always work).
// Tournaments with no brackets left are dropped.
type Keep = "in_person" | "online" | "all";

function toSmashyTournament(raw: RawTournament, keep: Keep = "in_person"): SmashyTournament | null {
  if (keep !== "all" && TEST_NAME.test(raw.name)) return null;
  const events: SmashyEvent[] = (raw.events ?? []).flatMap((e) => {
    const game = gameOfEvent(e);
    if (!game || (keep === "in_person" && e.isOnline) || (keep === "online" && !e.isOnline)) return [];
    return [{ id: String(e.id), name: e.name, game, startAt: e.startAt, numEntrants: e.numEntrants, state: e.state ?? null, ...(e.isOnline ? { online: true } : {}) }];
  });
  if (events.length === 0) return null;

  const slug = raw.slug.replace(/^tournament\//, "");
  return {
    id: String(raw.id),
    slug,
    name: raw.name,
    city: raw.city,
    venueName: raw.venueName,
    venueAddress: raw.venueAddress,
    lat: typeof raw.lat === "number" ? raw.lat : null,
    lng: typeof raw.lng === "number" ? raw.lng : null,
    startAt: raw.startAt,
    endAt: raw.endAt,
    timezone: raw.timezone,
    numAttendees: raw.numAttendees,
    isRegistrationOpen: Boolean(raw.isRegistrationOpen),
    imageUrl: raw.images?.find((i) => i.type === "profile")?.url ?? null,
    bannerUrl: raw.images?.find((i) => i.type === "banner")?.url ?? null,
    startggUrl: `https://www.start.gg/tournament/${slug}/details`,
    registerUrl: `https://www.start.gg/tournament/${slug}/register`,
    events,
    streams: (raw.streams ?? []).flatMap((st) => (st.streamName && st.streamSource ? [{ source: st.streamSource, name: st.streamName }] : [])),
    region: regionFromGeo(raw.countryCode, raw.addrState),
  };
}

// ---------- Public functions (cached so we stay well under start.gg rate limits) ----------

const MAX_PAGES = 5; // up to 5 × 40 = 200 tournaments

/**
 * Loads every page of a paged start.gg list: page 1 first (it says how many pages there are), then
 * the rest 4 at a time instead of one by one. Results stay in page order.
 */
async function allPages<T>(fetchPage: (page: number) => Promise<{ totalPages: number; nodes: T[] }>, maxPages: number): Promise<T[]> {
  const first = await fetchPage(1);
  const total = Math.min(first.totalPages, maxPages);
  const rest: T[][] = [];
  for (let page = 2; page <= total; page += 4) {
    const batch = [page, page + 1, page + 2, page + 3].filter((p) => p <= total);
    rest.push(...(await Promise.all(batch.map(async (p) => (await fetchPage(p)).nodes))));
  }
  return [first.nodes, ...rest].flat();
}

/**
 * Like allPages, but if start.gg says a page asks for too much ("query complexity is too high": it
 * returns at most 1000 objects per request, and tournaments with many events count for more), it starts
 * over with half the page size (keeping roughly the same total), down to 10 per page.
 */
export async function adaptivePages<T>(fetchPage: (page: number, perPage: number) => Promise<{ totalPages: number; nodes: T[] }>, perPage: number, maxItems: number): Promise<T[]> {
  for (let size = perPage; ; size = Math.floor(size / 2)) {
    try {
      return await allPages((page) => fetchPage(page, size), Math.max(1, Math.ceil(maxItems / size)));
    } catch (e) {
      if (size <= 10 || !/complexity/i.test(e instanceof Error ? e.message : String(e))) throw e;
    }
  }
}

/**
 * Upcoming online tournaments for supported games (anywhere), soonest first: the Events "Online" tab.
 * Only their online brackets are kept. Cached for an hour (shared by every server) so start.gg isn't asked on every visit.
 */
export async function getOnlineTournaments(): Promise<SmashyTournament[]> {
  // Shared across server instances (a plain "use cache" lives in one instance's memory, so most visits
  // were asking start.gg again: 3-5 second loads, and more of start.gg's rate limit used).
  "use cache: remote";
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
  const query = `
    query OnlineTournaments($page: Int!, $perPage: Int!, $videogameIds: [ID]!) {
      tournaments(query: {
        page: $page
        perPage: $perPage
        sortBy: "startAt asc"
        filter: { upcoming: true, hasOnlineEvents: true, videogameIds: $videogameIds }
      }) {
        pageInfo { totalPages }
        nodes { ${TOURNAMENT_FIELDS} }
      }
    }
  `;
  const raws = await adaptivePages(async (page, perPage) => {
    const data = await startggQuery<{
      tournaments: { pageInfo: { totalPages: number }; nodes: RawTournament[] | null };
    }>(query, { page, perPage, videogameIds: SUPPORTED_GAME_IDS });
    return { totalPages: data.tournaments.pageInfo.totalPages, nodes: data.tournaments.nodes ?? [] };
  }, 25, MAX_PAGES * 40); // online organizers list many events per tournament: 40 per page is over start.gg's limit
  return raws.flatMap((raw) => toSmashyTournament(raw, "online") ?? []);
}

/** Upcoming in-person Texas tournaments for supported games, soonest first. */
export function getTexasTournaments(): Promise<SmashyTournament[]> {
  return getRegionTournaments(HOME_REGION);
}

/** Upcoming in-person tournaments in a region (see lib/regions.ts) for supported games, soonest first. */
export async function getRegionTournaments(region: string): Promise<SmashyTournament[]> {
  // Not cached here: lib/events.ts saves the results (and caches its reads), and its refresh job needs fresh data.

  const query = `
    query RegionTournaments($page: Int!, $perPage: Int!, $videogameIds: [ID]!, $countryCode: String, $addrState: String) {
      tournaments(query: {
        page: $page
        perPage: $perPage
        sortBy: "startAt asc"
        filter: { countryCode: $countryCode, addrState: $addrState, upcoming: true, videogameIds: $videogameIds }
      }) {
        pageInfo { totalPages }
        nodes { ${TOURNAMENT_FIELDS} }
      }
    }
  `;

  const raws = await adaptivePages(async (page, perPage) => {
    const data = await startggQuery<{
      tournaments: { pageInfo: { totalPages: number }; nodes: RawTournament[] | null };
    }>(query, { page, perPage, videogameIds: SUPPORTED_GAME_IDS, ...startggRegionFilter(region) });
    return { totalPages: data.tournaments.pageInfo.totalPages, nodes: data.tournaments.nodes ?? [] };
  }, 40, MAX_PAGES * 40);
  return raws.flatMap((raw) => toSmashyTournament(raw) ?? []);
}

/**
 * In-person Texas tournaments from the last `weeks` weeks, oldest first.
 * Used to spot recurring weeklies whose next start.gg page isn't posted yet.
 */
export function getRecentTexasTournaments(weeks = 8): Promise<SmashyTournament[]> {
  return getRecentRegionTournaments(HOME_REGION, weeks);
}

/** In-person tournaments in a region from the last `weeks` weeks, oldest first (to spot weeklies). */
export async function getRecentRegionTournaments(region: string, weeks = 8): Promise<SmashyTournament[]> {
  // Not cached here: lib/events.ts saves the results (and caches its reads), and its refresh job needs fresh data.

  const afterDate = Math.floor(Date.now() / 1000) - weeks * 7 * 86400;
  const query = `
    query RecentRegionTournaments($page: Int!, $perPage: Int!, $afterDate: Timestamp!, $videogameIds: [ID]!, $countryCode: String, $addrState: String) {
      tournaments(query: {
        page: $page
        perPage: $perPage
        sortBy: "startAt desc"
        filter: { countryCode: $countryCode, addrState: $addrState, past: true, afterDate: $afterDate, videogameIds: $videogameIds }
      }) {
        pageInfo { totalPages }
        nodes { ${TOURNAMENT_FIELDS} }
      }
    }
  `;

  const raws = await adaptivePages(async (page, perPage) => {
    const data = await startggQuery<{
      tournaments: { pageInfo: { totalPages: number }; nodes: RawTournament[] | null };
    }>(query, { page, perPage, afterDate, videogameIds: SUPPORTED_GAME_IDS, ...startggRegionFilter(region) });
    return { totalPages: data.tournaments.pageInfo.totalPages, nodes: data.tournaments.nodes ?? [] };
  }, 50, 500);
  // Asked for newest first, so a busy region that hits the 500 cap loses its oldest weeks rather than
  // its newest (which made every weekly look like it had ended). Returned oldest first, as before.
  return raws.flatMap((raw) => toSmashyTournament(raw) ?? []).reverse();
}

/** How many past tournaments one finder search reads at most (newest first): 6 requests of 50. */
export const PAST_SEARCH_MAX = 300;

/**
 * The past-tournament finder (round 794, on /brackets): finished tournaments in a region and/or with a name,
 * in one game or all of Smashy's, optionally in one year, newest first. start.gg can't sort or filter by
 * size, so this reads up to the newest PAST_SEARCH_MAX matches and the page filters by entrants. Kept in
 * the shared cache: a day for past years (they don't change), an hour for this year. `total` is how many
 * start.gg has and `read` how many were read, so the page can say when only the newest were.
 */
export async function searchPastTournaments(q: {
  region: string | null;
  name: string | null;
  game: GameKey | null;
  year: number | null;
}): Promise<{ tournaments: SmashyTournament[]; total: number; read: number }> {
  "use cache: remote";
  const thisYear = new Date().getUTCFullYear();
  if (q.year && q.year < thisYear) cacheLife("days");
  else cacheLife("hours");
  const query = `
    query PastTournaments($page: Int!, $perPage: Int!, $videogameIds: [ID]!, $countryCode: String, $addrState: String, $name: String, $afterDate: Timestamp, $beforeDate: Timestamp) {
      tournaments(query: {
        page: $page
        perPage: $perPage
        sortBy: "startAt desc"
        filter: { past: true, countryCode: $countryCode, addrState: $addrState, name: $name, afterDate: $afterDate, beforeDate: $beforeDate, videogameIds: $videogameIds }
      }) {
        pageInfo { total totalPages }
        nodes { ${TOURNAMENT_FIELDS} }
      }
    }
  `;
  const vars = {
    videogameIds: q.game ? GAMES[q.game].startggIds : SUPPORTED_GAME_IDS,
    ...(q.region ? startggRegionFilter(q.region) : {}),
    ...(q.name ? { name: q.name } : {}),
    ...(q.year ? { afterDate: Date.UTC(q.year, 0, 1) / 1000, beforeDate: Date.UTC(q.year + 1, 0, 1) / 1000 } : {}),
  };
  let total = 0;
  const raws = await adaptivePages(async (page, perPage) => {
    const data = await startggQuery<{
      tournaments: { pageInfo: { total: number; totalPages: number }; nodes: RawTournament[] | null };
    }>(query, { page, perPage, ...vars });
    total = Math.max(total, data.tournaments.pageInfo.total ?? 0);
    return { totalPages: data.tournaments.pageInfo.totalPages, nodes: data.tournaments.nodes ?? [] };
  }, 50, PAST_SEARCH_MAX);
  // In person and online alike (a name search finds both); practice brackets named "test" left out.
  const tournaments = raws.flatMap((raw) => (TEST_NAME.test(raw.name) ? [] : (toSmashyTournament(raw, "all") ?? [])));
  return { tournaments, total, read: raws.length };
}

// ---------- A player's tournament history ----------

export type HistoryEntry = {
  eventId: string;
  eventName: string; // e.g. "Melee Singles"
  game: GameKey;
  tournamentName: string;
  tournamentSlug: string;
  city: string | null;
  startAt: number;
  timezone: string | null;
  placement: number | null; // null = not finished yet (or no standings)
  numEntrants: number | null;
  isOnline: boolean;
  /** start.gg says the event is in progress (from the fresh list only): a league can run for weeks. */
  running?: boolean;
};

export const HISTORY_PAGE_SIZE = 20;

/** Events a start.gg user entered, newest first. All sizes count, including tiny locals. */
export async function getPlayerHistory(
  startggUserId: number,
  page = 1,
): Promise<{ entries: HistoryEntry[]; totalPages: number; total: number }> {
  "use cache: remote"; // shared by every server (round 524)
  cacheLife("hours");

  const query = `
    query PlayerHistory($userId: ID!, $page: Int!, $perPage: Int!, $videogameIds: [ID]) {
      user(id: $userId) {
        events(query: { page: $page, perPage: $perPage, filter: { videogameId: $videogameIds } }) {
          pageInfo { total totalPages }
          nodes {
            id name startAt numEntrants isOnline
            videogame { id }
            tournament { name slug city timezone }
            userEntrant(userId: $userId) { standing { placement } }
          }
        }
      }
    }
  `;
  type RawHistory = {
    id: string;
    name: string;
    startAt: number;
    numEntrants: number | null;
    isOnline: boolean | null;
    videogame: { id: string } | null;
    tournament: { name: string; slug: string; city: string | null; timezone: string | null } | null;
    userEntrant: { standing: { placement: number | null } | null } | null;
  };
  const data = await startggQuery<{
    user: { events: { pageInfo: { total: number; totalPages: number }; nodes: RawHistory[] | null } } | null;
  }>(query, { userId: startggUserId, page, perPage: HISTORY_PAGE_SIZE, videogameIds: SUPPORTED_GAME_IDS });

  const events = data.user?.events;
  const entries: HistoryEntry[] = (events?.nodes ?? []).flatMap((e) => {
    const game = gameOfEvent(e);
    if (!game || !e.tournament) return [];
    return [
      {
        eventId: String(e.id),
        eventName: e.name,
        game,
        tournamentName: e.tournament.name,
        tournamentSlug: e.tournament.slug.replace(/^tournament\//, ""),
        city: e.tournament.city,
        startAt: e.startAt,
        timezone: e.tournament.timezone,
        placement: e.userEntrant?.standing?.placement ?? null,
        numEntrants: e.numEntrants,
        isOnline: Boolean(e.isOnline),
      },
    ];
  });
  return { entries, totalPages: events?.pageInfo.totalPages ?? 0, total: events?.pageInfo.total ?? 0 };
}

/**
 * A start.gg user's events in their upcoming (or running) and most recent past tournaments, fresh
 * (minutes, not hours). start.gg's user.events can miss new sign-ups for a while (The Contract #225),
 * and the history above is cached for hours; this is what "I signed up" / "I placed" posts use.
 * `placement` is set only once start.gg marks the event finished.
 */
export async function getPlayerRecent(startggUserId: number, startggPlayerId?: number | string | null): Promise<HistoryEntry[]> {
  "use cache: remote"; // shared by every server (round 554): it was asked on most Feed loads
  cacheLife("minutes");
  type RawRecent = {
    id: string;
    name: string;
    state: string | null;
    startAt: number;
    numEntrants: number | null;
    isOnline: boolean | null;
    videogame: { id: string } | null;
    userEntrant: { id: string; standing: { placement: number | null } | null } | null;
  };
  type RawTournament = { name: string; slug: string; city: string | null; timezone: string | null; events: RawRecent[] | null };
  const fields = `nodes { name slug city timezone
    events { id name state startAt numEntrants isOnline videogame { id } userEntrant(userId: $userId) { id standing { placement } } } }`;
  const data = await startggQuery<{
    user: { upcoming: { nodes: RawTournament[] | null }; past: { nodes: RawTournament[] | null } } | null;
  }>(
    `query Recent($userId: ID!) { user(id: $userId) {
      upcoming: tournaments(query: { page: 1, perPage: 6, filter: { upcoming: true, past: false } }) { ${fields} }
      past: tournaments(query: { page: 1, perPage: 4, filter: { past: true } }) { ${fields} }
    } }`,
    { userId: startggUserId },
  );
  // A league or season that has started but not finished is neither "upcoming" nor "past" to
  // start.gg, so also take the latest tournaments by start date (a separate request: if start.gg ever
  // refuses it, the two lists above still count).
  const running = await startggQuery<{ user: { recent: { nodes: RawTournament[] | null } } | null }>(
    `query Running($userId: ID!) { user(id: $userId) {
      recent: tournaments(query: { page: 1, perPage: 6, sortBy: "startAt desc" }) { ${fields} }
    } }`,
    { userId: startggUserId },
  ).catch((e) => (console.error("running tournaments lookup failed", e instanceof Error ? e.message : e), null));
  // Entries an organizer added that aren't connected to the account (see playerSetEvents).
  const fromSets = startggPlayerId ? await playerSetEvents(startggPlayerId).catch((e) => (console.error("player sets lookup failed", e instanceof Error ? e.message : e), [])) : [];
  const seen = new Set<string>();
  const tournaments = [...(data.user?.upcoming.nodes ?? []), ...(running?.user?.recent.nodes ?? []), ...(data.user?.past.nodes ?? [])].filter((t) =>
    seen.has(t.slug) ? false : (seen.add(t.slug), true),
  );
  const fromAccount: HistoryEntry[] = tournaments.flatMap((t) =>
    (t.events ?? []).flatMap((e) => {
      const game = gameOfEvent(e);
      if (!game || !e.userEntrant) return [];
      return [
        {
          eventId: String(e.id),
          eventName: e.name,
          game,
          tournamentName: t.name,
          tournamentSlug: t.slug.replace(/^tournament\//, ""),
          city: t.city,
          startAt: e.startAt,
          timezone: t.timezone,
          placement: e.state === "COMPLETED" ? (e.userEntrant.standing?.placement ?? null) : null,
          numEntrants: e.numEntrants,
          isOnline: Boolean(e.isOnline),
          running: e.state === "ACTIVE",
        },
      ];
    }),
  );
  const known = new Set(fromAccount.map((e) => e.eventId));
  const extra: HistoryEntry[] = fromSets.flatMap((e) => {
    const game = gameOfEvent({ videogame: e.videogameId ? { id: e.videogameId } : null, name: e.eventName });
    if (!game || known.has(e.eventId)) return [];
    return [{ eventId: e.eventId, eventName: e.eventName, game, tournamentName: e.tournamentName, tournamentSlug: e.tournamentSlug, city: e.city, startAt: e.startAt, timezone: e.timezone, placement: e.placement, numEntrants: e.numEntrants, isOnline: e.isOnline, running: e.state === "ACTIVE" }];
  });
  return [...fromAccount, ...extra];
}

/** An event a player is in, found through their sets (see playerSetEvents). */
export type PlayerSetEvent = {
  eventId: string;
  eventName: string;
  startAt: number;
  state: string | null;
  videogameId: string | null;
  tournamentName: string;
  tournamentSlug: string;
  city: string | null;
  timezone: string | null;
  numEntrants: number | null;
  isOnline: boolean;
  entrantId: string;
  entrantName: string;
  placement: number | null;
};

/**
 * Events a start.gg *player* has sets in, newest first, from their recent sets. Catches entries the
 * user-account lookups miss: when an organizer adds someone to a bracket, start.gg ties the entry to
 * their player but can leave it unconnected to their account (an "unverified" attendee), and then
 * user.events, user.tournaments and userEntrant all skip it.
 *
 * Unplayed sets too (round 462): start.gg leaves sets that haven't been played out of a player's set
 * list unless they're asked for by state, so a league whose first sets are still to play (Texas
 * Arcadian League: Season 2, Division 3) only showed up that way.
 */
export async function playerSetEvents(startggPlayerId: number | string): Promise<PlayerSetEvent[]> {
  "use cache: remote"; // shared by every server (round 557): part of every signed-in Feed load
  cacheLife("minutes");
  type Raw = {
    event: {
      id: string | number; name: string; startAt: number; state: string | null; numEntrants: number | null; isOnline: boolean | null;
      videogame: { id: string | number } | null;
      tournament: { name: string; slug: string; city: string | null; timezone: string | null } | null;
    } | null;
    slots: { entrant: { id: string | number; name: string; standing: { placement: number | null } | null; participants: { player: { id: string | number } | null }[] | null } | null }[] | null;
  };
  const SET = `event { id name startAt state numEntrants isOnline videogame { id } tournament { name slug city timezone } }
      slots { entrant { id name standing { placement } participants { player { id } } } }`;
  const data = await startggQuery<{ player: { sets: { nodes: Raw[] | null } | null; open: { nodes: Raw[] | null } | null } | null }>(
    `query PlayerSets($p: ID!) { player(id: $p) {
      sets(page: 1, perPage: 25) { nodes { ${SET} } }
      open: sets(page: 1, perPage: 10, filters: { state: [1, 2, 6] }) { nodes { ${SET} } }
    } }`,
    { p: startggPlayerId },
  );
  const byEvent = new Map<string, PlayerSetEvent>();
  for (const s of [...(data.player?.sets?.nodes ?? []), ...(data.player?.open?.nodes ?? [])]) {
    const e = s.event;
    if (!e?.tournament || byEvent.has(String(e.id))) continue;
    const mine = (s.slots ?? []).map((sl) => sl.entrant).find((en) => en?.participants?.some((pa) => String(pa.player?.id) === String(startggPlayerId)));
    if (!mine) continue;
    byEvent.set(String(e.id), {
      eventId: String(e.id),
      eventName: e.name,
      startAt: e.startAt,
      state: e.state,
      videogameId: e.videogame ? String(e.videogame.id) : null,
      tournamentName: e.tournament.name,
      tournamentSlug: e.tournament.slug.replace(/^tournament\//, ""),
      city: e.tournament.city,
      timezone: e.tournament.timezone,
      numEntrants: e.numEntrants,
      isOnline: Boolean(e.isOnline),
      entrantId: String(mine.id),
      entrantName: mine.name,
      placement: e.state === "COMPLETED" ? (mine.standing?.placement ?? null) : null,
    });
  }
  return [...byEvent.values()].sort((a, b) => b.startAt - a.startAt);
}

/** One tournament by slug, or null if it doesn't exist / has no supported in-person events. */
export async function getTournament(slug: string): Promise<SmashyTournament | null> {
  "use cache: remote"; // shared by every server (round 524)
  const query = `
    query Tournament($slug: String!, $videogameIds: [ID]!) {
      tournament(slug: $slug) { ${TOURNAMENT_FIELDS} }
    }
  `;
  const data = await startggQuery<{ tournament: RawTournament | null }>(query, {
    slug,
    videogameIds: SUPPORTED_GAME_IDS,
  });
  const found = data.tournament ? toSmashyTournament(data.tournament, "all") : null;
  // "Not there" is often "not yet" (a page made private for now, or its Smash events not added yet),
  // so a miss is only kept for minutes. While it's on (from a day before until a day after), each
  // event's state changes during the day, so it's kept for minutes then too.
  const nowSec = Math.floor(Date.now() / 1000);
  const on = !!found && nowSec >= found.startAt - 86400 && nowSec <= (found.endAt ?? found.startAt + 86400) + 86400;
  if (found && !on) cacheLife("hours");
  else cacheLife("minutes");
  return found;
}

/** A finished event's 1st and 2nd from start.gg's final standings ("LG | Sonix", "Azel / Rocky"). */
export type EventWinners = { first: string; second: string | null; eventName: string };

/**
 * Winners of a tournament's finished events, keyed by event id: one request for every event,
 * from start.gg's own standings (right even when the bracket has several final phases).
 * `pending` lists events start.gg hasn't marked finished yet (scores not all reported).
 */
export async function getTournamentResults(slug: string): Promise<{ winners: Record<string, EventWinners>; pending: string[] }> {
  "use cache: remote"; // shared by every server (round 524)
  const data = await startggQuery<{
    tournament: { events: { id: number; name: string; state: string | null; standings: { nodes: { placement: number; entrant: { name: string } | null }[] | null } | null }[] | null } | null;
  }>(
    `query Winners($slug: String!, $videogameIds: [ID]!) { tournament(slug: $slug) {
      events(filter: { videogameId: $videogameIds }) { id name state standings(query: { perPage: 2, page: 1 }) { nodes { placement entrant { name } } } }
    } }`,
    { slug, videogameIds: SUPPORTED_GAME_IDS },
  );
  const winners: Record<string, EventWinners> = {};
  const pending: string[] = [];
  for (const e of data.tournament?.events ?? []) {
    if (e.state !== "COMPLETED") {
      pending.push(String(e.id));
      continue;
    }
    const nodes = e.standings?.nodes ?? [];
    const first = nodes.find((n) => n.placement === 1)?.entrant?.name;
    if (!first) continue;
    winners[String(e.id)] = { first, second: nodes.find((n) => n.placement === 2)?.entrant?.name ?? null, eventName: e.name };
  }
  // Results still coming in (organizers who report after the event): check again in minutes, not hours.
  if (pending.length) cacheLife("minutes");
  else cacheLife("hours");
  return { winners, pending };
}

/** Just the winners (see getTournamentResults). */
export async function getTournamentWinners(slug: string): Promise<Record<string, EventWinners>> {
  return (await getTournamentResults(slug)).winners;
}
