// Smashy's saved list of start.gg players (the startgg_players table): who it has seen, so player
// search can find them by tag, and who asked not to be listed (`hidden`).
// Server-only: the table can't be reached through the public API.
import "server-only";
import { playerRows, type SeenPlayer } from "./playerSearch";
import { createAdminClient } from "./supabase/admin";
import { big, bigs } from "@/lib/supabase/loose";

const TABLE = "startgg_players";
const QUICK = () => AbortSignal.timeout(4_000); // a slow database must not hold up the page that saw the players

// What this server saved lately (player id -> tag and sponsor, and when), so the same players
// aren't written again on every load: a live set page re-reads start.gg every 30 seconds.
const SAVED_FOR_MS = 6 * 3600_000;
const savedLately = new Map<number, { what: string; at: number }>();

/**
 * Save players Smashy just read from start.gg (their tag and sponsor may have changed since last
 * time). Never fails: saving is a bonus, and the page that saw them must still load.
 */
export async function rememberPlayers(players: SeenPlayer[]): Promise<void> {
  const now = Date.now();
  const what = (r: { tag: string; prefix: string | null }) => `${r.prefix ?? ""}|${r.tag}`;
  const rows = playerRows(players, new Date(now).toISOString()).filter((r) => {
    const last = savedLately.get(r.player_id);
    return !last || last.what !== what(r) || now - last.at > SAVED_FOR_MS;
  });
  if (!rows.length) return;
  try {
    const db = createAdminClient();
    for (let i = 0; i < rows.length; i += 500) {
      // `hidden` and `first_seen_at` aren't sent, so they keep their values for players already saved.
      const { error } = await db.from(TABLE).upsert(rows.slice(i, i + 500), { onConflict: "player_id" }).abortSignal(QUICK());
      if (error) throw error;
    }
    if (savedLately.size > 20_000) savedLately.clear();
    for (const r of rows) savedLately.set(r.player_id, { what: what(r), at: now });
  } catch (e) {
    console.error("Saving start.gg players failed", e);
  }
}

type Row = { player_id: number | string; tag: string; prefix: string | null };
const toSeen = (r: Row): SeenPlayer => ({ playerId: String(r.player_id), tag: r.tag, prefix: r.prefix });

/**
 * One saved player's tag and sponsor (round 733): what a player page shows when start.gg is too busy
 * to ask. Null when Smashy hasn't seen them, or they asked not to be listed.
 */
export async function getSavedPlayer(playerId: string): Promise<{ playerId: string; tag: string; prefix: string | null } | null> {
  if (!/^\d{1,12}$/.test(playerId)) return null;
  const { data, error } = await createAdminClient({ forPage: true }).from(TABLE).select("tag, prefix, hidden").eq("player_id", big(playerId)).maybeSingle();
  if (error) throw error;
  return data && !data.hidden ? { playerId, tag: data.tag, prefix: data.prefix } : null;
}

/** Saved players whose tag contains `q` (any capitals), hidden ones left out: exact tags, then the most recently seen. */
export async function searchSavedPlayers(q: string, limit = 30): Promise<SeenPlayer[]> {
  const needle = q.trim();
  if (needle.length < 2) return [];
  const pattern = needle.replace(/[\\%_]/g, (c) => `\\${c}`); // typed % and _ are ordinary characters
  const db = createAdminClient();
  const [exact, contains] = await Promise.all([
    db.from(TABLE).select("player_id, tag, prefix").eq("hidden", false).ilike("tag", pattern).limit(10).abortSignal(QUICK()),
    db.from(TABLE).select("player_id, tag, prefix").eq("hidden", false).ilike("tag", `%${pattern}%`).order("last_seen_at", { ascending: false }).limit(limit).abortSignal(QUICK()),
  ]);
  if (exact.error) throw exact.error;
  if (contains.error) throw contains.error;
  const seen = new Map<string, SeenPlayer>();
  for (const r of [...(exact.data as Row[]), ...(contains.data as Row[])]) seen.set(String(r.player_id), toSeen(r));
  return [...seen.values()];
}

/** Of these players, the ones who asked not to be listed. Fails (rather than answer "none") if the database can't be asked. */
export async function hiddenPlayers(playerIds: string[]): Promise<Set<string>> {
  const ids = [...new Set(playerIds.filter((id) => /^\d{1,12}$/.test(id)))];
  if (!ids.length) return new Set();
  const { data, error } = await createAdminClient().from(TABLE).select("player_id").eq("hidden", true).in("player_id", bigs(ids));
  if (error) throw error;
  return new Set((data as { player_id: number | string }[]).map((r) => String(r.player_id)));
}

/** Every hidden player, newest first (Admin > People). */
export async function getHiddenPlayers(): Promise<(SeenPlayer & { since: string })[]> {
  const { data, error } = await createAdminClient().from(TABLE).select("player_id, tag, prefix, last_seen_at").eq("hidden", true).order("last_seen_at", { ascending: false }).limit(200);
  if (error) throw error;
  return (data as (Row & { last_seen_at: string })[]).map((r) => ({ ...toSeen(r), since: r.last_seen_at }));
}

/** Hide a player from lookup, or list them again. `player` is needed to hide someone who isn't saved yet. */
export async function setPlayerHidden(playerId: string, hidden: boolean, player?: SeenPlayer | null): Promise<boolean> {
  if (!/^\d{1,12}$/.test(playerId)) return false;
  const db = createAdminClient();
  const now = new Date().toISOString();
  if (hidden && player) {
    const [row] = playerRows([{ ...player, playerId }], now);
    if (!row) return false;
    const { error } = await db.from(TABLE).upsert({ ...row, hidden: true }, { onConflict: "player_id" });
    if (error) throw error;
    return true;
  }
  const { data, error } = await db.from(TABLE).update({ hidden, last_seen_at: now }).eq("player_id", big(playerId)).select("player_id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}
