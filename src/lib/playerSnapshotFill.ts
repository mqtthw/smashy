// Filling saved copies for the players search engines are told about (round 801; the plan is
// docs/searchable-player-pages-plan.md). A copy used to be made only when someone opened the player's page,
// so on the day the pages opened to search 9 of 2,774 players had one, and a searcher's or crawler's first
// visit still waited on start.gg. This fills the rest in the background, as part of the Smash history fill
// chain (api/history-fill): a few players per run, only while the whole site is quiet on start.gg.
import "server-only";
import { searchablePlayerIds } from "./playerSearchable";
import { savePlayerSnapshot } from "./playerSnapshots";
import { getRecentSets } from "./playerStats";
import { getPlayerResults } from "./startggPlayers";
import { createAdminClient } from "./supabase/admin";

/** The fill only starts a player while the whole site has sent fewer than this many start.gg requests in the last minute (of 75; guests' lookups start under 36). */
export const FILL_SITE_PER_MINUTE = 28;
const WAIT_MS = 5_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The players still without a copy, in the order given. Exported for tests. */
export function playersToFill(listed: readonly string[], haveCopy: ReadonlySet<string>, max: number): string[] {
  return listed.filter((id) => !haveCopy.has(id)).slice(0, Math.max(0, max));
}

async function copiesSaved(): Promise<Set<string> | null> {
  const db = createAdminClient();
  const ids = new Set<string>();
  for (let from = 0; from < 100_000; from += 1000) {
    const { data, error } = await db.from("player_snapshots").select("player_id").order("player_id").range(from, from + 999);
    if (error) return null;
    for (const r of data ?? []) ids.add(String(r.player_id));
    if ((data ?? []).length < 1000) break;
  }
  return ids;
}

/** One slot from the site-wide count, granted only while the site is quiet. False: busy, or the count can't be asked. */
async function siteIsQuiet(): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc("take_startgg_slots", { want: 1, per_minute: FILL_SITE_PER_MINUTE }).abortSignal(AbortSignal.timeout(2_000));
  const row = (Array.isArray(data) ? data[0] : data) as { granted?: unknown } | null;
  return !error && typeof row?.granted === "number" && row.granted >= 1;
}

/**
 * Save copies for listed players that have none, until `until` (ms) or `max` players. A player start.gg
 * has nothing for still gets a (empty) copy, so they aren't asked about again on every run. A failed lookup
 * is left for a later run. Returns how many were saved and how many are still to do.
 */
export async function fillPlayerSnapshots(opts: { until: number; max?: number }): Promise<{ players: number; left: number }> {
  const [listed, have] = await Promise.all([searchablePlayerIds(), copiesSaved()]);
  if (listed.failed || !have) return { players: 0, left: -1 }; // who is hidden, or what's saved, couldn't be read: do nothing
  const todo = playersToFill(listed.ids, have, opts.max ?? 200);
  const left = listed.ids.filter((id) => !have.has(id)).length;
  let players = 0;
  let failures = 0;
  for (const playerId of todo) {
    // Wait for a quiet moment; give up when the run's time is nearly over.
    let quiet = false;
    while (Date.now() + WAIT_MS + 20_000 < opts.until && !(quiet = await siteIsQuiet().catch(() => false))) await sleep(WAIT_MS);
    if (!quiet) break;
    try {
      const [sets, results] = await Promise.all([getRecentSets(playerId), getPlayerResults(playerId)]);
      if (await savePlayerSnapshot({ playerId, sets, results, viewerSignedIn: false, hasCopy: true, allowEmpty: true })) players++;
      else if (++failures >= 5) break;
    } catch (e) {
      console.error(`Couldn't save a copy of player ${playerId}:`, e instanceof Error ? e.message : e);
      if (++failures >= 5) break; // start.gg is struggling: leave the rest for a later run
    }
  }
  return { players, left: left - players };
}
