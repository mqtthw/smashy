// Small facts about the person viewing the page (server-side).
import { cache } from "react";
import { createClient } from "./supabase/server";

/** The viewer's profile row (games only), read once per request however many parts ask. Null: none yet. */
const myProfile = cache(async (userId: string): Promise<{ games: string[] } | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("games").eq("id", userId).maybeSingle();
  return data ? { games: (data.games as string[] | null) ?? [] } : null;
});

/** The games the signed-in player picked on their profile ([] for guests). */
export async function getMyGames(userId: string | null): Promise<string[]> {
  if (!userId) return [];
  return (await myProfile(userId))?.games ?? [];
}

/**
 * Signed in but never finished the welcome step (round 663): they closed the page before "Create
 * profile". False for guests and for anyone with a profile. A failed read counts as false (no nagging).
 */
export async function needsProfile(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  try {
    return (await myProfile(userId)) === null;
  } catch {
    return false;
  }
}
