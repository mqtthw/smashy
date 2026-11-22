// Smash history, step H2 (docs/archive-plan.md): one player across tags. Results added by hand name
// players without a start.gg id; an admin links a name ("Mango") to a start.gg player (Mang0, 1000), so
// careers and tallies count them as one person. Admin-confirmed only: nothing links by itself.
import "server-only";
import { connection } from "next/server";
import { isGameKey } from "./games";
import type { MajorEvent, Top8Row } from "./majorEvents";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";

/** A name as links compare it: lowercased, letters and digits only ("C9 | Mang0" → "c9mang0", "Dr. PeePee" → "drpeepee"). */
export function nameKey(name: string): string {
  return name.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

/**
 * Every link: name key → start.gg player id for a link that holds in every game, "game:key" for one that holds
 * in one game only (Smash 64's "Zero" isn't Smash 4's "ZeRo"). Read them with linkedId or linksForGame.
 */
export async function getNameLinks(): Promise<Map<string, string>> {
  const { data, error } = await (await createClient()).from("player_name_links").select("name_key, player_id, game").limit(5000);
  if (error) throw error;
  return new Map((data ?? []).map((r) => [linkKey(r.name_key as string, (r.game as string) || null), r.player_id as string]));
}

/** How a link is keyed in getNameLinks' map ("zero", or "smash64:zero"). Name keys have no ":". */
export const linkKey = (key: string, game: string | null) => (game ? `${game}:${key}` : key);

/** The player a name (key) is linked to in a game: that game's own link first, then one for every game. */
export function linkedId(links: Map<string, string>, game: string | null | undefined, key: string): string | undefined {
  return (game ? links.get(linkKey(key, game)) : undefined) ?? links.get(key);
}

/** The links that hold in one game, name key → player id (with no game: only the every-game ones). */
export function linksForGame(links: Map<string, string>, game: string | null): Map<string, string> {
  const out = new Map<string, string>();
  for (const [k, id] of links) if (!k.includes(":")) out.set(k, id);
  if (game) for (const [k, id] of links) if (k.startsWith(`${game}:`)) out.set(k.slice(game.length + 1), id);
  return out;
}

/** Gives placings without a player id the linked player's id (singles only; teams keep none). */
export function applyNameLinks(events: MajorEvent[], links: Map<string, string>): MajorEvent[] {
  if (!links.size) return events;
  return events.map((e) =>
    e.teams
      ? e
      : { ...e, top8: e.top8.map((r): Top8Row => (r.playerId ? r : { ...r, playerId: linkedId(links, e.game, nameKey(r.name)) ?? null })) },
  );
}

/** A start.gg player id from what an admin pasted: an id, a Smashy player page, or a start.gg player link with its id. */
export function readPlayerId(input: string): string | null {
  const s = input.trim();
  if (/^\d{1,12}$/.test(s)) return s;
  const m = s.match(/\/players\/(\d{1,12})(?:[/?#]|$)/) ?? s.match(/start\.gg\/.*?player\/(\d{1,12})/i);
  return m ? m[1] : null;
}

/**
 * `atMajor`: this player placed at a major under this exact name in a game the name played (a strong sign
 * it's the same person; Smash 4's "KEN" isn't Melee's "Ken", so other games don't count).
 * Otherwise they're only in start.gg's player index with that tag: often someone else (there are many
 * "Mango"s and "Ken"s), so an admin must check. `everyGame`: they placed at majors under it in every game the
 * name's hand-added results are in (a link counts for all games: "Zero" in Smash 64 and Brawl are two people).
 */
export type NameSuggestion = { playerId: string; tag: string; atMajor: boolean; everyGame?: boolean };
export type UnlinkedName = { key: string; name: string; placings: number; games: string[]; suggestions: NameSuggestion[] };

/**
 * Admin: names in results added by hand that aren't linked yet (most placings first), with players they
 * might be: the same name already seen with a start.gg id in saved results, or in start.gg's player index.
 */
export async function getUnlinkedNames(): Promise<UnlinkedName[]> {
  await connection();
  const db = createAdminClient();
  const [{ data: events, error }, links] = await Promise.all([
    db.from("major_events").select("game, teams, top8").eq("teams", false).limit(20000),
    db.from("player_name_links").select("name_key, game"),
  ]);
  if (error) throw error;
  const linked = new Set((links.data ?? []).map((r) => linkKey(r.name_key as string, (r.game as string) || null)));
  const unlinked = new Map<string, { name: string; placings: number; games: Set<string> }>();
  const seen = new Map<string, Map<string, NameSuggestion & { games: Set<string> }>>(); // key -> player id -> suggestion
  for (const e of events ?? []) {
    for (const r of (e.top8 as Top8Row[]) ?? []) {
      const key = nameKey(r.name);
      if (!key) continue;
      if (r.playerId) {
        const ids = seen.get(key) ?? new Map<string, NameSuggestion & { games: Set<string> }>();
        const had = ids.get(r.playerId) ?? { playerId: r.playerId, tag: r.name, atMajor: true, games: new Set<string>() };
        had.games.add(e.game as string);
        ids.set(r.playerId, had);
        seen.set(key, ids);
      } else if (!linked.has(key) && !linked.has(linkKey(key, e.game as string))) {
        const u = unlinked.get(key) ?? { name: r.name, placings: 0, games: new Set<string>() };
        u.placings++;
        u.games.add(e.game as string);
        unlinked.set(key, u);
      }
    }
  }
  // start.gg's player index: the same tag, any capitals (exact spellings only; "Mango" won't find "Mang0").
  const names = [...unlinked.values()].map((u) => u.name);
  for (let i = 0; i < names.length; i += 200) {
    const { data } = await db.from("startgg_players").select("player_id, tag").in("tag", names.slice(i, i + 200)).eq("hidden", false).limit(1000);
    for (const p of data ?? []) {
      const key = nameKey(p.tag as string);
      const ids = seen.get(key) ?? new Map<string, NameSuggestion & { games: Set<string> }>();
      if (!ids.has(String(p.player_id))) ids.set(String(p.player_id), { playerId: String(p.player_id), tag: p.tag as string, atMajor: false, games: new Set() });
      seen.set(key, ids);
    }
  }
  return [...unlinked.entries()]
    .map(([key, u]) => ({
      key,
      name: u.name,
      placings: u.placings,
      games: [...u.games],
      // Seen at a major only counts in a game this name played; players seen at majors first.
      suggestions: [...(seen.get(key)?.values() ?? [])]
        .map(({ games, ...s }) => ({ ...s, atMajor: s.atMajor && [...games].some((g) => u.games.has(g)), everyGame: s.atMajor && [...u.games].every((g) => games.has(g)) }))
        .sort((a, b) => Number(b.atMajor) - Number(a.atMajor)),
    }))
    .sort((a, b) => b.placings - a.placings || a.name.localeCompare(b.name));
}

/** Admin: link a name to a start.gg player, in every game or in one (replaces an earlier link of the same name there). */
export async function linkName(name: string, playerId: string, adminId: string, game: string | null = null): Promise<{ ok?: boolean; error?: string }> {
  const key = nameKey(name);
  if (!key || !/^\d{1,12}$/.test(playerId)) return { error: "Give a name and a start.gg player id." };
  if (game && !isGameKey(game)) return { error: "Pick a game, or every game." };
  const { error } = await createAdminClient()
    .from("player_name_links")
    .upsert({ name_key: key, game: game ?? "", name: name.trim().slice(0, 60), player_id: playerId, added_by: adminId, created_at: new Date().toISOString() }, { onConflict: "name_key,game" });
  return error ? { error: "Couldn't save the link." } : { ok: true };
}

/**
 * The names "Link all" may link: exactly one player placed at a major under that exact name, in every game the
 * name was added by hand for, and the player index has no other player with it. Index-only matches are never
 * linked in bulk; a name that also shows in another game (Mew2King in Brawl) is left for an admin to check.
 */
export function safeToBulkLink(n: UnlinkedName): boolean {
  const atMajor = n.suggestions.filter((s) => s.atMajor);
  return atMajor.length === 1 && n.suggestions.length === 1 && atMajor[0].everyGame === true;
}

/** Admin: link every name that's safe to link in bulk (see safeToBulkLink; still the admin's click). */
export async function linkAllExact(adminId: string): Promise<number> {
  const names = await getUnlinkedNames();
  const rows = names
    .filter(safeToBulkLink)
    .map((n) => ({ name_key: n.key, name: n.name.slice(0, 60), player_id: n.suggestions[0].playerId, added_by: adminId }));
  if (!rows.length) return 0;
  const { error } = await createAdminClient().from("player_name_links").upsert(rows.map((r) => ({ ...r, game: "" })), { onConflict: "name_key,game" });
  if (error) throw error;
  return rows.length;
}

/** Admin: remove a link (its key as listNameLinks gives it: "zero", or "smash64:zero"). */
export async function unlinkName(key: string) {
  const i = key.indexOf(":");
  const [game, nk] = i > 0 ? [key.slice(0, i), key.slice(i + 1)] : ["", key];
  const { error } = await createAdminClient().from("player_name_links").delete().eq("name_key", nk).eq("game", game);
  if (error) throw error;
}

/** Admin: the links made so far, newest first, with each player's current tag where Smashy knows it. */
export async function listNameLinks(): Promise<{ key: string; name: string; playerId: string; tag: string | null; game: string | null }[]> {
  await connection();
  const db = createAdminClient();
  const { data, error } = await db.from("player_name_links").select("name_key, name, player_id, game").order("created_at", { ascending: false }).limit(500);
  if (error) throw error;
  const ids = [...new Set((data ?? []).map((r) => r.player_id as string))];
  const { data: players } = ids.length ? await db.from("startgg_players").select("player_id, tag").in("player_id", ids) : { data: [] };
  const tags = new Map((players ?? []).map((p) => [String(p.player_id), p.tag as string]));
  return (data ?? []).map((r) => ({
    key: linkKey(r.name_key as string, (r.game as string) || null),
    name: r.name as string,
    playerId: r.player_id as string,
    tag: tags.get(r.player_id as string) ?? null,
    game: (r.game as string) || null,
  }));
}
