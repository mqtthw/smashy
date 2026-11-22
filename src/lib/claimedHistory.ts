// Claimed player pages: the saved careers of members who linked their start.gg. A member brings in
// their whole start.gg history once (their start.gg account's event list, read a few pages at a
// time), and their latest results are added whenever their page is read after that. Saved and shown
// only while they show their stats; unlinking start.gg deletes it (a database trigger). Server-only.
import "server-only";
import { gameOfEvent } from "./games";
import { getLinkedPlayer } from "./playerStats";
import type { PlayerResult } from "./playerResults";
import { startggQuery } from "./startgg";
import { createAdminClient } from "./supabase/admin";

export const PAGE_SIZE = 25; // events per start.gg request (complexity ~176)
export const PAGES_PER_BATCH = 8; // 200 events per "bring in" tap

export type Claim = { userId: string; handle: string | null; startggUserId: string; showStats: boolean };

/** Who claimed a start.gg player on Smashy (linked it), if anyone. */
export async function getClaim(playerId: string): Promise<Claim | null> {
  if (!/^\d{1,12}$/.test(playerId)) return null;
  const db = createAdminClient();
  const { data: link } = await db.from("startgg_links").select("user_id, startgg_user_id").eq("startgg_player_id", playerId).maybeSingle();
  if (!link) return null;
  const [linked, { data: prof }] = await Promise.all([getLinkedPlayer(link.user_id), db.from("profiles").select("handle").eq("id", link.user_id).maybeSingle()]);
  return { userId: link.user_id, handle: prof?.handle ?? null, startggUserId: String(link.startgg_user_id), showStats: linked?.showStats ?? false };
}

type Row = {
  event_id: number; placement: number; event_name: string; tournament: string; tournament_slug: string | null;
  entrants: number; start_at: string | null; game: string; doubles: boolean;
};

const toRow = (userId: string, r: PlayerResult) => ({
  user_id: userId,
  event_id: Number(r.eventId),
  placement: r.placement,
  event_name: r.eventName.slice(0, 200),
  tournament: r.tournament.slice(0, 200),
  tournament_slug: r.tournamentSlug?.slice(0, 200) ?? null,
  entrants: Math.max(0, r.entrants),
  start_at: r.startAt ? new Date(r.startAt * 1000).toISOString() : null,
  game: r.game ?? "other",
  doubles: r.doubles,
  saved_at: new Date().toISOString(),
});

/** Save placements to a member's career (newer data replaces older for the same event). */
export async function saveResults(userId: string, results: PlayerResult[]): Promise<void> {
  const rows = results.filter((r) => r.game && /^\d{1,12}$/.test(r.eventId) && r.placement >= 1).map((r) => toRow(userId, r));
  if (!rows.length) return;
  const { error } = await createAdminClient().from("claimed_results").upsert(rows, { onConflict: "user_id,event_id" });
  if (error) console.error("Saving claimed results failed", error.message);
}

/** A member's saved career, newest first. */
export async function getSavedResults(userId: string): Promise<PlayerResult[]> {
  const db = createAdminClient();
  const out: PlayerResult[] = [];
  for (let from = 0; from < 5000; from += 1000) {
    const { data } = await db
      .from("claimed_results")
      .select("event_id, placement, event_name, tournament, tournament_slug, entrants, start_at, game, doubles")
      .eq("user_id", userId)
      .order("start_at", { ascending: false, nullsFirst: false })
      .range(from, from + 999);
    const rows = (data ?? []) as Row[];
    for (const r of rows) {
      out.push({
        eventId: String(r.event_id),
        eventName: r.event_name,
        tournament: r.tournament,
        tournamentSlug: r.tournament_slug,
        entrants: r.entrants,
        startAt: r.start_at ? Math.floor(Date.parse(r.start_at) / 1000) : null,
        game: r.game as PlayerResult["game"],
        placement: r.placement,
        doubles: r.doubles,
      });
    }
    if (rows.length < 1000) break;
  }
  return out;
}

