// Leagues (docs/leagues-plan.md): weeks of sets in divisions, then playoffs. Step L1: the league and
// its sign-ups. Read as the viewer, so a hidden league only shows to its organizer.
import "server-only";
import { avatarUrl } from "./avatarLinks";
import type { GameKey } from "./games";
import { createClient } from "./supabase/server";

export type LeagueStatus = "signups" | "running" | "playoffs" | "completed" | "canceled";

export type League = {
  id: string;
  hostId: string;
  host: { tag: string; handle: string; avatarUrl: string | null } | null;
  name: string;
  game: GameKey;
  online: boolean;
  location: string | null;
  region: string | null;
  timezone: string;
  startsAt: string;
  weeks: number;
  bestOf: number;
  playoffSize: number | null;
  playerCap: number;
  description: string | null;
  status: LeagueStatus;
  removed: boolean;
  playerCount: number;
};

export type LeaguePlayer = { userId: string; tag: string; handle: string; avatarUrl: string | null; division: number | null; seed: number | null; joinedAt: string };

const FIELDS = `id, host_id, name, game, online, location, region, timezone, starts_at, weeks, best_of, playoff_size, player_cap, description, status, removed_at,
  host:profiles!leagues_host_id_fkey ( tag, handle, avatar_path ),
  players:league_players ( count )`;

type Row = {
  id: string; host_id: string; name: string; game: GameKey; online: boolean; location: string | null; region: string | null; timezone: string;
  starts_at: string; weeks: number; best_of: number; playoff_size: number | null; player_cap: number; description: string | null; status: LeagueStatus;
  removed_at: string | null; host: { tag: string; handle: string; avatar_path: string | null } | null; players: { count: number }[];
};

const toLeague = (r: Row): League => ({
  id: r.id,
  hostId: r.host_id,
  host: r.host ? { tag: r.host.tag, handle: r.host.handle, avatarUrl: avatarUrl(r.host.avatar_path) } : null,
  name: r.name,
  game: r.game,
  online: r.online,
  location: r.location,
  region: r.region,
  timezone: r.timezone,
  startsAt: r.starts_at,
  weeks: r.weeks,
  bestOf: r.best_of,
  playoffSize: r.playoff_size,
  playerCap: r.player_cap,
  description: r.description,
  status: r.status,
  removed: !!r.removed_at,
  playerCount: r.players?.[0]?.count ?? 0,
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getLeague(id: string): Promise<League | null> {
  if (!UUID.test(id)) return null;
  const { data } = await (await createClient()).from("leagues").select(FIELDS).eq("id", id).maybeSingle();
  return data ? toLeague(data as unknown as Row) : null;
}

/** Leagues taking sign-ups or being played, newest first (finished ones from the last 60 days too). */
export async function listLeagues(game: GameKey | null): Promise<League[]> {
  let q = (await createClient())
    .from("leagues")
    .select(FIELDS)
    .is("removed_at", null)
    .neq("status", "canceled")
    .gt("starts_at", new Date(Date.now() - 200 * 86400_000).toISOString())
    .order("starts_at", { ascending: false })
    .limit(50);
  if (game) q = q.eq("game", game);
  const { data } = await q;
  return ((data ?? []) as unknown as Row[]).map(toLeague);
}

export async function getLeaguePlayers(leagueId: string): Promise<LeaguePlayer[]> {
  const { data } = await (await createClient())
    .from("league_players")
    .select("user_id, division, seed, created_at, profile:profiles!league_players_user_id_fkey ( tag, handle, avatar_path )")
    .eq("league_id", leagueId)
    .order("created_at", { ascending: true })
    .limit(300);
  type P = { user_id: string; division: number | null; seed: number | null; created_at: string; profile: { tag: string; handle: string; avatar_path: string | null } | null };
  // A profile the viewer can't see (a teen, for a guest) is left out of the list.
  return ((data ?? []) as unknown as P[]).flatMap((p) =>
    p.profile ? [{ userId: p.user_id, tag: p.profile.tag, handle: p.profile.handle, avatarUrl: avatarUrl(p.profile.avatar_path), division: p.division, seed: p.seed, joinedAt: p.created_at }] : [],
  );
}

// ---------- Step L2: weekly sets ----------

export type LeagueSetState = "pending" | "reported" | "confirmed" | "disputed" | "no_show" | "double_loss";
export type LeagueSet = {
  id: string; division: number; week: number; p1Id: string; p2Id: string; deadline: string; state: LeagueSetState;
  p1Score: number | null; p2Score: number | null; winnerId: string | null; reportedBy: string | null;
};

export async function getLeagueSets(leagueId: string): Promise<LeagueSet[]> {
  const { data } = await (await createClient())
    .from("league_sets")
    .select("id, division, week, p1_id, p2_id, deadline, state, p1_score, p2_score, winner_id, reported_by")
    .eq("league_id", leagueId)
    .order("week")
    .order("division")
    .limit(2000);
  type S = { id: string; division: number; week: number; p1_id: string; p2_id: string; deadline: string; state: LeagueSetState; p1_score: number | null; p2_score: number | null; winner_id: string | null; reported_by: string | null };
  return ((data ?? []) as S[]).map((s) => ({ id: s.id, division: s.division, week: s.week, p1Id: s.p1_id, p2Id: s.p2_id, deadline: s.deadline, state: s.state, p1Score: s.p1_score, p2Score: s.p2_score, winnerId: s.winner_id, reportedBy: s.reported_by }));
}

/** The week being played now (1-based), clamped to the league's weeks; 0 before week 1. */
export function currentWeek(startsAt: string, weeks: number, nowMs: number): number {
  const elapsed = nowMs - Date.parse(startsAt);
  if (elapsed < 0) return 0;
  return Math.min(weeks, Math.floor(elapsed / (7 * 86400_000)) + 1);
}
