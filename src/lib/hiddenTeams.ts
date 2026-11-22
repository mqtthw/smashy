// Doubles teams with a teen are hidden from signed-out visitors, so the share pictures (built as a
// visitor sees things) can't count them. How many there are says nothing about who's in them, so the
// pictures add this to their player counts.
import "server-only";
import { createAdminClient } from "./supabase/admin";

/** How many entries in this event are hidden from visitors (teams with a teen). */
export async function hiddenTeamCount(eventId: string): Promise<number> {
  const { count } = await createAdminClient().from("hosted_guests").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("members_only", true);
  return count ?? 0;
}
