"use server";

// Claimed player pages: a member bringing in their whole start.gg history to their saved career. And
// following any start.gg player (round 797).
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getImportState, importBatch, type ImportState } from "@/lib/claimedHistory";
import { getLinkedPlayer, playerOnSmashy } from "@/lib/playerStats";
import { MAX_PLAYER_FOLLOWS } from "@/lib/playerFollows";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getVerifiedUserId } from "@/lib/supabase/server";
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

/**
 * Follow a start.gg player (round 797): private, for the Events page's "Players you follow" and their page's
 * upcoming tournaments. Not for players who asked not to be listed, or members who keep their stats hidden.
 */
export async function followPlayer(playerId: string, tag: string): Promise<{ error?: string }> {
  const userId = await getVerifiedUserId();
  if (!userId) redirect(`/signin?next=${encodeURIComponent(`/players/${playerId}`)}`);
  const t = await getT();
  const name = tag.trim().slice(0, 60);
  if (!/^\d{1,12}$/.test(playerId) || !name) return { error: t("people.follow.err") };
  if (!(await playerOnSmashy(playerId).catch(() => ({ allowed: false }))).allowed) return { error: t("people.follow.err") };
  const db = await createClient();
  const { count } = await db.from("player_follows").select("player_id", { count: "exact", head: true }).eq("user_id", userId);
  if ((count ?? 0) >= MAX_PLAYER_FOLLOWS) return { error: t("people.follow.tooMany", { n: MAX_PLAYER_FOLLOWS }) };
  const { error } = await db.from("player_follows").upsert({ user_id: userId, player_id: playerId, tag: name }, { onConflict: "user_id,player_id", ignoreDuplicates: true });
  if (error) {
    console.error("Following a player failed", error.message);
    return { error: t("people.follow.err") };
  }
  refresh();
  return {};
}

/** Stop following a start.gg player. */
export async function unfollowPlayer(playerId: string): Promise<{ error?: string }> {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/signin");
  const { error } = await (await createClient()).from("player_follows").delete().eq("user_id", userId).eq("player_id", playerId);
  if (error) {
    console.error("Unfollowing a player failed", error.message);
    return { error: (await getT())("people.follow.err") };
  }
  refresh();
  return {};
}
