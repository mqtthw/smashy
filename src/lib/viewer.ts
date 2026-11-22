// Small facts about the person viewing the page (server-side).
import { cache } from "react";
import { createClient } from "./supabase/server";

/** The viewer's profile row (games only), read once per request however many parts ask. Null: none yet. */
const myProfile = cache(async (userId: string): Promise<{ games: string[] } | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("games").eq("id", userId).maybeSingle();
  return data ? { games: (data.games as string[] | null) ?? [] } : null;
});

/**
 * Whether the signed-in player has a birthday on file (round 696). Messages, play requests and the ladder need
 * one (round 692), so those pages offer the form. Guests: true (nothing to offer). A failed read: true (no nagging).
 */
export const hasBirthday = cache(async (userId: string | null): Promise<boolean> => {
  if (!userId) return true;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("private_profile_data").select("user_id").eq("user_id", userId).maybeSingle();
    return error ? true : !!data;
  } catch {
    return true;
  }
});

/**
 * The viewer's id if they have a Smashy profile, else null (round 719). For reads made with the
 * service role that show teens to members: a bare login that never made a profile (and so gave no
 * birthday) counts as a guest, like the database's own rules since round 695. A failed read: null.
 */
export async function memberId(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  try {
    return (await myProfile(userId)) ? userId : null;
  } catch {
    return null;
  }
}

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
