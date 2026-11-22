// Smash history, step A2 (docs/archive-plan.md): each archived major's events with their top 8,
// saved once in `major_events` so the archive shows winners without asking start.gg every visit
// (and player careers, step A5, can find every major a player placed at).
// Filled in the background after someone opens a year: a few majors per visit, one start.gg
// request each, claimed in the database so two servers never fetch the same major.
import "server-only";
import { GAME_KEYS, gameOfEvent, type GameKey } from "./games";
import { isSideEvent, pickMainEvent } from "./mainEvent";
import { ARCHIVE_FIRST_YEAR, getPastMajors, isParryggMajor } from "./majors";
import { majorsMissingStandings, saveMajorStandings } from "./majorStandings";
import { getNameLinks, linkedId, nameKey } from "./playerLinks";
import { SUPPORTED_GAME_IDS, startggLoad, startggQuery } from "./startgg";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";

/** `characters`: for results added by hand, the characters the source lists (SmashWiki), most played first. */
export type Top8Row = { place: number; name: string; playerId: string | null; characters?: string[] };
export type MajorEvent = {
  majorSlug: string;
  eventId: string;
  game: GameKey;
  name: string;
  entrants: number | null;
  teams: boolean;
  online: boolean;
  top8: Top8Row[];
};

type RawStanding = { placement: number; entrant: { name: string; participants: { player: { id: number | string } | null }[] | null } | null };
export type RawMajorEvent = {
  id: number | string;
  name: string;
  state: string | null;
  numEntrants: number | null;
  isOnline: boolean | null;
  videogame: { id: number | string } | null;
  teamRosterSize: { maxPlayers: number | null } | null;
  standings: { nodes: RawStanding[] | null } | null;
};

const PER_VISIT = 6; // majors saved after one visit to a year (about 9 seconds in the background)
const RECENT_DAYS = 7; // a major that ended this recently may still be getting its results entered
// Archive work gives way to live brackets and to guests looking up players (they wait from 35,
// GUEST_BUSY_AT): it stops when this server has already sent this many of
// start.gg's 80 requests a minute (what's left is claimed again 10 minutes later).
const BUSY_LOAD = 25;

/** start.gg's final standings → the top 8 (ties at 5th and 7th included), best first. */
export function toTop8(nodes: RawStanding[] | null | undefined, teams: boolean): Top8Row[] {
  return (nodes ?? [])
    .filter((n) => n.entrant && n.placement >= 1 && n.placement <= 8)
    .sort((a, b) => a.placement - b.placement)
    .map((n) => {
      const solo = !teams && n.entrant!.participants?.length === 1 ? n.entrant!.participants[0].player : null;
      return { place: n.placement, name: n.entrant!.name, playerId: solo ? String(solo.id) : null };
    });
}

/** A tournament's start.gg events → rows to save (events in a Smash game with standings only). */
export function toMajorEvents(majorSlug: string, events: RawMajorEvent[]): MajorEvent[] {
  return events.flatMap((e) => {
    const game = gameOfEvent(e);
    const teams = (e.teamRosterSize?.maxPlayers ?? 1) > 1;
    const top8 = toTop8(e.standings?.nodes, teams);
    if (!game || !top8.length) return [];
    return [{ majorSlug, eventId: String(e.id), game, name: e.name, entrants: e.numEntrants, teams, online: !!e.isOnline, top8 }];
  });
}

/** Each game's winner at a major: its main in-person singles event, in game order. */
export function winnersByGame(events: MajorEvent[]): { game: GameKey; name: string }[] {
  return GAME_KEYS.flatMap((game) => {
    const best = pickMainEvent(events.filter((e) => e.game === game && !e.teams && !e.online && e.top8[0]?.place === 1));
    return best ? [{ game, name: best.top8[0].name }] : [];
  });
}

/** The biggest event of one game at a major (its entrant count, for the archive's game filter). */
export function gameEntrants(events: MajorEvent[], game: GameKey): number | null {
  const counts = events.filter((e) => e.game === game && !e.online).map((e) => e.entrants ?? 0);
  return counts.length ? Math.max(...counts) : null;
}

async function fetchEvents(slug: string): Promise<RawMajorEvent[] | null> {
  const data = await startggQuery<{ tournament: { events: RawMajorEvent[] | null } | null }>(
    `query MajorEvents($slug: String!, $videogameIds: [ID]!) { tournament(slug: $slug) {
      events(filter: { videogameId: $videogameIds }) {
        id name state numEntrants isOnline videogame { id } teamRosterSize { maxPlayers }
        standings(query: { perPage: 8, page: 1 }) { nodes { placement entrant { name participants { player { id } } } } }
      }
    } }`,
    { slug, videogameIds: SUPPORTED_GAME_IDS },
  );
  return data.tournament ? (data.tournament.events ?? []) : null;
}