export type ImportState = { nextPage: number; totalPages: number | null; totalEvents: number | null; done: boolean; saved: number };

export async function getImportState(userId: string): Promise<ImportState | null> {
  const db = createAdminClient();
  const [{ data }, { count }] = await Promise.all([
    db.from("claimed_imports").select("next_page, total_pages, total_events, done_at").eq("user_id", userId).maybeSingle(),
    db.from("claimed_results").select("event_id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  if (!data) return null;
  return { nextPage: data.next_page, totalPages: data.total_pages, totalEvents: data.total_events, done: !!data.done_at, saved: count ?? 0 };
}

type RawEvent = {
  id: number; name: string; numEntrants: number | null; startAt: number | null; state: string | null;
  teamRosterSize: { maxPlayers: number | null } | null; videogame: { id: number | string } | null;
  tournament: { name: string; slug: string | null } | null; userEntrant: { standing: { placement: number | null } | null } | null;
};

/** One page of a start.gg account's events, as placements in Smashy's games (finished events only). */
async function readPage(startggUserId: string, page: number): Promise<{ results: PlayerResult[]; totalPages: number; total: number }> {
  const { user } = await startggQuery<{ user: { events: { pageInfo: { total: number; totalPages: number }; nodes: RawEvent[] | null } | null } | null }>(
    `query ClaimedHistory($u: ID!, $page: Int!, $per: Int!) { user(id: $u) { events(query: { page: $page, perPage: $per }) {
      pageInfo { total totalPages }
      nodes { id name numEntrants startAt state teamRosterSize { maxPlayers } videogame { id } tournament { name slug } userEntrant(userId: $u) { standing { placement } } }
    } } }`,
    { u: startggUserId, page, per: PAGE_SIZE },
  );
  const events = user?.events;
  const results = (events?.nodes ?? []).flatMap((e): PlayerResult[] => {
    const game = gameOfEvent(e);
    const placement = e.userEntrant?.standing?.placement;
    if (!game || !placement || e.state !== "COMPLETED") return [];
    return [{
      eventId: String(e.id),
      eventName: e.name,
      tournament: e.tournament?.name ?? "",
      tournamentSlug: e.tournament?.slug?.replace(/^tournament\//, "") ?? null,
      entrants: e.numEntrants ?? 0,
      startAt: e.startAt,
      game,
      placement,
      doubles: (e.teamRosterSize?.maxPlayers ?? 1) > 1,
    }];
  });
  return { results, totalPages: events?.pageInfo.totalPages ?? 0, total: events?.pageInfo.total ?? 0 };
}

/**
 * Bring in the next batch of a member's start.gg history (up to 200 events), carrying on where the
 * last batch stopped. Returns how far it got.
 */
export async function importBatch(userId: string, startggUserId: string): Promise<ImportState> {
  const db = createAdminClient();
  const { data: row } = await db.from("claimed_imports").select("next_page, total_pages, done_at").eq("user_id", userId).maybeSingle();
  let page = row?.next_page ?? 1;
  let totalPages: number | null = row?.total_pages ?? null;
  let totalEvents: number | null = null;
  if (!row) await db.from("claimed_imports").insert({ user_id: userId });
  for (let i = 0; i < PAGES_PER_BATCH && (totalPages === null || page <= totalPages); i++) {
    const { results, totalPages: tp, total } = await readPage(startggUserId, page);
    totalPages = tp;
    totalEvents = total;
    await saveResults(userId, results);
    page++;
    await db.from("claimed_imports").update({ next_page: page, total_pages: tp, total_events: total, updated_at: new Date().toISOString() }).eq("user_id", userId);
  }
  const done = totalPages !== null && page > totalPages;
  if (done) await db.from("claimed_imports").update({ done_at: new Date().toISOString() }).eq("user_id", userId);
  return (await getImportState(userId)) ?? { nextPage: page, totalPages, totalEvents, done, saved: 0 };
}
