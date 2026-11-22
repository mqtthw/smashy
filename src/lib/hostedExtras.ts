// Two things around an event's list of players: the waitlist for a full event (public, like the
// list itself) and the TO's "who has paid" ticks (never shown to anyone but the people running the
// event). Server-only.
import "server-only";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";
import type { Waiting } from "./waitlist";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The people waiting for a spot, first in line first. Read as the viewer: someone whose profile
 * this viewer can't see (a teen, for a guest) keeps their place in line but has no name.
 */
export async function getWaitlist(eventId: string): Promise<Waiting[]> {
  if (!UUID.test(eventId)) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("hosted_waitlist")
    .select("user_id, profile:profiles ( tag, handle )")
    .eq("event_id", eventId)
    .order("created_at")
    .order("user_id")
    .limit(200);
  return ((data ?? []) as unknown as { user_id: string; profile: { tag: string; handle: string } | null }[]).map((r) => ({
    userId: r.user_id,
    tag: r.profile?.tag ?? null,
    handle: r.profile?.handle ?? null,
  }));
}

/**
 * The entries a TO has ticked as paid (ids of players, walk-ins or teams). The table is closed to
 * members, so this reads with the server's own access: ONLY call it for someone who runs the event.
 */
export async function getPaidEntries(eventId: string): Promise<string[]> {
  if (!UUID.test(eventId)) return [];
  const { data } = await createAdminClient().from("hosted_paid").select("entry_id").eq("event_id", eventId).limit(1200);
  return ((data ?? []) as { entry_id: string }[]).map((r) => r.entry_id);
}
