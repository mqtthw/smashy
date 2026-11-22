"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { takeGuestPage } from "@/lib/guestPages";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { bracketPathForLink } from "@/lib/brackets";
import { findStartggEntrantPools } from "@/lib/brackets/startgg";
import { getT } from "@/lib/i18n/server";

/**
 * Guests' calls here reach start.gg, so they count against the same per-address allowance as opening a
 * bracket page (round 631: changing the search each time used to skip it). True when over it.
 */
async function guestOverAllowance(): Promise<boolean> {
  if (await getVerifiedUserId()) return false;
  const h = await headers();
  const address = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  return !takeGuestPage(address, Date.now()).ok;
}

/** Paste a start.gg or parry.gg link, land on Smashy's bracket page for it. */
export async function openBracketLink(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const link = String(formData.get("link") ?? "").slice(0, 500);
  if (!/(start|parry)\.gg\//i.test(link)) return { error: (await getT())("browse.brackets.errLink") };
  if (await guestOverAllowance()) return { error: (await getT())("browse.brackets.errNotFound") };
  const path = await bracketPathForLink(link);
  if (!path) return { error: (await getT())("browse.brackets.errNotFound") };
  redirect(path);
}

/** "Find a player" found nobody in this pool: which pools of the event they're in (start.gg, round 456). */
export async function findPlayerInEvent(eventId: string, query: string): Promise<{ tag: string; groupId: string }[]> {
  const q = String(query ?? "").trim().slice(0, 40);
  if (!/^\d{1,12}$/.test(String(eventId)) || q.length < 2) return [];
  if (await guestOverAllowance()) return [];
  return findStartggEntrantPools(String(eventId), q).catch(() => []);
}
