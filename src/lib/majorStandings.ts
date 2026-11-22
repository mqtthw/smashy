// Smash history, step H3 (docs/archive-plan.md, Phase 2): full standings. Each saved bracket's top 64
// (64 entrants: 1st through 49th) from start.gg's final standings, saved once in `major_standings`.
// Top 64 rather than every placing: one request per bracket on start.gg's shared key (a 2,000-entrant
// bracket would take ~30), and the top 64 is what historians cite.
// Filled after the top 8s (majors whose results are saved), a few majors per year-page visit and more in
// the daily job, with the same pacing: 1.5 s between requests, stopping when start.gg is busy, majors
// claimed in the database so two servers never read the same one.
import "server-only";
import { gameOfEvent, type GameKey } from "./games";
import { isManualEvent } from "./handMajors";
import { startggLoad, startggQuery } from "./startgg";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";
import type { Top8Row } from "./majorEvents";

export type StandingRow = Top8Row; // { place, name, playerId }
type RawStanding = { placement: number; entrant: { name: string; participants: { player: { id: number | string } | null }[] | null } | null };
type RawEvent = {
  id: number | string;
  numEntrants: number | null;
  isOnline?: boolean | null;
  videogame?: { id: number | string } | null;
  teamRosterSize: { maxPlayers: number | null } | null;
  standings?: { nodes: RawStanding[] | null } | null;
};

export const STANDINGS_SIZE = 64;
const PAUSE_MS = 1500;
const BUSY_LOAD = 25; // as for top 8s (majorEvents.ts): archive work gives way to live brackets and guests
const VISIT_REQUESTS = 8; // start.gg requests after one visit to a year (about 12 seconds in the background)
const MAX_EVENTS = 8; // brackets per major (biggest first): side events past that aren't worth the requests

/** start.gg's final standings → saved rows, best first. Accounts start.gg shows as "Deleted user" are left out rather than named. */
export function toStandings(nodes: RawStanding[] | null | undefined, teams: boolean): StandingRow[] {
  return (nodes ?? [])
    .filter((n) => n.entrant && n.placement >= 1 && !/^deleted user$/i.test(n.entrant.name.trim()))
    .sort((a, b) => a.placement - b.placement)
    .map((n) => {
      const solo = !teams && n.entrant!.participants?.length === 1 ? n.entrant!.participants[0].player : null;
      return { place: n.placement, name: n.entrant!.name, playerId: solo ? String(solo.id) : null };
    });
}

/**
 * A hand-added bracket's start.gg event (round 526 matched its tournament): the biggest in-person singles
 * event of its game, if its entrant count is within a quarter of the one saved (otherwise it's not the same bracket).
 */
export function pickStartggEvent(events: RawEvent[], game: GameKey, entrants: number | null): RawEvent | null {
  const best = events
    .filter((e) => gameOfEvent(e) === game && !e.isOnline && (e.teamRosterSize?.maxPlayers ?? 1) <= 1)
    .sort((a, b) => (b.numEntrants ?? 0) - (a.numEntrants ?? 0))[0];
  if (!best) return null;
  if (entrants && best.numEntrants && Math.abs(best.numEntrants - entrants) > entrants / 4) return null;
  return best;
}

async function fetchStandings(eventId: string): Promise<RawEvent | null> {
  const data = await startggQuery<{ event: RawEvent | null }>(
    `query MajorStandings($id: ID!, $perPage: Int!) { event(id: $id) {
      id numEntrants teamRosterSize { maxPlayers }
      standings(query: { perPage: $perPage, page: 1 }) { nodes { placement entrant { name participants { player { id } } } } }
    } }`,
    { id: eventId, perPage: STANDINGS_SIZE },
  );
  return data.event;
}

async function fetchTournamentEvents(slug: string): Promise<RawEvent[]> {
  const data = await startggQuery<{ tournament: { events: RawEvent[] | null } | null }>(
    `query TournamentEvents($slug: String!) { tournament(slug: $slug) {
      events { id name numEntrants isOnline videogame { id } teamRosterSize { maxPlayers } }
    } }`,
    { slug },
  );
  return data.tournament?.events ?? [];
}

type SavedEvent = { event_id: string; game: GameKey; entrants: number | null; teams: boolean; startgg_tournament: string | null };