/**
 * Saves the results of up to a few of these majors that don't have them yet (newest first).
 * Call inside after(): it pauses between start.gg requests, and stops when start.gg is busy. A major
 * start.gg is still entering results for (ended in the last week, an event not finished) is tried
 * again later.
 */
export async function saveMajorResults(slugs: string[], max = PER_VISIT): Promise<number> {
  if (!slugs.length) return 0;
  const db = createAdminClient();
  const { data: claimed, error } = await db.rpc("claim_major_results", { slugs, max_count: max });
  if (error) {
    console.error("Couldn't claim majors to save results for:", error.message);
    return 0;
  }
  const mine = ((claimed ?? []) as unknown[]).map(String);
  if (!mine.length) return 0;
  let saved = 0;
  const { data: ends } = await db.from("majors").select("slug, end_at").in("slug", mine);
  const endOf = new Map((ends ?? []).map((r) => [r.slug as string, Date.parse(r.end_at as string)]));

  for (const [i, slug] of mine.entries()) {
    // parry.gg majors: their results aren't read here yet; marked done so they aren't claimed again.
    if (isParryggMajor(slug)) {
      await db.from("majors").update({ results_saved_at: new Date().toISOString() }).eq("slug", slug);
      saved++;
      continue;
    }
    if (i > 0) await new Promise((r) => setTimeout(r, 1500));
    if (startggLoad() > BUSY_LOAD) return saved;
    try {
      const raw = await fetchEvents(slug);
      const rows = toMajorEvents(slug, raw ?? []);
      if (rows.length) {
        const { error: saveError } = await db.from("major_events").upsert(
          rows.map((e) => ({
            major_slug: e.majorSlug,
            event_id: e.eventId,
            game: e.game,
            name: e.name,
            entrants: e.entrants,
            teams: e.teams,
            online: e.online,
            top8: e.top8,
            saved_at: new Date().toISOString(),
          })),
          { onConflict: "major_slug,event_id" },
        );
        if (saveError) throw saveError;
      }
      const unfinished = (raw ?? []).some((e) => e.state !== "COMPLETED" && gameOfEvent(e));
      const recent = Date.now() - (endOf.get(slug) ?? 0) < RECENT_DAYS * 86400_000;
      // Leave the claim to run out (10 minutes) when results may still be coming; otherwise done.
      if (!(unfinished && recent)) await db.from("majors").update({ results_saved_at: new Date().toISOString() }).eq("slug", slug);
      saved++;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(`Couldn't save results for ${slug}:`, message);
      if (/rate limited/i.test(message)) return saved; // start.gg is busy: leave the rest for later
    }
  }
  return saved;
}

const DAILY_MAX = 40; // majors whose results the daily job saves (about a minute, paced)
const DAILY_STANDINGS = 60; // start.gg requests for full standings (step H3) after that (about 1.5 minutes)

/**
 * The daily job (api/cron/refresh): makes sure every year since start.gg (2017) has its majors read in,
 * then saves results for up to 40 majors that still lack them, newest first, then full standings. Years nobody has opened
 * on Smash history get their winners and top 8s this way. Same pacing and limits as page visits.
 */
