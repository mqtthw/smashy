// Clips shared by users for Reels: a Twitch clip or YouTube Short link waits for a site admin, then
// shows in Reels with "Shared by @handle". Twitch/YouTube host the video; Smashy stores the link.
import "server-only";
import { isGameKey, type GameKey } from "./games";
import { parseClipLink, type ReelPlatform } from "./reelLinks";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";
import { getClipById, getTwitchUserById } from "./twitch";
import { getYouTubeVideos, hasYouTubeKey, isYouTubeShort } from "./youtube";
import { cleanPublicText } from "./wordFilter";
import type { MessageKey, Values } from "./i18n/core";

export const MAX_PENDING_CLIPS = 5; // waiting for review at once, per person
export const MAX_CLIPS_PER_DAY = 10;

export type SubmissionStatus = "pending" | "approved" | "rejected";

export type ClipSubmission = {
  id: string;
  platform: ReelPlatform;
  clipId: string;
  game: GameKey;
  status: SubmissionStatus;
  title: string;
  titleFlagged: boolean;
  channelName: string | null;
  thumbnailUrl: string | null;
  views: number;
  createdAt: string;
  submitter?: { tag: string; handle: string } | null;
};

const COLUMNS = "id, platform, clip_id, game, status, title, title_flagged, channel_name, thumbnail_url, view_count, created_at";

type Row = {
  id: string; platform: ReelPlatform; clip_id: string; game: GameKey; status: SubmissionStatus; title: string; title_flagged: boolean;
  channel_name: string | null; thumbnail_url: string | null; view_count: number; created_at: string;
  submitter?: { tag: string; handle: string } | null;
};

const toSubmission = (r: Row): ClipSubmission => ({
  id: r.id, platform: r.platform, clipId: r.clip_id, game: r.game, status: r.status, title: r.title, titleFlagged: r.title_flagged,
  channelName: r.channel_name, thumbnailUrl: r.thumbnail_url, views: r.view_count, createdAt: r.created_at, submitter: r.submitter,
});

type Details = {
  channel_login: string; channel_name: string | null; title: string; thumbnail_url: string | null; view_count: number;
  duration: number | null; video_id: string | null; vod_offset: number | null; clip_created_at: string;
};

/** A message for the person sharing a clip: a phrase key, shown in their language by the action. */
export type ShareProblem = { key: MessageKey; values?: Values };

/** Looks the clip up on Twitch/YouTube, or says what's wrong with it. */
async function fetchDetails(platform: ReelPlatform, clipId: string): Promise<Details | ShareProblem> {
  if (platform === "twitch") {
    const clip = await getClipById(clipId);
    if (!clip) return { key: "media.share.err.twitchClip" };
    const user = await getTwitchUserById(clip.broadcaster_id);
    if (!user) return { key: "media.share.err.twitchChannel" };
    return {
      channel_login: user.login, channel_name: clip.broadcaster_name, title: clip.title, thumbnail_url: clip.thumbnail_url,
      view_count: clip.view_count, duration: clip.duration, video_id: clip.video_id || null, vod_offset: clip.vod_offset,
      clip_created_at: clip.created_at,
    };
  }
  if (!hasYouTubeKey()) return { key: "media.share.err.youtubeOff" };
  const [video] = await getYouTubeVideos([clipId]);
  if (!video) return { key: "media.share.err.youtubeMissing" };
  if (!video.embeddable) return { key: "media.share.err.notEmbeddable" };
  const short = await isYouTubeShort(clipId);
  if (short === null) return { key: "media.share.err.reach", values: { site: "YouTube" } };
  if (!short) return { key: "media.share.err.notShort" };
  return {
    channel_login: video.channelId, channel_name: video.channelTitle, title: video.title, thumbnail_url: video.thumbnailUrl,
    view_count: video.views, duration: video.duration, video_id: null, vod_offset: null, clip_created_at: video.publishedAt,
  };
}

