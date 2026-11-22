"use server";
// Saving Slippi replay stats to your own profile, choosing whether they show, and removing them.
// Each member can only touch their own row (the database checks that too).
import { revalidatePath } from "next/cache";
import { readSavedSummary } from "@/lib/replayProfile";
import { createClient, getVerifiedUserId } from "@/lib/supabase/server";

export type ReplaySaveResult = { ok?: boolean; error?: "signIn" | "bad" | "save" };

export async function saveReplayStats(summary: unknown, shown: boolean): Promise<ReplaySaveResult> {
  const userId = await getVerifiedUserId();
  if (!userId) return { error: "signIn" };
  const clean = readSavedSummary(summary);
  if (!clean) return { error: "bad" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("replay_stats")
    .upsert({ user_id: userId, summary: clean, games: clean.games, shown: shown === true, saved_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) {
    console.error("saveReplayStats failed", error.code, error.message);
    return { error: "save" };
  }
  revalidatePath("/replays");
  return { ok: true };
}

export async function setReplayStatsShown(shown: boolean): Promise<ReplaySaveResult> {
  const userId = await getVerifiedUserId();
  if (!userId) return { error: "signIn" };
  const { error } = await (await createClient()).from("replay_stats").update({ shown: shown === true }).eq("user_id", userId);
  return error ? { error: "save" } : { ok: true };
}

export async function removeReplayStats(): Promise<ReplaySaveResult> {
  const userId = await getVerifiedUserId();
  if (!userId) return { error: "signIn" };
  const { error } = await (await createClient()).from("replay_stats").delete().eq("user_id", userId);
  return error ? { error: "save" } : { ok: true };
}
