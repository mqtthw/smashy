// Majors: the big tournaments every player cares about, wherever they are.
// A scan of start.gg and parry.gg (every few hours, in the background) keeps the `majors` table up to
// date; site admins can feature any tournament or hide one. Pages read from the table, so they stay fast.
// A parry.gg major is saved as "parrygg/<its permanent parry.gg slug>", so its links lead to
// /events/parrygg/<slug> (Blitz Box: parrygg/blitz-box-01a1c611).
import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { after, connection } from "next/server";
import { GAME_KEYS, gameOfEvent, gamesFor, type GameKey } from "./games";
import { getParryggHomeTournaments, getParryggTournament, parseParryggSlug, type ParryggTournament } from "./brackets/parrygg";
import { SUPPORTED_GAME_IDS, startggQuery } from "./startgg";
import { runRefresh } from "./refreshJobs";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";

/** Biggest single event (entrants) that makes a tournament a major, per game. */
// Older games have much smaller scenes, so their bar is lower.
export const MAJOR_THRESHOLDS: Record<GameKey, number> = { melee: 250, ultimate: 400, pplus: 100, smash64: 48, brawl: 48, smash4: 64 };
const STAFF_PICK_MIN = 64; // start.gg staff picks count once one of our games has this many
// parry.gg features a few tournaments on its home page by hand: they count once one of our games has
// this many (Blitz Box was featured with 61 Melee entrants, a month out, cap 256).
const PARRYGG_FEATURED_MIN = 32;
export const PARRYGG_PREFIX = "parrygg/";
/** True for a major found on parry.gg (its slug starts with "parrygg/"). */
export const isParryggMajor = (slug: string) => slug.startsWith(PARRYGG_PREFIX);
/**
 * Tag on shared copies built from the majors list (round 634): an admin hiding, featuring or editing a
 * major calls updateTag(MAJORS_TAG), so every server drops them at once instead of up to hours later.
 */
export const MAJORS_TAG = "majors";
const SCAN_DAYS_AHEAD = 75;
const REFRESH_HOURS = 6;

export type Major = {
  slug: string;
  name: string;
  startAt: string;
  endAt: string;
  games: GameKey[];
  entrants: number | null;
  city: string | null;
  country: string | null;
  imageUrl: string | null;
  stream: { source: string; name: string } | null;
  source: "auto" | "admin" | "manual"; // manual: added by hand to Smash history (before start.gg)
  hidden: boolean;
  live: boolean;
  timezone: string | null; // the venue's, e.g. "America/Chicago" (null for rows saved before it was kept)
};

// ---------- start.gg ----------

type RawScanTournament = {
  name: string;
  slug: string;
  startAt: number;
  endAt: number | null;
  timezone: string | null;
  city: string | null;
  countryCode: string | null;
  images: { type: string; url: string }[] | null;
  streams: { streamName: string | null; streamSource: string | null }[] | null;
  events: { name?: string | null; numEntrants: number | null; isOnline: boolean | null; videogame: { id: string } | null }[] | null;
};

const SCAN_FIELDS = `
  name slug startAt endAt timezone city countryCode
  images { type url }
  streams { streamName streamSource }
  events(filter: { videogameId: $videogameIds }) { name numEntrants isOnline videogame { id } }
`;

type MajorRow = {
  slug: string;
  name: string;
  start_at: string;
  end_at: string;
  games: GameKey[];
  entrants: number | null;
  city: string | null;
  country: string | null;
  image_url: string | null;
  stream_source: string | null;
  stream_name: string | null;
  timezone: string | null;
};

