// Saved copies of a player's start.gg lookup (docs/searchable-player-pages-plan.md, step S1; the
// player_snapshots table). A player page's sets and placements were only kept in memory for a few hours, so
// every bot visit to a new player cost start.gg requests. Saved here, a later step can show guests the copy.
//
// What gets saved is bounded on purpose (the database's free plan holds 500 MB, and one player's copy is
// around 40 KB before compression): only lookups made for a signed-in member, or of a player with a top 8 at
// a major (about 2,800 people: the ones the plan opens to search first). A bot walking unknown players
// saves nothing.
// Server-only: the table can't be reached through the public API, because who may be shown is decided by
// the page (players who asked not to be listed, members who hide their stats).
import "server-only";
import type { PlayerResult } from "./playerResults";
import type { PlayerSet } from "./playerStats";
import { createAdminClient } from "./supabase/admin";
import type { Json } from "./supabase/database.types";

export const SNAPSHOT_SETS = 105; // what one lookup reads (7 pages of 15)
export const SNAPSHOT_RESULTS = 20;
/** The same player isn't written again by this server for this long: the lookup itself is kept for hours. */
export const SNAPSHOT_EVERY_MS = 6 * 3600_000;

/** A saved copy older than this is refreshed in the background when a guest opens the page (step S2). */
export const SNAPSHOT_FRESH_MS = 24 * 3600_000;

/**
 * Whether a lookup's answer is kept: asked for by a member, or of a player with a top 8 at a major, or
 * (`hasCopy`) a refresh of a copy that's already there, which adds no row.
 */
export const snapshotWorthSaving = (viewerSignedIn: boolean, hasMajorTop8: boolean, hasCopy = false) => viewerSignedIn || hasMajorTop8 || hasCopy;

/** Whether a saved copy is due a refresh. */
export const snapshotStale = (savedAt: string, now: number) => now - Date.parse(savedAt) > SNAPSHOT_FRESH_MS;

/** The row to save: valid id, lists cut to size. Null when there's nothing worth a row. */
export function snapshotRow(playerId: string, sets: PlayerSet[], results: PlayerResult[], savedAt: string, allowEmpty = false) {
  if (!/^\d{1,12}$/.test(playerId)) return null;
  if (!sets.length && !results.length && !allowEmpty) return null; // an empty answer would replace a good copy (the background fill allows it: there is no copy yet)
  return { player_id: Number(playerId), sets: sets.slice(0, SNAPSHOT_SETS), results: results.slice(0, SNAPSHOT_RESULTS), saved_at: savedAt };
}

const savedLately = new Map<string, number>();

/** For tests: forget what this server saved. */
export function resetSnapshotMemory() {
  savedLately.clear();
}

/** True once per player per SNAPSHOT_EVERY_MS on this server (and marks it taken). */
export function snapshotDue(playerId: string, now: number): boolean {
  const last = savedLately.get(playerId);
  if (last !== undefined && now - last < SNAPSHOT_EVERY_MS) return false;
  if (savedLately.size > 20_000) savedLately.clear();
  savedLately.set(playerId, now);
  return true;
}

/** Whether the player has a top 8 at a major Smash history has saved (singles). A failed read: false. */
export async function hasMajorTop8(playerId: string): Promise<boolean> {
  const { count, error } = await createAdminClient({ forPage: true })
    .from("major_events")
    .select("event_id", { count: "exact", head: true })
    .contains("top8", JSON.stringify([{ playerId }]));
  return !error && (count ?? 0) > 0;
}

/**
 * Keep a lookup's answer. Meant for `after()`: it never throws, and a failure only costs the copy.
 * Answers whether a copy was written.
 * `sets` are the raw sets (who hides their stats is applied when the copy is shown, not here).
 */
export async function savePlayerSnapshot(opts: { playerId: string; sets: PlayerSet[]; results: PlayerResult[]; viewerSignedIn: boolean; hasCopy?: boolean; allowEmpty?: boolean }): Promise<boolean> {
  try {
    const now = Date.now();
    const row = snapshotRow(opts.playerId, opts.sets, opts.results, new Date(now).toISOString(), opts.allowEmpty);
    if (!row || !snapshotDue(opts.playerId, now)) return false;
    if (!snapshotWorthSaving(opts.viewerSignedIn, opts.viewerSignedIn || !!opts.hasCopy || (await hasMajorTop8(opts.playerId)), opts.hasCopy)) return false;
    const { error } = await createAdminClient().from("player_snapshots").upsert({ ...row, sets: row.sets as unknown as Json, results: row.results as unknown as Json }, { onConflict: "player_id" });
    if (error) throw new Error(error.message);
    return true;
  } catch (e) {
    console.error("Saving a player's snapshot failed", e instanceof Error ? e.message : e);
    return false;
  }
}

export type PlayerSnapshot = { sets: PlayerSet[]; results: PlayerResult[]; savedAt: string };

/**
 * A player's saved copy (step S2), or null when there's none. The sets are as start.gg gave them: the
 * page still has to leave out opponents who hide their stats (hideHiddenOpponents) before showing them.
 */
export async function getPlayerSnapshot(playerId: string): Promise<PlayerSnapshot | null> {
  if (!/^\d{1,12}$/.test(playerId)) return null;
  const { data, error } = await createAdminClient({ forPage: true }).from("player_snapshots").select("sets, results, saved_at").eq("player_id", Number(playerId)).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const list = <T,>(v: unknown) => (Array.isArray(v) ? (v as T[]) : []);
  return { sets: list<PlayerSet>(data.sets), results: list<PlayerResult>(data.results), savedAt: data.saved_at };
}