export async function fillArchive(nowMs = Date.now()): Promise<{ years: number; saved: number; standings: number }> {
  const thisYear = new Date(nowMs).getUTCFullYear();
  let years = 0;
  for (let y = ARCHIVE_FIRST_YEAR; y <= thisYear; y++) {
    if (startggLoad() > BUSY_LOAD) break;
    await getPastMajors(y).catch(() => []); // reads the year from start.gg if it isn't cached (weekly)
    years++;
  }
  const { data, error } = await createAdminClient()
    .from("majors")
    .select("slug")
    .is("results_saved_at", null)
    .eq("hidden", false)
    .neq("source", "manual")
    .lt("end_at", new Date(nowMs).toISOString())
    .gte("start_at", new Date(Date.UTC(ARCHIVE_FIRST_YEAR, 0, 1)).toISOString())
    .order("start_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  const saved = await saveMajorResults((data ?? []).map((r) => r.slug as string), DAILY_MAX);
  // Then full standings (top 64) of majors whose top 8s are saved, hand-added ones matched on start.gg included.
  const standings = startggLoad() > BUSY_LOAD ? 0 : await saveMajorStandings(await majorsMissingStandings(), DAILY_STANDINGS);
  return { years, saved, standings };
}

/** Saved events of these majors, by major slug. */
export async function getMajorEvents(slugs: string[]): Promise<Map<string, MajorEvent[]>> {
  const out = new Map<string, MajorEvent[]>();
  if (!slugs.length) return out;
  const { data, error } = await (await createClient())
    .from("major_events")
    .select("major_slug, event_id, game, name, entrants, teams, online, top8")
    .in("major_slug", slugs);
  if (error) throw error;
  for (const r of data ?? []) {
    const e: MajorEvent = {
      majorSlug: r.major_slug,
      eventId: r.event_id,
      game: r.game as GameKey,
      name: r.name,
      entrants: r.entrants,
      teams: r.teams,
      online: r.online,
      top8: r.top8 as Top8Row[],
    };
    out.set(e.majorSlug, [...(out.get(e.majorSlug) ?? []), e]);
  }
  return out;
}

/** `side`: a teams bracket or one named as a side event; its 1st place isn't counted as a major win. */
/** `eventId`: its bracket (for the characters start.gg's sets saved); `characters`: a hand-added result's own. */
export type PlayerMajor = { slug: string; majorName: string; startAt: string; game: GameKey; eventName: string; entrants: number | null; place: number; side: boolean; eventId?: string; characters?: string[] };

/**
 * A player's placings at the majors Smash history has saved (step A5; top 8s, and the top 64 where
 * full standings are saved, step H3), newest first, best place per major and game. Only singles: teams have no player id. Hidden majors are left out.
 */
export async function getPlayerMajors(id: string | number): Promise<PlayerMajor[]> {
  const playerId = String(id); // saved top 8s keep it as text
  if (!/^\d{1,12}$/.test(playerId)) return [];
  const supabase = await createClient();
  const select = "event_id, game, name, entrants, teams, top8, major:majors!inner ( slug, name, start_at, hidden )";
  // Names an admin linked to this player (Smash history H2): their placings in results added by hand.
  // (Every link is read, so a link for one game wins over this player's every-game link of the same name.)
  const links = await getNameLinks().catch(() => new Map<string, string>());
  const keys = new Set([...links].filter(([, id]) => id === playerId).map(([k]) => k));
  const [{ data, error }, linkedRows, standingRows] = await Promise.all([
    supabase
      .from("major_events")
      .select(select)
      .contains("top8", JSON.stringify([{ playerId }])) // jsonb: sent as JSON (an array would go as a Postgres array)
      .eq("major.hidden", false)
      .limit(300),
    keys.size
      ? supabase.from("major_events").select(select).like("major_slug", "manual/%").eq("teams", false).eq("major.hidden", false).limit(2000)
      : Promise.resolve({ data: [] as unknown[] }),
    // Placings outside the top 8 (full standings, step H3): one combined list (Matthew, 2026-11-19).
    supabase
      .from("major_standings")
      .select("standings, event:major_events!inner ( event_id, game, name, entrants, teams, major:majors!inner ( slug, name, start_at, hidden ) )")
      .contains("standings", JSON.stringify([{ playerId }]))
      .limit(500),
  ]);
  if (error) throw error;
  type StandingsRow = { standings: Top8Row[]; event: { event_id: string; game: GameKey; name: string; entrants: number | null; teams: boolean; major: { slug: string; name: string; start_at: string; hidden: boolean } } };
  const fromStandings = ((standingRows.data ?? []) as unknown as StandingsRow[]).flatMap((r) => {
    const me = r.event.major.hidden ? undefined : r.standings.find((x) => x.playerId === playerId);
    const m = r.event.major;
    return me ? [{ slug: m.slug, majorName: m.name, startAt: m.start_at, game: r.event.game, eventName: r.event.name, entrants: r.event.entrants, place: me.place, side: r.event.teams || isSideEvent(r.event.name), eventId: r.event.event_id }] : [];
  });
  type Row = { event_id: string; game: GameKey; name: string; entrants: number | null; teams: boolean; top8: Top8Row[]; major: { slug: string; name: string; start_at: string } };
  const mine = (r: Row) => r.top8.find((x) => x.playerId === playerId) ?? (r.teams ? undefined : r.top8.find((x) => !x.playerId && linkedId(links, r.game, nameKey(x.name)) === playerId));
  return bestPerMajor(
    ([...(data ?? []), ...(linkedRows.data ?? [])] as unknown as Row[]).flatMap((r): PlayerMajor[] => {
      const me = mine(r);
      return me ? [{ slug: r.major.slug, majorName: r.major.name, startAt: r.major.start_at, game: r.game, eventName: r.name, entrants: r.entrants, place: me.place, side: r.teams || isSideEvent(r.name), eventId: r.event_id, characters: me.characters }] : [];
    }).concat(fromStandings),
  );
}

/**
 * One row per major and game, newest first: its main bracket when the player placed in one (not a teams or
 * side-event bracket), then the best place, then the biggest bracket.
 */
export function bestPerMajor(rows: PlayerMajor[]): PlayerMajor[] {
  const best = new Map<string, PlayerMajor>();
  for (const r of rows) {
    const key = `${r.slug}|${r.game}`;
    const had = best.get(key);
    if (!had || (Number(r.side) - Number(had.side) || r.place - had.place || (had.entrants ?? 0) - (r.entrants ?? 0)) < 0) best.set(key, r);
  }
  return [...best.values()].sort((a, b) => b.startAt.localeCompare(a.startAt) || a.place - b.place);
}
