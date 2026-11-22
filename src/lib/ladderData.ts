// The online ladder on the server: standings, someone's place in the queue or current match, and a
// match's page. The queue and matches are closed to members, so they're read here and a match is
// only ever shown to its two players. Names come through the viewer's own access, so people they
// can't see (a teen, for a guest) are left out. Server-only.
import "server-only";
import { avatarUrl } from "./avatarLinks";
import type { GameKey } from "./games";
import { rankStandings, type Standing } from "./ladder";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";

export type Person = { id: string; tag: string; handle: string; avatarUrl: string | null; region: string | null };
type ProfileRow = { id: string; tag: string; handle: string; avatar_path: string | null; region: string | null };

async function people(ids: string[]): Promise<Map<string, Person>> {
  const out = new Map<string, Person>();
  if (!ids.length) return out;
  const supabase = await createClient();
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await supabase.from("profiles").select("id, tag, handle, avatar_path, region").in("id", ids.slice(i, i + 200));
    for (const p of (data ?? []) as ProfileRow[]) out.set(p.id, { id: p.id, tag: p.tag, handle: p.handle, avatarUrl: avatarUrl(p.avatar_path), region: p.region });
  }
  return out;
}

export type StandingRow = Standing & { rank: number; person: Person };

/** A season's standings for a game (players with 3 or more matches), optionally only one region's players. */
export async function getStandings(season: string, game: GameKey, region: string | null): Promise<{ rows: StandingRow[]; players: number }> {
  const { data } = await createAdminClient()
    .from("ladder_ratings")
    .select("user_id, rating, wins, losses")
    .eq("season", season)
    .eq("game", game)
    .order("rating", { ascending: false })
    .limit(1000);
  const all = ((data ?? []) as { user_id: string; rating: number; wins: number; losses: number }[]).map((r) => ({ userId: r.user_id, rating: r.rating, wins: r.wins, losses: r.losses }));
  const who = await people(all.map((r) => r.userId));
  const seen = all.flatMap((r) => {
    const person = who.get(r.userId);
    return person && (!region || person.region === region) ? [{ ...r, person }] : [];
  });
  return { rows: rankStandings(seen), players: seen.length };
}

/** Someone's own standing this season in a game (shown even before their 3rd match). */
export async function getMyRating(season: string, game: GameKey, userId: string): Promise<{ rating: number; wins: number; losses: number } | null> {
  const { data } = await createAdminClient().from("ladder_ratings").select("rating, wins, losses").eq("season", season).eq("game", game).eq("user_id", userId).maybeSingle();
  return (data as { rating: number; wins: number; losses: number } | null) ?? null;
}

export type MatchStatus = "playing" | "reported" | "disputed" | "confirmed" | "cancelled" | "expired";
export type LadderMatch = {
  id: string;
  game: GameKey;
  season: string;
  status: MatchStatus;
  me: { person: Person; connect: string; score: number | null; change: number | null };
  opp: { person: Person; connect: string; score: number | null; change: number | null };
  reportedByMe: boolean;
  reportedAt: string | null;
  counted: boolean | null;
  createdAt: string;
};

type MatchRow = {
  id: string; game: GameKey; season: string; status: MatchStatus; p1: string; p2: string; p1_connect: string; p2_connect: string;
  p1_score: number | null; p2_score: number | null; reported_by: string | null; reported_at: string | null; counted: boolean | null;
  p1_change: number | null; p2_change: number | null; created_at: string;
};
const MATCH_COLS = "id, game, season, status, p1, p2, p1_connect, p2_connect, p1_score, p2_score, reported_by, reported_at, counted, p1_change, p2_change, created_at";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const unknown = (id: string): Person => ({ id, tag: "A player", handle: "", avatarUrl: null, region: null });

function fromRow(m: MatchRow, viewer: string, who: Map<string, Person>): LadderMatch {
  const mine = m.p1 === viewer ? 1 : 2;
  const side = (n: 1 | 2) => ({
    person: who.get(n === 1 ? m.p1 : m.p2) ?? unknown(n === 1 ? m.p1 : m.p2),
    connect: n === 1 ? m.p1_connect : m.p2_connect,
    score: n === 1 ? m.p1_score : m.p2_score,
    change: n === 1 ? m.p1_change : m.p2_change,
  });
  return {
    id: m.id,
    game: m.game,
    season: m.season,
    status: m.status,
    me: side(mine),
    opp: side(mine === 1 ? 2 : 1),
    reportedByMe: m.reported_by === viewer,
    reportedAt: m.reported_at,
    counted: m.counted,
    createdAt: m.created_at,
  };
}

/** A match, for one of its two players only (null for anyone else). */
export async function getMatch(id: string, viewer: string | null): Promise<LadderMatch | null> {
  if (!viewer || !UUID.test(id)) return null;
  const { data } = await createAdminClient().from("ladder_matches").select(MATCH_COLS).eq("id", id).maybeSingle();
  const m = data as MatchRow | null;
  if (!m || (m.p1 !== viewer && m.p2 !== viewer)) return null;
  return fromRow(m, viewer, await people([m.p1, m.p2]));
}

export type LadderState = { queue: { game: GameKey; connect: string; expiresAt: string } | null; activeMatchId: string | null; recent: LadderMatch[] };

/** Whether someone is waiting for a match, in one, and their last few matches. */
export async function getLadderState(userId: string): Promise<LadderState> {
  const db = createAdminClient();
  const [{ data: q }, { data: ms }] = await Promise.all([
    db.from("ladder_queue").select("game, connect_info, expires_at").eq("user_id", userId).gt("expires_at", new Date().toISOString()).maybeSingle(),
    db.from("ladder_matches").select(MATCH_COLS).or(`p1.eq.${userId},p2.eq.${userId}`).order("created_at", { ascending: false }).limit(10),
  ]);
  const rows = (ms ?? []) as MatchRow[];
  const active = rows.find((m) => m.status === "playing" || m.status === "reported" || m.status === "disputed");
  const who = await people([...new Set(rows.flatMap((m) => [m.p1, m.p2]))]);
  const queue = q as { game: GameKey; connect_info: string; expires_at: string } | null;
  return {
    queue: queue ? { game: queue.game, connect: queue.connect_info, expiresAt: queue.expires_at } : null,
    activeMatchId: active?.id ?? null,
    recent: rows.filter((m) => m !== active).map((m) => fromRow(m, userId, who)),
  };
}

/** How many are waiting for a match in each game right now (no names). */
export async function waitingCounts(): Promise<Partial<Record<GameKey, number>>> {
  const { data } = await createAdminClient().from("ladder_queue").select("game").gt("expires_at", new Date().toISOString()).limit(500);
  const out: Partial<Record<GameKey, number>> = {};
  for (const r of (data ?? []) as { game: GameKey }[]) out[r.game] = (out[r.game] ?? 0) + 1;
  return out;
}
