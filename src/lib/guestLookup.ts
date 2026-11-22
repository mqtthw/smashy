// The guest limits on player lookup (see guestBudget.ts), read from the current request.
import "server-only";
import { headers } from "next/headers";
import { takeGuestLookup, type GuestLookup } from "./guestBudget";
import { startggLoad } from "./startgg";

/** Count one player lookup for the visitor making this request (by address; nothing is stored) and say whether it may go ahead. */
export async function guestLookup(): Promise<GuestLookup> {
  const h = await headers();
  const address = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  return takeGuestLookup(address, Date.now(), startggLoad());
}
