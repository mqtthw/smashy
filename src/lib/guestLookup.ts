// The guest limits on player lookup (see guestBudget.ts), read from the current request.
import "server-only";
import { headers } from "next/headers";
import { guestSiteRoom, refundGuestLookup, takeGuestLookup, type GuestLookup } from "./guestBudget";
import { startggLoad } from "./startgg";
import { createAdminClient } from "./supabase/admin";

/** A ticket from the site-wide start.gg count (step S3): how many slots were granted, or null when it can't be asked. */
async function takeSiteTicket(want: number, perMinute: number): Promise<number | null> {
  if (!process.env.SUPABASE_SECRET_KEY) return null; // tests and scripts: no shared count
  const { data, error } = await createAdminClient().rpc("take_startgg_slots", { want, per_minute: perMinute }).abortSignal(AbortSignal.timeout(1_500));
  const row = (Array.isArray(data) ? data[0] : data) as { granted?: unknown } | null;
  if (error || typeof row?.granted !== "number") return null;
  return row.granted;
}

/**
 * Count one player lookup for the visitor making this request (by address; nothing is stored) and say
 * whether it may go ahead: within their own limit, this server not busy, and the whole site with room for
 * a guest's lookup (round 790).
 */
export async function guestLookup(): Promise<GuestLookup> {
  const h = await headers();
  const address = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const own = takeGuestLookup(address, Date.now(), startggLoad());
  if (own !== "ok") return own;
  if (await guestSiteRoom(takeSiteTicket)) return "ok";
  refundGuestLookup(address); // busy isn't the visitor's doing
  return "busy";
}
