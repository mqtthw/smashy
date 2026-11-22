// "I want to play now": play requests, @matchmaking pings, saved codes and the "Looking to play"
// switch (round 398). Read as the signed-in player, so the database's own rules decide what shows.
import "server-only";
import { isPlayGame, type MyPlaySettings, type PlayFriend, type PlayGame, type PlayRequest } from "./playGames";
import { avatarUrl } from "./avatarLinks";
import { createClient } from "./supabase/server";

type Row = {
  id: string; game: string; status: PlayRequest["status"]; from_id: string; to_id: string; created_at: string; expires_at: string; answered_at: string | null;
  from: { id: string; tag: string; handle: string; avatar_path: string | null } | null;
  to: { id: string; tag: string; handle: string; avatar_path: string | null } | null;
};

/** Requests still worth showing: open ones, and ones accepted in the last 3 hours (codes are shown then). */
export async function getPlayRequests(userId: string): Promise<PlayRequest[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("play_requests")
    .select("id, game, status, from_id, to_id, created_at, expires_at, answered_at, from:profiles!play_requests_from_id_fkey(id, tag, handle, avatar_path), to:profiles!play_requests_to_id_fkey(id, tag, handle, avatar_path)")
    .or(`from_id.eq.${userId},to_id.eq.${userId}`)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20);
  const now = Date.now();
  return ((data ?? []) as unknown as Row[])
    .filter((r) => isPlayGame(r.game) && (r.status === "accepted" || (r.status === "pending" && Date.parse(r.expires_at) > now)))
    .map((r) => {
      const incoming = r.to_id === userId;
      const o = incoming ? r.from : r.to;
      return {
        id: r.id,
        game: r.game as PlayGame,
        status: r.status,
        incoming,
        other: { id: o?.id ?? "", tag: o?.tag ?? "?", handle: o?.handle ?? "", avatarUrl: avatarUrl(o?.avatar_path ?? null) },
        createdAt: r.created_at,
        expiresAt: r.expires_at,
        answeredAt: r.answered_at,
      };
    });
}

/** People you follow who follow you back, the ones "Looking to play" first. */
export async function getPlayFriends(): Promise<PlayFriend[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("play_friends");
  return ((data ?? []) as { id: string; tag: string; handle: string; avatar_path: string | null; looking_game: string | null; looking_until: string | null }[]).map((f) => ({
    id: f.id,
    tag: f.tag,
    handle: f.handle,
    avatarUrl: avatarUrl(f.avatar_path),
    lookingGame: isPlayGame(f.looking_game) ? f.looking_game : null,
    lookingUntil: f.looking_until,
  }));
}

export async function getMyPlaySettings(userId: string): Promise<MyPlaySettings> {
  const supabase = await createClient();
  const [{ data: s }, { data: codes }] = await Promise.all([
    supabase.from("play_settings").select("ping_games, looking_game, looking_until").eq("user_id", userId).maybeSingle(),
    supabase.from("play_codes").select("game, code").eq("user_id", userId),
  ]);
  const on = s?.looking_until && Date.parse(s.looking_until) > Date.now();
  return {
    pingGames: ((s?.ping_games as string[] | null) ?? []).filter(isPlayGame),
    lookingGame: on && isPlayGame(s?.looking_game) ? s.looking_game : null,
    lookingUntil: on ? s!.looking_until : null,
    codes: Object.fromEntries((codes ?? []).filter((c) => isPlayGame(c.game)).map((c) => [c.game, c.code])),
  };
}