/** Shares a clip for review. Returns a message for the person if it can't be shared. */
export async function submitClip(userId: string, link: string, game: string): Promise<{ ok?: boolean; error?: ShareProblem }> {
  const parsed = parseClipLink(link);
  if (!parsed) return { error: { key: "media.share.err.link" } };
  if (!isGameKey(game)) return { error: { key: "media.share.err.game" } };
  const db = createAdminClient();

  const dayAgo = new Date(Date.now() - 86400e3).toISOString();
  const [{ count: today }, { count: pending }, { data: inReels }, { data: open }] = await Promise.all([
    db.from("reel_submissions").select("id", { count: "exact", head: true }).eq("user_id", userId).gt("created_at", dayAgo),
    db.from("reel_submissions").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "pending"),
    db.from("reels").select("hidden, unavailable, created_at, submitted_at").eq("clip_id", parsed.clipId).maybeSingle(),
    db.from("reel_submissions").select("user_id, status").eq("clip_id", parsed.clipId).neq("status", "rejected").maybeSingle(),
  ]);
  if ((today ?? 0) >= MAX_CLIPS_PER_DAY) return { error: { key: "media.share.err.perDay", values: { n: MAX_CLIPS_PER_DAY } } };
  if ((pending ?? 0) >= MAX_PENDING_CLIPS) return { error: { key: "media.share.err.pending", values: { n: MAX_PENDING_CLIPS } } };
  if (inReels?.hidden || inReels?.unavailable) return { error: { key: "media.share.err.notAllowed" } };
  // Reels shows the last 30 days: an older clip isn't on screen anymore, so it can be shared again
  // (approving it brings it back as new).
  const showing = inReels && Date.parse(inReels.submitted_at ?? inReels.created_at) > Date.now() - 30 * 86400e3;
  if (showing) return { error: { key: "media.share.err.inReels" } };
  if (open) return { error: { key: open.user_id === userId ? "media.share.err.youShared" : "media.share.err.someoneShared" } };

  let details: Details | ShareProblem;
  try {
    details = await fetchDetails(parsed.platform, parsed.clipId);
  } catch (e) {
    console.error("Clip lookup failed", parsed.platform, e instanceof Error ? e.message : e);
    return { error: { key: "media.share.err.reach", values: { site: parsed.platform === "youtube" ? "YouTube" : "Twitch" } } };
  }
  if ("key" in details) return { error: details };

  const { data: channel } = await db.from("reel_channels").select("blocked").eq("login", details.channel_login).maybeSingle();
  if (channel?.blocked) return { error: { key: "media.share.err.channelBlocked" } };

  const title = cleanPublicText(details.title.slice(0, 200));
  const { error } = await db.from("reel_submissions").insert({
    ...details,
    user_id: userId,
    platform: parsed.platform,
    clip_id: parsed.clipId,
    game,
    title: title.text,
    title_flagged: title.flagged,
  });
  if (error) {
    if (error.code === "23505") return { error: { key: "media.share.err.someoneShared" } };
    console.error("submitClip failed", error.code, error.message);
    return { error: { key: "media.share.err.save" } };
  }
  return { ok: true };
}

/** The signed-in person's recent shared clips (newest first). */
export async function getMySubmissions(userId: string): Promise<ClipSubmission[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("reel_submissions").select(COLUMNS).eq("user_id", userId).order("created_at", { ascending: false }).limit(20);
  if (error) throw error;
  return ((data ?? []) as Row[]).map(toSubmission);
}

/** Admin: clips waiting for review, oldest first. */
export async function getPendingSubmissions(): Promise<ClipSubmission[]> {
  const { data, error } = await createAdminClient()
    .from("reel_submissions")
    .select(`${COLUMNS}, submitter:profiles!reel_submissions_user_id_fkey ( tag, handle )`)
    .eq("status", "pending")
    .order("created_at")
    .limit(50);
  if (error) throw error;
  return ((data ?? []) as unknown as Row[]).map(toSubmission);
}

/** Admin: approve (into Reels, under `game`) or reject a shared clip, and tell the person who shared it. */
export async function reviewSubmission(id: string, approve: boolean, game?: string) {
  const db = createAdminClient();
  const { data: s, error } = await db.from("reel_submissions").select("*").eq("id", id).eq("status", "pending").maybeSingle();
  if (error) throw error;
  if (!s) return; // already reviewed

  if (approve) {
    const finalGame = isGameKey(game) ? game : s.game;
    // Record the channel (so it can be blocked later) without approving it for collecting.
    await db
      .from("reel_channels")
      .upsert({ login: s.channel_login, platform: s.platform, display_name: s.channel_name, source: "submitted" }, { onConflict: "login", ignoreDuplicates: true });
    const now = new Date().toISOString();
    const { error: reelError } = await db.from("reels").upsert(
      {
        clip_id: s.clip_id, platform: s.platform, channel_login: s.channel_login, channel_name: s.channel_name, title: s.title,
        title_flagged: s.title_flagged, game: finalGame, view_count: s.view_count, duration: s.duration, thumbnail_url: s.thumbnail_url,
        video_id: s.video_id, vod_offset: s.vod_offset, created_at: s.clip_created_at, fetched_at: now, submitted_by: s.user_id, submitted_at: now,
      },
      { onConflict: "clip_id" },
    );
    if (reelError) throw reelError;
  }
  const { error: updateError } = await db
    .from("reel_submissions")
    .update({ status: approve ? "approved" : "rejected", reviewed_at: new Date().toISOString(), ...(approve && isGameKey(game) ? { game } : {}) })
    .eq("id", id);
  if (updateError) throw updateError;
  await db.from("notifications").insert({ user_id: s.user_id, type: approve ? "clip_approved" : "clip_rejected", reel_submission_id: id });
}
