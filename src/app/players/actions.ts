"use server";

// Claimed player pages: a member bringing in their whole start.gg history to their saved career.
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getImportState, importBatch, type ImportState } from "@/lib/claimedHistory";
import { getLinkedPlayer } from "@/lib/playerStats";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";

/** Bring in the next batch (up to 200 events) of the signed-in member's start.gg history. */
export async function importMyHistory(): Promise<{ error?: string; state?: ImportState }> {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/signin");
  const t = await getT();
  const linked = await getLinkedPlayer(userId);
  if (!linked) return { error: t("people.err.linkFirst") };
  if (!linked.showStats) return { error: t("people.err.statsFirst") };
  const before = await getImportState(userId);
  if (before?.done) return { state: before };
  const { data: link } = await createAdminClient().from("startgg_links").select("startgg_user_id").eq("user_id", userId).maybeSingle();
  if (!link) return { error: t("people.err.linkFirst") };
  try {
    const state = await importBatch(userId, String(link.startgg_user_id));
    refresh();
    return { state };
  } catch (e) {
    console.error("Claimed history import failed", e instanceof Error ? e.message : e);
    return { error: t("people.err.startggBusy"), state: (await getImportState(userId)) ?? undefined };
  }
}
