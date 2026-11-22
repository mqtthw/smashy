// Finding start.gg players by tag: the parts with no network in them, so they can be tested.
// start.gg has no player search of its own. It can search the sign-up list of one tournament,
// so Smashy looks through recent tournaments (see startggPlayers.ts) and merges what it finds here.

/** A player found by tag: where they were seen last, and in how many of the searched tournaments. */
export type PlayerHit = { playerId: string; tag: string; prefix: string | null; seenAt: string; count: number };
/** One sign-up that matched, as it comes back from one tournament. */
export type PlayerMatch = { playerId: string; tag: string; prefix: string | null; tournament: string };

/** A player as Smashy saw them on start.gg: what the saved list (startgg_players) keeps. */
export type SeenPlayer = { playerId: string; tag: string; prefix: string | null };

/**
 * Rows for the saved list: one per player, real ids only, tags and sponsors cut to what the table
 * allows. Pass players newest first: when one shows up twice (two tournaments, two sponsors) the
 * first is kept. `seenAt` is the time to store as "last seen".
 */
export function playerRows(players: SeenPlayer[], seenAt: string): { player_id: number; tag: string; prefix: string | null; last_seen_at: string }[] {
  const rows = new Map<string, { player_id: number; tag: string; prefix: string | null; last_seen_at: string }>();
  for (const p of players) {
    const tag = p.tag?.trim().slice(0, 100);
    if (!tag || !/^\d{1,12}$/.test(p.playerId) || rows.has(p.playerId)) continue;
    rows.set(p.playerId, { player_id: Number(p.playerId), tag, prefix: p.prefix?.trim().slice(0, 100) || null, last_seen_at: seenAt });
  }
  return [...rows.values()];
}

/**
 * Search results from the two places a tag is looked for: start.gg's recent tournaments (`live`,
 * already ranked, with where each player was seen) and Smashy's saved list (`saved`). A player in
 * both is listed once, with the tournament. Ordered like rankPlayerHits.
 */
export function mergePlayerHits(q: string, live: PlayerHit[], saved: SeenPlayer[], limit = 15): PlayerHit[] {
  const want = q.trim().toLowerCase();
  const byPlayer = new Map<string, PlayerHit>(live.map((h) => [h.playerId, h]));
  for (const s of saved) if (!byPlayer.has(s.playerId)) byPlayer.set(s.playerId, { playerId: s.playerId, tag: s.tag, prefix: s.prefix, seenAt: "", count: 0 });
  const rank = (h: PlayerHit) => {
    const tag = h.tag.toLowerCase();
    return tag === want ? 0 : tag.startsWith(want) ? 1 : 2;
  };
  return [...byPlayer.values()].sort((a, b) => rank(a) - rank(b) || b.count - a.count || a.tag.length - b.tag.length || a.tag.localeCompare(b.tag)).slice(0, limit);
}

/** The tag to search for: trimmed, at most 30 characters. Null when it's too short to search. */
export function cleanPlayerQuery(q: string): string | null {
  const s = q.trim().replace(/\s+/g, " ").slice(0, 30);
  return s.length >= 2 ? s : null;
}

/** "start.gg/user/3f297e74" (or "user/3f297e74") -> "user/3f297e74": a start.gg profile link finds that player exactly. */
export function startggProfileSlug(q: string): string | null {
  const m = q.trim().match(/(?:^|start\.gg\/|\/)user\/([0-9a-f]{6,12})(?:[/?#\s]|$)/i);
  return m ? `user/${m[1].toLowerCase()}` : null;
}

/**
 * Which player an admin means (Admin > People): a Smashy player page link ("/players/222927"), a
 * bare start.gg player id, or a start.gg profile link. Null when it's none of those.
 */
export function playerRef(text: string): { id: string } | { slug: string } | null {
  const t = text.trim();
  const slug = startggProfileSlug(t);
  if (slug) return { slug };
  const id = t.match(/(?:^|\/players\/)(\d{1,12})(?:[/?#]|$)/)?.[1];
  return id ? { id } : null;
}

/**
 * One row per player, best match first: the exact tag, then tags that start with what was typed,
 * then whoever was in the most of the searched tournaments. `matches` come newest tournament first,
 * so a player's tag and sponsor are their latest.
 */
export function rankPlayerHits(q: string, matches: PlayerMatch[], limit = 12): PlayerHit[] {
  const want = q.trim().toLowerCase();
  const byPlayer = new Map<string, PlayerHit>();
  for (const m of matches) {
    const hit = byPlayer.get(m.playerId);
    if (hit) hit.count++;
    else byPlayer.set(m.playerId, { playerId: m.playerId, tag: m.tag, prefix: m.prefix || null, seenAt: m.tournament, count: 1 });
  }
  const rank = (h: PlayerHit) => {
    const tag = h.tag.toLowerCase();
    return tag === want ? 0 : tag.startsWith(want) ? 1 : 2;
  };
  return [...byPlayer.values()].sort((a, b) => rank(a) - rank(b) || b.count - a.count || a.tag.length - b.tag.length || a.tag.localeCompare(b.tag)).slice(0, limit);
}
