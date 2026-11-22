"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createMemberInvite, isInviteOnly } from "@/lib/invites";
import { getPlayerHistory, type HistoryEntry } from "@/lib/startgg";
import { createClient, getVerifiedUserId } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";

const NOTIFICATION_TYPES = ["like", "reaction", "repost", "quote", "follow", "mention", "reply", "vote", "event_reminder", "weekly_digest", "play_request"];

/** Which notification types to switch off. */
export async function setNotificationMutes(types: string[]) {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/signin");
  const clean = [...new Set((Array.isArray(types) ? types : []).filter((t) => NOTIFICATION_TYPES.includes(t)))];
  const supabase = await createClient();
  await supabase.from("profiles").update({ notification_mutes: clean }).eq("id", userId);
  revalidatePath("/profile");
}

/** Make one of your invite codes (private beta). */
export async function makeMyInvite(): Promise<{ code?: string; error?: string }> {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/signin");
  const t = await getT();
  if (!(await isInviteOnly())) return { error: t("people.err.openToEveryone") };
  try {
    const res = await createMemberInvite(userId);
    if (typeof res === "string") return { error: res };
    revalidatePath("/profile");
    return { code: res.code };
  } catch {
    return { error: t("people.err.inviteFailed") };
  }
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function unlinkStartgg() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/signin");
  const supabase = await createClient();
  await supabase.from("startgg_links").delete().eq("user_id", userId);
  redirect("/profile");
}

/** "Show more" on the history list. Always uses the signed-in user's own link, never an id from the browser. */
export async function loadMoreHistory(page: number): Promise<{ entries: HistoryEntry[]; hasMore: boolean }> {
  const userId = await getVerifiedUserId();
  if (!userId || !Number.isInteger(page) || page < 2 || page > 100) return { entries: [], hasMore: false };

  const supabase = await createClient();
  const { data: link } = await supabase.from("startgg_links").select("startgg_user_id").eq("user_id", userId).maybeSingle();
  if (!link) return { entries: [], hasMore: false };

  const history = await getPlayerHistory(link.startgg_user_id, page);
  return { entries: history.entries, hasMore: page < history.totalPages };
}

/** "Tell me when a major in my games goes live." */
export async function setMajorAlerts(on: boolean) {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/signin");
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ notify_majors: on }).eq("id", userId);
  if (error) throw error;
  refresh(); // so the switch shows the saved value (it would snap back otherwise)
}

/** "Show my start.gg stats on my profile." */
export async function setShowStats(on: boolean) {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/signin");
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ show_stats: on }).eq("id", userId);
  if (error) throw error;
  refresh();
}

const MAX_MUTED_WORDS = 50;

/** Your muted words and phrases (private): posts containing them stay out of your feeds. */
export async function setMutedWords(words: string[]): Promise<{ error?: string }> {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/signin");
  const clean = [...new Set((Array.isArray(words) ? words : []).map((w) => String(w).trim().toLowerCase().slice(0, 40)).filter(Boolean))];
  const t = await getT();
  if (clean.length > MAX_MUTED_WORDS) return { error: t("people.err.tooManyMuted", { n: MAX_MUTED_WORDS }) };
  const supabase = await createClient();
  const { error } = await supabase.from("muted_words").upsert({ user_id: userId, words: clean, updated_at: new Date().toISOString() });
  if (error) return { error: t("people.err.couldntSave") };
  refresh();
  return {};
}
