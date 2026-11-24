// Which player pages search engines are told about (docs/searchable-player-pages-plan.md, step S5):
// players with a top 8 at a major in Smash history (Matthew's choice, 2026-11-24), minus anyone who asked
// not to be listed and members who hide their stats. Everything here reads Smashy's own tables; start.gg
// isn't asked.
import "server-only";
import { cacheLife } from "next/cache";
import { getSavedPlayer } from "./playerIndex";
import { hasMajorTop8 } from "./playerSnapshots";
import { playersHidingStats } from "./playerStats";
import { createAdminClient } from "./supabase/admin";

/**
 * What a player page's title and "index me" mark need: the saved tag, and whether they have a top 8 at a
 * major. Null when Smashy hasn't saved them, or they asked not to be listed. Kept for an hour and shared by
 * every server (the page still checks who may be shown on every visit; this is only the tag and the mark).
 */
export async function playerSearchFacts(playerId: string): Promise<{ tag: string; prefix: string | null; top8: boolean } | null> {
  "use cache: remote";
  if (!/^\d{1,12}$/.test(playerId)) return null;
  const saved = await getSavedPlayer(playerId);
  if (!saved) {
    cacheLife("minutes");
    return null;
  }
  cacheLife("hours");
  return { tag: saved.tag, prefix: saved.prefix, top8: await hasMajorTop8(playerId) };
}

/** The player ids in a page of saved top 8s (singles rows only carry one). Exported for tests. */
export function top8PlayerIds(rows: { top8: unknown }[]): string[] {
  const ids = new Set<string>();
  for (const row of rows) {
    for (const r of Array.isArray(row.top8) ? row.top8 : []) {
      const id = (r as { playerId?: unknown } | null)?.playerId;
      if (typeof id === "string" && /^\d{1,12}$/.test(id)) ids.add(id);
    }
  }
  return [...ids];
}

/**
 * Every player the site map lists: a top 8 (singles) at a major that isn't hidden, and allowed to be shown.
 * `failed`: a read failed. If who is hidden can't be read, nobody is listed.
 */
export async function searchablePlayerIds(): Promise<{ ids: string[]; failed: boolean }> {
  const db = createAdminClient();
  const ids = new Set<string>();
  let failed = false;
  for (let from = 0; from < 20_000; from += 1000) {
    const { data, error } = await db
      .from("major_events")
      .select("top8, major:majors!inner ( hidden )")
      .eq("teams", false)
      .eq("major.hidden", false)
      .order("event_id")
      .range(from, from + 999);
    if (error) {
      failed = true;
      break;
    }
    for (const id of top8PlayerIds(data ?? [])) ids.add(id);
    if ((data ?? []).length < 1000) break;
  }
  try {
    const [{ data: hidden, error: hiddenError }, { data: links, error: linksError }] = await Promise.all([
      db.from("startgg_players").select("player_id").eq("hidden", true).limit(10_000),
      db.from("startgg_links").select("startgg_player_id").limit(10_000),
    ]);
    if (hiddenError || linksError) throw hiddenError ?? linksError;
    for (const h of hidden ?? []) ids.delete(String(h.player_id));
    for (const id of await playersHidingStats((links ?? []).map((l) => String(l.startgg_player_id)))) ids.delete(id);
  } catch {
    return { ids: [], failed: true };
  }
  return { ids: [...ids], failed };
}