/**
 * Saves the top 64 of up to `maxRequests` brackets of these majors whose standings aren't saved yet
 * (newest first). Call inside after() or the daily job: it pauses between start.gg requests and stops when
 * start.gg is busy. A major left halfway is claimed again 10 minutes later and skips brackets already saved.
 */
export async function saveMajorStandings(slugs: string[], maxRequests = VISIT_REQUESTS): Promise<number> {
  if (!slugs.length || maxRequests <= 0) return 0;
  const db = createAdminClient();
  const { data: claimed, error } = await db.rpc("claim_major_standings", { slugs, max_count: Math.ceil(maxRequests / 2) });
  if (error) {
    console.error("Couldn't claim majors to save standings for:", error.message);
    return 0;
  }
  let requests = 0;
  let saved = 0;
  // Paced, and stops (false) when the budget is spent or start.gg is busy.
  const nextRequest = async () => {
    if (requests >= maxRequests) return false;
    if (requests > 0) await new Promise((r) => setTimeout(r, PAUSE_MS));
    if (startggLoad() > BUSY_LOAD) return false;
    requests++;
    return true;
  };

  for (const slug of ((claimed ?? []) as unknown[]).map(String)) {
    const [{ data: events, error: eventsError }, { data: done }] = await Promise.all([
      db.from("major_events").select("event_id, game, entrants, teams, startgg_tournament").eq("major_slug", slug),
      db.from("major_standings").select("event_id").eq("major_slug", slug),
    ]);
    if (eventsError) {
      console.error(`Couldn't read ${slug}'s events:`, eventsError.message);
      continue;
    }
    const have = new Set((done ?? []).map((r) => r.event_id as string));
    const todo = ((events ?? []) as SavedEvent[])
      .filter((e) => (isManualEvent(slug, e.event_id) ? !!e.startgg_tournament : true) && !have.has(e.event_id))
      .sort((a, b) => (b.entrants ?? 0) - (a.entrants ?? 0))
      .slice(0, MAX_EVENTS)
      // Brackets of 8 or fewer have nothing past their top 8 (a missing count is read anyway).
      .filter((e) => e.entrants === null || e.entrants > 8);
    const tournaments = new Map<string, RawEvent[]>();
    let finished = true;
    try {
      for (const e of todo) {
        let startggId: string | null = e.event_id;
        if (isManualEvent(slug, e.event_id)) {
          const t = e.startgg_tournament!;
          if (!tournaments.has(t)) {
            if (!(await nextRequest())) { finished = false; break; }
            tournaments.set(t, await fetchTournamentEvents(t));
          }
          const picked = pickStartggEvent(tournaments.get(t)!, e.game, e.entrants);
          startggId = picked ? String(picked.id) : null;
        }
        if (!startggId) continue; // not on start.gg any more, or not the same bracket: nothing to save
        if (!(await nextRequest())) { finished = false; break; }
        const raw = await fetchStandings(startggId);
        const rows = toStandings(raw?.standings?.nodes, e.teams || (raw?.teamRosterSize?.maxPlayers ?? 1) > 1);
        if (!rows.length) continue;
        const { error: saveError } = await db
          .from("major_standings")
          .upsert({ major_slug: slug, event_id: e.event_id, startgg_event_id: startggId, standings: rows, saved_at: new Date().toISOString() }, { onConflict: "major_slug,event_id" });
        if (saveError) throw saveError;
        saved++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Couldn't save standings for ${slug}:`, message);
      if (/rate limited|busy/i.test(message)) return saved; // start.gg is busy: leave the rest for later
      continue; // the claim runs out in 10 minutes and the major is tried again
    }
    if (!finished) return saved;
    await db.from("majors").update({ standings_saved_at: new Date().toISOString() }).eq("slug", slug);
  }
  return saved;
}

/** Majors whose results are saved but standings aren't, newest first (for the daily job). */
export async function majorsMissingStandings(limit = 500): Promise<string[]> {
  const { data, error } = await createAdminClient()
    .from("majors")
    .select("slug")
    .not("results_saved_at", "is", null)
    .is("standings_saved_at", null)
    .eq("hidden", false)
    .order("start_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => r.slug as string);
}

/** A major's saved standings, by its major_events event id. */
export async function getMajorStandings(slug: string): Promise<Map<string, StandingRow[]>> {
  const { data, error } = await (await createClient()).from("major_standings").select("event_id, standings").eq("major_slug", slug);
  if (error) throw error;
  return new Map((data ?? []).map((r) => [r.event_id as string, r.standings as StandingRow[]]));
}
