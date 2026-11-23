// The VOD library: reading the video links added to sets, and working out what a set is when a
// link is added (players, tournament, round) so the list can be searched. Server-only.
import "server-only";
import { getSet } from "./brackets";
import { bracketPlayers, loadEngineSets, toBracket } from "./hostedBracket";
import { getHostedEvent } from "./hostedEvents";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";
import { createGuestClient } from "./supabase/guest";
import { vodSearchPattern, type VodSource } from "./vods";

export type Vod = {
  id: string;
  source: VodSource;
  setId: string;
  url: string;
  game: string | null;
  p1Tag: string | null;
  p2Tag: string | null;
  tournament: string | null;
  round: string | null;
  playedAt: string | null;
  createdAt: string;
};

const FIELDS = "id, source, set_id, url, game, p1_tag, p2_tag, tournament, round, played_at, created_at, hosted_event_id, event:hosted_events ( removed_at )";
type Row = { id: string; source: VodSource; set_id: string; url: string; game: string | null; p1_tag: string | null; p2_tag: string | null; tournament: string | null; round: string | null; played_at: string | null; created_at: string; event: { removed_at: string | null } | null };

const toVod = (r: Row): Vod => ({ id: r.id, source: r.source, setId: r.set_id, url: r.url, game: r.game, p1Tag: r.p1_tag, p2Tag: r.p2_tag, tournament: r.tournament, round: r.round, playedAt: r.played_at, createdAt: r.created_at });
// A VOD of a set in an event moderators hid is hidden with it.
const shown = (r: Row) => !r.event?.removed_at;

/** The VODs of one set, oldest first (the first one added plays at the top). */
export async function getSetVods(source: VodSource, setId: string): Promise<Vod[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("set_vods").select(FIELDS).eq("source", source).eq("set_id", setId).order("created_at").limit(20);
  return ((data ?? []) as unknown as Row[]).filter(shown).map(toVod);
}

/** Of these VODs, the ones this person added (they can remove those). */
export async function vodsAddedBy(ids: string[], userId: string | null): Promise<Set<string>> {
  if (!userId || !ids.length) return new Set();
  const { data } = await createAdminClient().from("set_vods").select("id").in("id", ids).eq("added_by", userId);
  return new Set(((data ?? []) as { id: string }[]).map((r) => r.id));
}

/**
 * The list at /vods: newest first, optionally only one game, optionally matching a player's or
 * tournament's name. `before` = the created time of the last one shown, for the next page.
 */
export async function listVods(opts: { q?: string; game?: string | null; before?: string | null; limit?: number }): Promise<Vod[]> {
  const supabase = await createClient();
  const limit = opts.limit ?? 30;
  const pattern = opts.q ? vodSearchPattern(opts.q) : null;
  const base = () => {
    let query = supabase.from("set_vods").select(FIELDS).order("created_at", { ascending: false }).limit(limit + 10);
    if (opts.game) query = query.eq("game", opts.game);
    if (opts.before) query = query.lt("created_at", opts.before);
    return query;
  };
  let rows: Row[];
  if (pattern) {
    // A name in either player's tag, or the tournament's: three simple matches, merged.
    const parts = await Promise.all([base().ilike("p1_tag", pattern), base().ilike("p2_tag", pattern), base().ilike("tournament", pattern)]);
    const byId = new Map<string, Row>();
    for (const p of parts) for (const r of (p.data ?? []) as unknown as Row[]) byId.set(r.id, r);
    rows = [...byId.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
  } else {
    rows = ((await base()).data ?? []) as unknown as Row[];
  }
  return rows.filter(shown).slice(0, limit).map(toVod);
}

export type VodSet = {
  source: VodSource;
  setId: string;
  hostedEventId: string | null;
  game: string | null;
  p1Tag: string | null;
  p2Tag: string | null;
  p1Player: string | null;
  p2Player: string | null;
  tournament: string | null;
  round: string | null;
  playedAt: string | null;
};

/**
 * What a set is, for a VOD added to it, or null if there's no such set. Names are as anyone can see
 * them: on Smashy, a player hidden from guests (a teen) is saved as "Player".
 */
export async function describeSet(source: VodSource, setId: string): Promise<VodSet | null> {
  if (source === "smashy") {
    if (!/^[0-9a-f-]{36}$/i.test(setId)) return null;
    const db = createAdminClient();
    const { data: row } = await db.from("hosted_sets").select("event_id").eq("id", setId).maybeSingle();
    if (!row) return null;
    const guest = createGuestClient();
    const event = await getHostedEvent(row.event_id as string, guest);
    if (!event || event.removed) return null;
    const [sets, players] = await Promise.all([loadEngineSets(event.id, db), bracketPlayers(event.id, guest)]);
    const set = sets.find((s) => s.key === setId);
    if (!set) return null;
    const round = toBracket(event, sets, players, set.pool).rounds.flatMap((r) => r.sets).find((s) => s.id === setId)?.roundLabel ?? null;
    const tag = (pid: string | null) => (pid ? (players.get(pid)?.tag ?? "Player") : null);
    return {
      source,
      setId,
      hostedEventId: event.id,
      game: event.game,
      p1Tag: tag(set.p[0].id),
      p2Tag: tag(set.p[1].id),
      // The entry id is the member's account id. It's saved only for players a guest can see (round 738):
      // a teen's tag was already saved as "Player", but the id beside it still said which account it was.
      // (A player whose profile a guest can't read comes back with no handle; walk-ins have none either,
      // and their ids aren't needed.)
      p1Player: set.p[0].id && players.get(set.p[0].id)?.handle ? set.p[0].id : null,
      p2Player: set.p[1].id && players.get(set.p[1].id)?.handle ? set.p[1].id : null,
      tournament: event.name,
      round,
      playedAt: event.startsAt,
    };
  }
  const set = await getSet(source, setId).catch(() => null);
  if (!set) return null;
  const [a, b] = [set.players[0], set.players[1]];
  return {
    source,
    setId,
    hostedEventId: null,
    game: set.event.game ?? null,
    p1Tag: a?.name ?? null,
    p2Tag: b?.name ?? null,
    p1Player: a?.playerId ?? null,
    p2Player: b?.playerId ?? null,
    tournament: set.event.tournamentName,
    round: set.roundLabel,
    playedAt: set.completedAt ? new Date(set.completedAt * 1000).toISOString() : null,
  };
}