/** Turns a start.gg tournament into a majors row, or null if it isn't one. `force` = an admin featured it. */
function toMajorRow(t: RawScanTournament, opts: { staffPick?: boolean; force?: boolean } = {}): MajorRow | null {
  if (/\btest/i.test(t.name)) return null;
  const best = new Map<GameKey, number>();
  for (const e of t.events ?? []) {
    const game = gameOfEvent(e);
    if (!game || e.isOnline) continue; // majors are in-person
    best.set(game, Math.max(best.get(game) ?? 0, e.numEntrants ?? 0));
  }
  if (best.size === 0) return null;
  const top = Math.max(...best.values());
  const qualifies =
    opts.force || [...best].some(([game, n]) => n >= MAJOR_THRESHOLDS[game]) || (opts.staffPick && top >= STAFF_PICK_MIN);
  if (!qualifies) return null;

  const streams = (t.streams ?? []).filter((s) => s.streamName && s.streamSource);
  const stream = streams.find((s) => s.streamSource === "TWITCH") ?? streams[0] ?? null;
  // List a game when it has a real bracket (side events with a handful of people don't count).
  const games = GAME_KEYS.filter((g) => best.has(g) && best.get(g)! >= 16);
  return {
    slug: t.slug.replace(/^tournament\//, ""),
    name: t.name,
    start_at: new Date(t.startAt * 1000).toISOString(),
    // start.gg sometimes leaves endAt empty: assume a 3-day weekend.
    end_at: new Date((t.endAt ?? t.startAt + 3 * 86400) * 1000).toISOString(),
    games: games.length ? games : [...best.keys()],
    entrants: top || null,
    city: t.city,
    country: t.countryCode,
    image_url: t.images?.find((i) => i.type === "profile")?.url ?? null,
    stream_source: stream?.streamSource ?? null,
    stream_name: stream?.streamName ?? null,
    timezone: t.timezone ?? null,
  };
}

type Page = { tournaments: { pageInfo?: { totalPages: number }; nodes: RawScanTournament[] | null } };

async function scanStartgg(): Promise<MajorRow[]> {
  const now = Math.floor(Date.now() / 1000);
  const after = now - 4 * 86400; // majors that started up to 4 days ago may still be running
  const rows = new Map<string, MajorRow>();

  // 1) start.gg staff picks: catches big events early, before sign-ups fill up.
  const picks = await startggQuery<Page>(
    `query Picks($videogameIds: [ID]!, $after: Timestamp!, $before: Timestamp!) {
      tournaments(query: { page: 1, perPage: 50, filter: { staffPicks: true, videogameIds: $videogameIds, afterDate: $after, beforeDate: $before } }) {
        nodes { ${SCAN_FIELDS} }
      }
    }`,
    { videogameIds: SUPPORTED_GAME_IDS, after, before: now + 200 * 86400 },
  );
  for (const t of picks.tournaments.nodes ?? []) {
    const row = toMajorRow(t, { staffPick: true });
    if (row) rows.set(row.slug, row);
  }

  // 2) Everything in the next ~2.5 months, keeping the big ones.
  const query = `query Scan($page: Int!, $videogameIds: [ID]!, $after: Timestamp!, $before: Timestamp!) {
    tournaments(query: { page: $page, perPage: 50, sortBy: "startAt asc", filter: { videogameIds: $videogameIds, afterDate: $after, beforeDate: $before } }) {
      pageInfo { totalPages }
      nodes { ${SCAN_FIELDS} }
    }
  }`;
  const fetchPage = (page: number) =>
    startggQuery<Page>(query, { page, videogameIds: SUPPORTED_GAME_IDS, after, before: now + SCAN_DAYS_AHEAD * 86400 });
  const keep = (data: Page) => {
    for (const t of data.tournaments.nodes ?? []) {
      const row = toMajorRow(t);
      if (row && !rows.has(row.slug)) rows.set(row.slug, row);
    }
  };
  // Page 1 says how many pages there are; the rest load 4 at a time with a short pause between
  // batches (about 20 requests in 10 seconds, well under start.gg's 80 per minute, leaving room
  // for bracket and event pages).
  const first = await fetchPage(1);
  keep(first);
  const total = Math.min(first.tournaments.pageInfo?.totalPages ?? 1, 60);
  for (let page = 2; page <= total; page += 4) {
    const batch = [page, page + 1, page + 2, page + 3].filter((p) => p <= total);
    for (const data of await Promise.all(batch.map(fetchPage))) keep(data);
    await new Promise((r) => setTimeout(r, 1500));
  }
  return [...rows.values()];
}

// ---------- The archive: past years (docs/archive-plan.md) ----------

/** The first year start.gg featured enough tournaments to go by (2016 has one); the archive's automatic years start here. */
export const ARCHIVE_FIRST_YEAR = 2017;
const ARCHIVE_MAX_PAGES = 6; // 300 featured tournaments a year is far more than start.gg has ever featured

/**
 * One year's majors from start.gg: the tournaments it featured that year (start.gg picks these by hand;
 * 2017 is its first full year) with an in-person bracket big enough to be a major. A few requests,
 * paced like the regular scan. Bigger tournaments start.gg didn't feature are added by admins.
 */
export async function scanStartggYear(year: number): Promise<MajorRow[]> {
  const query = `query Year($page: Int!, $videogameIds: [ID]!, $after: Timestamp!, $before: Timestamp!) {
    tournaments(query: { page: $page, perPage: 50, sortBy: "startAt asc", filter: { isFeatured: true, videogameIds: $videogameIds, afterDate: $after, beforeDate: $before } }) {
      pageInfo { totalPages }
      nodes { ${SCAN_FIELDS} }
    }
  }`;
  const vars = { videogameIds: SUPPORTED_GAME_IDS, after: Date.UTC(year, 0, 1) / 1000, before: Date.UTC(year + 1, 0, 1) / 1000 };
  const rows = new Map<string, MajorRow>();
  for (let page = 1, total = 1; page <= Math.min(total, ARCHIVE_MAX_PAGES); page++) {
    if (page > 1) await new Promise((r) => setTimeout(r, 1500));
    const data = await startggQuery<Page>(query, { ...vars, page });
    total = data.tournaments.pageInfo?.totalPages ?? 1;
    for (const t of data.tournaments.nodes ?? []) {
      const row = toMajorRow(t);
      if (row) rows.set(row.slug, row);
    }
  }
  return [...rows.values()];
}

// A past year rarely changes: start.gg is asked again after a week. This year's list, once a day.
const ARCHIVE_PAST_CACHE = { stale: 3600, revalidate: 7 * 86400, expire: 30 * 86400 };
const ARCHIVE_THIS_YEAR_CACHE = { stale: 3600, revalidate: 86400, expire: 7 * 86400 };

/**
 * Reads a year from start.gg and saves its majors in the majors table, so Smashy keeps its own copy.
 * Shared by every server ("use cache: remote"), so start.gg is asked once a week per year, not per visit.
 * Saving leaves `source` and `hidden` alone: an admin's choices stay.
 */
async function archiveYearFromStartgg(year: number, thisYear: boolean): Promise<number> {
  "use cache: remote";
  cacheLife(thisYear ? ARCHIVE_THIS_YEAR_CACHE : ARCHIVE_PAST_CACHE);
  const rows = await scanStartggYear(year);
  if (rows.length) {
    const { error } = await createAdminClient()
      .from("majors")
      // Streams aren't saved: Reels suggests the channels that streamed majors, and years of old
      // channels would bury the admins' queue (a past major's stream doesn't matter anyway).
      .upsert(rows.map((r) => ({ ...r, stream_source: undefined, stream_name: undefined, updated_at: new Date().toISOString() })), { onConflict: "slug" });
    if (error) throw error;
  }
  return rows.length;
}

// ---------- parry.gg ----------

/** Turns a parry.gg tournament into a majors row, or null if it isn't one. `force` = an admin featured it. */
export function parryggToMajorRow(t: ParryggTournament, opts: { force?: boolean; nowSec?: number } = {}): MajorRow | null {
  if (/\btest/i.test(t.name) || !t.startAt || t.online) return null;
  const best = new Map<GameKey, number>();
  for (const e of t.events) {
    if (!e.game || e.online) continue; // majors are in-person
    best.set(e.game, Math.max(best.get(e.game) ?? 0, e.entrants));
  }
  if (best.size === 0) return null;
  const top = Math.max(...best.values());
  const qualifies = opts.force || [...best].some(([game, n]) => n >= MAJOR_THRESHOLDS[game]) || (t.featured && top >= PARRYGG_FEATURED_MIN);
  if (!qualifies) return null;
  // parry.gg often has no end date: assume one day (a one-day major like Blitz Box), or until now
  // + a day while it's still marked as running, so a longer event doesn't drop off while it's on.
  const nowSec = opts.nowSec ?? Math.floor(Date.now() / 1000);
  const end = t.endAt && t.endAt > t.startAt ? t.endAt : t.over ? t.startAt + 86400 : Math.max(t.startAt + 86400, t.startAt <= nowSec ? nowSec + 86400 : 0);
  const games = GAME_KEYS.filter((g) => best.has(g) && best.get(g)! >= 16);
  return {
    slug: PARRYGG_PREFIX + t.slug,
    name: t.name,
    start_at: new Date(t.startAt * 1000).toISOString(),
    end_at: new Date(end * 1000).toISOString(),
    games: games.length ? games : [...best.keys()],
    entrants: top || null,
    city: t.city,
    country: t.country,
    // A small square still made by Smashy from parry.gg's picture (round 725): parry.gg's own files can be
    // huge animated banners (Blitz Box's is 19 MB), so cards showed no picture at all.
    image_url: t.avatarUrl || t.bannerUrl ? `/api/parrygg-image/${t.slug}/square` : null,
    stream_source: null,
    stream_name: null,
    timezone: t.timezone,
  };
}

async function scanParrygg(): Promise<MajorRow[]> {
  const nowSec = Math.floor(Date.now() / 1000);
  const rows: MajorRow[] = [];
  for (const t of await getParryggHomeTournaments(2)) {
    // Upcoming in the scan window, or started in the last 4 days (it may still be running).
    if (!t.startAt || t.over || t.startAt < nowSec - 4 * 86400 || t.startAt > nowSec + SCAN_DAYS_AHEAD * 86400) continue;
    const row = parryggToMajorRow(t, { nowSec });
    if (row) rows.push(row);
  }
  return rows;
}

async function fetchOne(slug: string): Promise<RawScanTournament | null> {
  const data = await startggQuery<{ tournament: RawScanTournament | null }>(
    `query One($slug: String!, $videogameIds: [ID]!) { tournament(slug: $slug) { ${SCAN_FIELDS} } }`,
    { slug, videogameIds: SUPPORTED_GAME_IDS },
  );
  return data.tournament;
}

// ---------- Keeping the table fresh ----------

/** Scans start.gg and parry.gg and updates the majors table. Takes about half a minute. */
export async function syncMajors() {
  const admin = createAdminClient();
  // parry.gg is a bonus: if it fails, the start.gg majors still update.
  const [startgg, parrygg] = await Promise.all([
    scanStartgg(),
    scanParrygg().catch((e) => {
      console.error("parry.gg majors scan failed", e instanceof Error ? e.message : e);
      return [] as MajorRow[];
    }),
  ]);
  const rows = [...startgg, ...parrygg];
  const now = new Date().toISOString();
  if (rows.length) {
    const { error } = await admin.from("majors").upsert(rows.map((r) => ({ ...r, updated_at: now })), { onConflict: "slug" });
    if (error) throw error;
  }
  // Admin-featured tournaments the scan didn't pick up: refresh their dates and streams too.
  const seen = new Set(rows.map((r) => r.slug));
  const { data: featured } = await admin.from("majors").select("slug").eq("source", "admin").gt("end_at", now);
  for (const { slug } of featured ?? []) {
    if (seen.has(slug)) continue;
    const row = await fetchFeatured(slug).catch(() => null);
    if (row) await admin.from("majors").update({ ...row, updated_at: now }).eq("slug", slug);
  }
  return rows.length;
}

/** Runs a scan if the last one is more than a few hours old (only one at a time). Call it inside after(). */
export async function refreshMajorsIfStale() {
  await runRefresh("majors", REFRESH_HOURS * 60, syncMajors, { fromPageView: true });
}

/** Pulls the tournament slug out of a start.gg link (or takes a bare slug). */
export function parseStartggSlug(input: string): string | null {
  const s = input.trim();
  const fromUrl = s.match(/start\.gg\/tournament\/([^/?#\s]+)/i)?.[1];
  const slug = fromUrl ?? (/^[a-z0-9-]+$/i.test(s) ? s : null);
  return slug ? slug.toLowerCase() : null;
}

/** A featured major's fresh row, from start.gg or parry.gg (by the start of its slug). */
async function fetchFeatured(slug: string): Promise<MajorRow | null> {
  if (isParryggMajor(slug)) {
    const t = await getParryggTournament(slug.slice(PARRYGG_PREFIX.length));
    return t && parryggToMajorRow(t, { force: true });
  }
  const t = await fetchOne(slug);
  return t && toMajorRow(t, { force: true });
}

/** Admin: feature a tournament by start.gg or parry.gg link (or a bare start.gg slug). */
export async function featureMajor(input: string): Promise<{ ok?: boolean; slug?: string; error?: string }> {
  const parry = parseParryggSlug(input);
  if (parry) {
    const t = await getParryggTournament(parry).catch(() => null);
    if (!t) return { error: "Couldn't find that tournament on parry.gg." };
    const row = parryggToMajorRow(t, { force: true });
    if (!row) return { error: "That tournament has no in-person Smash events." };
    const { error } = await createAdminClient()
      .from("majors")
      .upsert({ ...row, source: "admin", hidden: false, updated_at: new Date().toISOString() }, { onConflict: "slug" });
    return error ? { error: "Couldn't save it. Please try again." } : { ok: true, slug: row.slug };
  }
  const slug = parseStartggSlug(input);
  if (!slug) return { error: "Paste a start.gg or parry.gg tournament link." };
  const t = await fetchOne(slug).catch(() => null);
  if (!t) return { error: "Couldn't find that tournament on start.gg." };
  const row = toMajorRow(t, { force: true });
  if (!row) return { error: "That tournament has no in-person Melee, Ultimate or P+ events." };
  const { error } = await createAdminClient()
    .from("majors")
    .upsert({ ...row, source: "admin", hidden: false, updated_at: new Date().toISOString() }, { onConflict: "slug" });
  return error ? { error: "Couldn't save it. Please try again." } : { ok: true, slug: row.slug };
}

export async function setMajorHidden(slug: string, hidden: boolean) {
  const { error } = await createAdminClient().from("majors").update({ hidden }).eq("slug", slug);
  if (error) throw error;
}

// ---------- Reading ----------

type DbMajor = MajorRow & { source: "auto" | "admin" | "manual"; hidden: boolean };

function toMajor(r: DbMajor, nowMs: number): Major {
  return {
    slug: r.slug,
    name: r.name,
    startAt: r.start_at,
    endAt: r.end_at,
    games: r.games,
    entrants: r.entrants,
    city: r.city,
    country: r.country,
    imageUrl: r.image_url,
    stream: r.stream_source && r.stream_name ? { source: r.stream_source, name: r.stream_name } : null,
    source: r.source,
    hidden: r.hidden,
    live: Date.parse(r.start_at) <= nowMs && nowMs < Date.parse(r.end_at),
    timezone: r.timezone ?? null,
  };
}

const MAJOR_COLUMNS = "slug, name, start_at, end_at, games, entrants, city, country, image_url, stream_source, stream_name, source, hidden, timezone";

/** Hides majors that are only for older games the viewer doesn't play. */
export function majorsFor(majors: Major[], myGames: readonly string[]): Major[] {
  const visible = new Set<string>(gamesFor(myGames));
  return majors.filter((m) => m.games.some((g) => visible.has(g)));
}

/**
 * Live and upcoming majors (not hidden), soonest first. Read from the shared copy below (round 570):
 * the Feed, Events, Brackets and Pick'em read the majors table on every visit (28 times for 30 guest
 * views). "Live" and "finished" are worked out again here, so the copy being up to 2 minutes old only
 * means a just-added major can take 2 minutes to show.
 */
export async function getMajors(): Promise<{ live: Major[]; upcoming: Major[] }> {
  await connection(); // live/upcoming depends on the current time
  const nowMs = Date.now();
  const all = (await getMajorsSnapshot())
    .filter((m) => Date.parse(m.endAt) > nowMs)
    .map((m) => ({ ...m, live: Date.parse(m.startAt) <= nowMs && nowMs < Date.parse(m.endAt) }));
  return { live: all.filter((m) => m.live), upcoming: all.filter((m) => !m.live) };
}

/**
 * The same list as getMajors, from one copy shared by every visitor for a couple of minutes (the
 * desktop side column, round 500, asks on every page, so it must not query the database each time).
 */
export async function getMajorsSnapshot(): Promise<Major[]> {
  "use cache: remote"; // shared by every server (round 564)
  cacheLife({ stale: 60, revalidate: 120, expire: 600 });
  cacheTag(MAJORS_TAG);
  const nowMs = Date.now();
  const { data, error } = await createAdminClient({ forPage: true })
    .from("majors")
    .select(MAJOR_COLUMNS)
    .eq("hidden", false)
    .gt("end_at", new Date(nowMs).toISOString())
    .order("start_at")
    .limit(60); // getMajors' list too (it asked for 60)
  if (error) throw error;
  return ((data ?? []) as DbMajor[]).map((r) => toMajor(r, nowMs));
}

/** Admin list: everything current, including hidden ones. */
export async function getMajorsForAdmin(): Promise<Major[]> {
  await connection();
  const nowMs = Date.now();
  const { data, error } = await createAdminClient()
    .from("majors")
    .select(MAJOR_COLUMNS)
    .gt("end_at", new Date(nowMs).toISOString())
    .order("start_at")
    .limit(200);
  if (error) throw error;
  return ((data ?? []) as DbMajor[]).map((r) => toMajor(r, nowMs));
}

/** Smash history starts with the first game's release (Super Smash Bros., January 1999; Matthew, 2026-11-17). */
export const HISTORY_FIRST_YEAR = 1999;

/** The years Smash history lists, newest first: this year back to 1999. */
export function archiveYears({ nowMs = Date.now() }: { nowMs?: number } = {}): number[] {
  const out: number[] = [];
  for (let y = new Date(nowMs).getUTCFullYear(); y >= HISTORY_FIRST_YEAR; y--) out.push(y);
  return out;
}

/**
 * Majors that started in `year` and have finished (not hidden), newest first, from Smashy's saved copy.
 * The copy is brought up to date from start.gg in the background (round 516): waiting for that scan
 * made the first visit to each year after every deploy take 1.5–8.5 seconds. Only a year with nothing
 * saved yet waits for start.gg; if start.gg can't be reached, it shows what's saved.
 */
export async function getPastMajors(year: number): Promise<Major[]> {
  await connection(); // "finished" depends on the current time
  const nowMs = Date.now();
  const read = async () => {
    const { data, error } = await (await createClient())
      .from("majors")
      .select(MAJOR_COLUMNS)
      .eq("hidden", false)
      .gte("start_at", new Date(Date.UTC(year, 0, 1)).toISOString())
      .lt("start_at", new Date(Date.UTC(year + 1, 0, 1)).toISOString())
      .lt("end_at", new Date(nowMs).toISOString())
      .order("start_at", { ascending: false })
      .limit(300);
    if (error) throw error;
    return ((data ?? []) as DbMajor[]).map((r) => toMajor(r, nowMs));
  };
  // Years before start.gg only have majors added by hand.
  if (year < ARCHIVE_FIRST_YEAR) return read();
  const scan = () =>
    archiveYearFromStartgg(year, year === new Date(nowMs).getUTCFullYear()).catch((e) =>
      console.error(`Couldn't read ${year}'s majors from start.gg:`, e instanceof Error ? e.message : e),
    );
  const saved = await read();
  if (saved.length) {
    after(scan);
    return saved;
  }
  await scan();
  return read();
}

/**
 * Admin: finished majors whose name contains `q` (any capitals), hidden ones included, newest first
 * (Smash history, step A7). `year` narrows it to majors that started that year.
 */
export async function searchPastMajorsForAdmin(q: string, year: number | null): Promise<Major[]> {
  await connection();
  const nowMs = Date.now();
  let query = createAdminClient().from("majors").select(MAJOR_COLUMNS).lt("end_at", new Date(nowMs).toISOString());
  // Characters that mean something to a LIKE pattern or a PostgREST filter become spaces.
  const words = q.replace(/[%_\\,()*]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  if (words) query = query.ilike("name", `%${words}%`);
  if (year) query = query.gte("start_at", new Date(Date.UTC(year, 0, 1)).toISOString()).lt("start_at", new Date(Date.UTC(year + 1, 0, 1)).toISOString());
  const { data, error } = await query.order("start_at", { ascending: false }).limit(50);
  if (error) throw error;
  return ((data ?? []) as DbMajor[]).map((r) => toMajor(r, nowMs));
}

/**
 * Majors whose name contains `q` (any capitals), past and upcoming, not hidden, newest first: Search's
 * Events tab (round 842), which only knew events hosted on Smashy, so "genesis" found nothing.
 */
export async function searchMajors(q: string, limit = 10): Promise<Major[]> {
  await connection();
  // Characters that mean something to a LIKE pattern or a PostgREST filter become spaces.
  const words = q.replace(/[%_\\,()*]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  if (words.length < 2) return [];
  const { data, error } = await (await createClient())
    .from("majors")
    .select(MAJOR_COLUMNS)
    .eq("hidden", false)
    .ilike("name", `%${words}%`)
    .order("start_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const nowMs = Date.now();
  return ((data ?? []) as DbMajor[]).map((r) => toMajor(r, nowMs));
}

/** One major by slug (null if it isn't one, or is hidden). */
export async function getMajor(slug: string): Promise<Major | null> {
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase.from("majors").select(MAJOR_COLUMNS).eq("slug", slug).eq("hidden", false).maybeSingle();
  if (error) throw error;
  return data ? toMajor(data as DbMajor, Date.now()) : null;
}
