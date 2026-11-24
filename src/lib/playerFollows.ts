// Following any start.gg player (round 797): a private list of players a member keeps up with, on Smashy or
// not, to see where they compete next. Only the member sees their own list (player_follows' rules).
import "server-only";
import { createClient } from "./supabase/server";

/** How many players one member may follow (each one is a start.gg lookup on the Events page). */
export const MAX_PLAYER_FOLLOWS = 100;
/** How many of them the Events page looks up at once. */
export const FOLLOWS_SHOWN = 12;

export type PlayerFollow = { playerId: string; tag: string };

/** The players a member follows, latest first. */
export async function getPlayerFollows(userId: string | null): Promise<PlayerFollow[]> {
  if (!userId) return [];
  const db = await createClient();
  const { data, error } = await db.from("player_follows").select("player_id, tag").eq("user_id", userId).order("created_at", { ascending: false }).limit(MAX_PLAYER_FOLLOWS);
  if (error) throw error;
  return (data ?? []).map((r) => ({ playerId: r.player_id, tag: r.tag }));
}

/** Whether a member follows this player. */
export async function followsPlayer(userId: string | null, playerId: string): Promise<boolean> {
  if (!userId) return false;
  const db = await createClient();
  const { data } = await db.from("player_follows").select("player_id").eq("user_id", userId).eq("player_id", playerId).maybeSingle();
  return !!data;
}
