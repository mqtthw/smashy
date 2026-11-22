"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { POST_MAX_LENGTH } from "@/lib/postConstants";
import { postErrorMessage } from "@/lib/postErrors";
import { submitClip } from "@/lib/reelSubmissions";
import { getReel, getReels } from "@/lib/reels";
import { createClient, getVerifiedUserId } from "@/lib/supabase/server";
import { getMyGames } from "@/lib/viewer";
import { isGameKey } from "@/lib/games";
import { getT } from "@/lib/i18n/server";

const MAX_SEEN_REELS = 300;

export type ShareClipState = { error?: string; ok?: number };

/** Share a Twitch clip or YouTube Short for Reels (waits for a site admin). */
export async function shareClip(_prev: ShareClipState, formData: FormData): Promise<ShareClipState> {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/signin");
  const res = await submitClip(userId, String(formData.get("link") ?? "").slice(0, 500), String(formData.get("game") ?? ""));
  if (res.error) return { error: (await getT())(res.error.key, res.error.values) };
  refresh();
  return { ok: Date.now() };
}

/** The next batch of Reels for whoever is scrolling. `seen` = clips this device already watched (sent last). `game` = one game only. */
export async function loadMoreReels(offset: number, seen: string[] = [], game: string | null = null) {
  if (!Number.isInteger(offset) || offset < 0 || offset > 1000) return { reels: [], hasMore: false };
  const seenIds = Array.isArray(seen) ? seen.filter((id) => typeof id === "string" && /^[\w-]{1,120}$/.test(id)).slice(-MAX_SEEN_REELS) : [];
  const userId = await getVerifiedUserId();
  const myGames = await getMyGames(userId);
  return getReels({ myGames, game: isGameKey(game) ? game : null, offset, limit: 15, seen: seenIds, userId });
}

/** Clips you liked (ids only), so Reels can fill in the hearts. */
export async function myLikedClipIds(): Promise<string[]> {
  const userId = await getVerifiedUserId();
  if (!userId) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("reel_likes").select("clip_id").eq("user_id", userId).order("created_at", { ascending: false }).limit(2000);
  return (data ?? []).map((r) => r.clip_id as string);
}

/** Like a clip, or take the like back. */
export async function toggleReelLike(clipId: string, like: boolean): Promise<{ error?: string }> {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/signin");
  const supabase = await createClient();
  const { error } = like
    ? await supabase.from("reel_likes").insert({ user_id: userId, clip_id: clipId })
    : await supabase.from("reel_likes").delete().eq("user_id", userId).eq("clip_id", clipId);
  if (error && error.code !== "23505") return { error: (await getT())("common.tryAgain") };
  return {};
}

export type TalkState = { error?: string; ok?: number; mode?: "comment" | "feed" };

/** Comment on a clip, or share it to your feed with your take. */
export async function postAboutReel(_prev: TalkState, formData: FormData): Promise<TalkState> {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/signin");
  const clipId = String(formData.get("clip_id") ?? "");
  const mode = formData.get("mode") === "feed" ? "feed" : "comment";
  const body = String(formData.get("body") ?? "").replace(/\r\n/g, "\n").trim();
  if (!body) return { error: (await getT())(mode === "feed" ? "media.err.addWords" : "media.err.writeComment") };
  if (body.length > POST_MAX_LENGTH) return { error: (await getT())("media.err.postTooLong", { n: POST_MAX_LENGTH }) };

  const reel = await getReel(clipId).catch(() => null); // also checks it isn't hidden
  if (!reel) return { error: (await getT())("media.err.clipGone") };

  const supabase = await createClient();
  const { error } = await supabase.from("posts").insert({
    author_id: userId,
    body,
    game: reel.game,
    ...(mode === "feed" ? { quote_reel_id: reel.clipId } : { reel_clip_id: reel.clipId }),
  });
  if (error) {
    console.error("postAboutReel failed", error.code, error.message);
    return { error: postErrorMessage(error.message, error.code) };
  }
  refresh();
  return { ok: Date.now(), mode };
}

/** Clips you saved (ids only), so Reels can show which are saved. */
export async function mySavedClipIds(): Promise<string[]> {
  const userId = await getVerifiedUserId();
  if (!userId) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("saved_clips").select("clip_id").eq("user_id", userId).order("created_at", { ascending: false }).limit(1000);
  return (data ?? []).map((r) => r.clip_id as string);
}

/** Save a clip to your Saved list (private), or remove it. */
export async function toggleSavedClip(clipId: string, save: boolean): Promise<{ error?: string }> {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/signin");
  const supabase = await createClient();
  const { error } = save
    ? await supabase.from("saved_clips").insert({ user_id: userId, clip_id: clipId })
    : await supabase.from("saved_clips").delete().eq("user_id", userId).eq("clip_id", clipId);
  if (error && error.code !== "23505") return { error: (await getT())("common.tryAgain") };
  return {};
}
