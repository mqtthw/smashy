// The signed-in player's start.gg events (from their linked account), for the Events tab and brackets.
import "server-only";
import { getMySets, type MyEvent } from "./brackets/startgg";
import { createClient } from "./supabase/server";

/** Their start.gg events (cached like My sets), or [] when they haven't linked start.gg or it can't be reached. */
export async function getMyStartggEvents(userId: string | null): Promise<MyEvent[]> {
  if (!userId) return [];
  const supabase = await createClient();
  const { data: link } = await supabase.from("startgg_links").select("startgg_user_id").eq("user_id", userId).maybeSingle();
  if (!link) return [];
  return getMySets(Number(link.startgg_user_id)).catch(() => []);
}

/** The name to search a bracket for: the gamer tag without the sponsor ("LG | Sonix" -> "Sonix"). */
export function bracketSearchName(entrantName: string): string {
  return entrantName.split(" | ").pop()?.trim() || entrantName;
}
