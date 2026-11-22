"use server";

import { randomUUID } from "node:crypto";
import { refresh, updateTag } from "next/cache";
import { after } from "next/server";
import { featureMajor, MAJORS_TAG, setMajorHidden, syncMajors } from "@/lib/majors";
import { addHandMajor, deleteHandMajor, HAND_GAME_BLOCKS, HAND_MAX_BLOCKS, updateHandMajor, type HandProblem } from "@/lib/handMajors";
import { reviewSuggestion } from "@/lib/majorSuggestions";
import { closeSuggestion } from "@/lib/communitySuggestions";
import { addMoment, reviewMoment } from "@/lib/historyMoments";
import { resolveReport } from "@/lib/historyReports";
import { reviewMajorVod } from "@/lib/majorVods";
import { linkAllExact, linkName, readPlayerId, unlinkName } from "@/lib/playerLinks";
import { runRefresh } from "@/lib/refreshJobs";
import { reviewSubmission } from "@/lib/reelSubmissions";
import { INVITE_ONLY_TAG, createInviteCode, setInviteDisabled, setInviteOnly } from "@/lib/invites";
import { deletePostImages } from "@/lib/postImages";
import { deletePostVideos } from "@/lib/postVideos";
import { removeAvatar } from "@/lib/avatars";
import { decideSceneEmoji } from "@/lib/sceneSocial";
import { addReelChannel, addYouTubeChannel, approveReelChannel, setReelChannelBlocked, setReelChannelGame, setReelHidden, syncReels } from "@/lib/reels";
import { notFound, redirect } from "next/navigation";
import { REASON_LABELS } from "@/lib/moderation";
import { isSiteAdmin } from "@/lib/scenes";
import { setPlayerHidden } from "@/lib/playerIndex";
import { playerRef } from "@/lib/playerSearch";
import { getStartggPlayer, getStartggPlayerBySlug } from "@/lib/startggPlayers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVerifiedUserId } from "@/lib/supabase/server";

async function requireModerator() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/signin");
  if (!(await isSiteAdmin(userId))) notFound();
  return userId;
}

/**
 * A thread's stored reply count only changes when a reply is added or deleted, so removing one
 * (which hides it without deleting it) left the count too high: the thread stayed out of "No
 * replies yet" and removed spam kept lifting it in Hot. Removing and restoring adjust it here.
 */
async function adjustReplyCount(parentId: string, by: 1 | -1) {
  const db = createAdminClient();
  const { data } = await db.from("posts").select("reply_count").eq("id", parentId).maybeSingle();
  if (data) await db.from("posts").update({ reply_count: Math.max(0, ((data.reply_count as number | null) ?? 0) + by) }).eq("id", parentId);
}

/** Hide a post from everyone (author still sees it, marked removed) and close its reports. */
export async function removePost(postId: string, reason: string) {
  const moderatorId = await requireModerator();
  if (!(reason in REASON_LABELS)) return;
  const db = createAdminClient();
  const { data: was } = await db.from("posts").select("parent_id, removed_at").eq("id", postId).maybeSingle();
  await db.from("posts").update({ removed_at: new Date().toISOString(), removed_reason: reason }).eq("id", postId);
  if (was?.parent_id && !was.removed_at) await adjustReplyCount(was.parent_id as string, -1);
  await db.from("profiles").update({ pinned_post_id: null }).eq("pinned_post_id", postId); // a removed post can't stay pinned
  // Its photos and video are deleted for good (restoring the post brings back the words only).
  await deletePostImages(postId).catch((e) => console.error("deletePostImages failed", e));
  await deletePostVideos(postId).catch((e) => console.error("deletePostVideos failed", e)); // and its video
  await db.from("post_reports").update({ status: "actioned" }).eq("post_id", postId).eq("status", "open");
  await db.from("moderation_actions").insert({ moderator_id: moderatorId, action: "remove_post", post_id: postId, reason });
  refresh();
}

/** Keep the post up and close its reports. */
export async function dismissReports(postId: string) {
  const moderatorId = await requireModerator();
  const db = createAdminClient();
  await db.from("post_reports").update({ status: "dismissed" }).eq("post_id", postId).eq("status", "open");
  await db.from("moderation_actions").insert({ moderator_id: moderatorId, action: "dismiss_reports", post_id: postId });
  refresh();
}

/** Chat message or lobby: hide it (if it still exists) and close its reports. */
export async function actOnLive(kind: "chat" | "lobby" | "highlight" | "reel" | "message" | "profile" | "event" | "league" | "vod", targetId: string, decision: "remove" | "dismiss", reason?: string) {
  const moderatorId = await requireModerator();
  if (!["chat", "lobby", "highlight", "reel", "message", "profile", "event", "league", "vod"].includes(kind) || !["remove", "dismiss"].includes(decision)) return;
  const db = createAdminClient();
  const { data: report } = await db.from("live_reports").select("snapshot").eq("kind", kind).eq("target_id", targetId).limit(1).maybeSingle();

  if (decision === "remove") {
    if (kind === "chat") await db.from("chat_messages").update({ removed_at: new Date().toISOString() }).eq("id", targetId);
    else if (kind === "lobby") await db.from("lobbies").update({ closed_at: new Date().toISOString() }).eq("id", targetId);
    else if (kind === "reel") await db.from("reels").update({ hidden: true }).eq("clip_id", targetId);
    else if (kind === "profile") await clearProfile(targetId);
    else if (kind === "league") await db.from("leagues").update({ removed_at: new Date().toISOString() }).eq("id", targetId); // hidden from everyone but its organizer
    else if (kind === "vod") await db.from("set_vods").delete().eq("id", targetId);
    else if (kind === "event") {
      // An event's extra brackets (Redemption, a second game) go with it.
      const hidden = { removed_at: new Date().toISOString(), removed_reason: reason ?? "other" };
      await db.from("hosted_events").update(hidden).eq("id", targetId);
      await db.from("hosted_events").update(hidden).eq("parent_id", targetId).is("removed_at", null);
    }
    else if (kind === "message") {
      const { data: m } = await db.from("messages").select("image_path").eq("id", targetId).maybeSingle();
      await db.from("messages").update({ deleted_at: new Date().toISOString(), body: "", image_path: null }).eq("id", targetId);
      if (m?.image_path) await db.storage.from("message-images").remove([m.image_path]);
    }
    else await db.from("highlights").update({ removed_at: new Date().toISOString(), removed_reason: reason ?? "other" }).eq("id", targetId);
  }
  await db
    .from("live_reports")
    .update({ status: decision === "remove" ? "actioned" : "dismissed" })
    .eq("kind", kind)
    .eq("target_id", targetId)
    .eq("status", "open");
  if (kind === "message") {
    // A reported photo is kept when its sender unsends the message, so it can be reviewed. Now that
    // the report is dealt with, delete it unless the message still shows it.
    const kept = /\[photo:([^\]]+)\]/.exec(report?.snapshot ?? "")?.[1];
    if (kept) {
      const { data: still } = await db.from("messages").select("image_path").eq("id", targetId).maybeSingle();
      if (!still?.image_path) await db.storage.from("message-images").remove([kept]);
    }
  }
  await db.from("moderation_actions").insert({
    moderator_id: moderatorId,
    action: decision === "dismiss" ? "dismiss_live" : kind === "chat" ? "remove_chat" : kind === "lobby" ? "close_lobby" : kind === "reel" ? "hide_reel" : kind === "message" ? "remove_message" : kind === "profile" ? "clear_profile" : kind === "event" ? "hide_event" : "remove_highlight",
    reason: decision === "remove" && reason && reason in REASON_LABELS ? reason : null,
    snapshot: report?.snapshot ?? null,
  });
  refresh();
}

/** A reported profile: reset their name and handle, and clear their bio, city and picture. */
async function clearProfile(userId: string) {
  const db = createAdminClient();
  // Reset what others see: name and handle too (profile reports are usually about those).
  // The new handle is random and valid; they can pick a better one on Edit profile.
  await db.from("profiles").update({ bio: null, home_city: null, tag: "Smashy player", handle: `player_${randomUUID().slice(0, 8)}` }).eq("id", userId);
  await removeAvatar(userId);
}

/** Undo a removal. */
export async function restorePost(postId: string) {
  const moderatorId = await requireModerator();
  const db = createAdminClient();
  const { data: was } = await db.from("posts").select("parent_id, removed_at").eq("id", postId).maybeSingle();
  await db.from("posts").update({ removed_at: null, removed_reason: null }).eq("id", postId);
  if (was?.parent_id && was.removed_at) await adjustReplyCount(was.parent_id as string, 1);
  await db.from("moderation_actions").insert({ moderator_id: moderatorId, action: "restore_post", post_id: postId });
  refresh();
}

// ---------- Majors ----------

/** Feature a tournament as a major (start.gg link or slug). */
export async function addMajor(_prev: { ok?: boolean; error?: string }, formData: FormData) {
  await requireModerator();
  const res = await featureMajor(String(formData.get("link") ?? ""));
  if (res.ok) {
    updateTag(MAJORS_TAG); // records and side columns drop it at once (round 634)
    refresh();
  }
  return res;
}

/** Hide a major from Smashy, or bring it back. */
export async function toggleMajorHidden(slug: string, hidden: boolean) {
  await requireModerator();
  await setMajorHidden(slug, hidden);
  updateTag(MAJORS_TAG); // round 634
  refresh();
}

/** Smash history: add a major from before start.gg by hand (docs/archive-plan.md, step A3). */
export async function addHandMajorAction(_prev: { ok?: boolean; error?: HandProblem; slug?: string }, formData: FormData) {
  const userId = await requireModerator();
  const text = (k: string) => String(formData.get(k) ?? "");
  const res = await addHandMajor(
    {
      name: text("name"),
      start: text("start"),
      end: text("end"),
      city: text("city"),
      country: text("country"),
      sourceUrl: text("source"),
      games: Array.from({ length: HAND_GAME_BLOCKS }, (_, i) => ({ game: text(`game${i}`), eventName: text(`event${i}`), entrants: text(`entrants${i}`), top8: text(`top8_${i}`) })),
    },
    userId,
  );
  if (res.ok) {
    updateTag(MAJORS_TAG);
    refresh();
  }
  return res;
}

/** Smash history: approve (adds the major, credits the member) or reject a member's suggestion. */
export async function reviewMajorSuggestion(id: string, approve: boolean) {
  const adminId = await requireModerator();
  const res = await reviewSuggestion(id, approve, adminId);
  if (res.error) throw new Error(res.error);
  if (approve) updateTag(MAJORS_TAG);
  refresh();
}

/** Smash history: an admin adds a moment to the timeline (shown right away). */
export async function addMomentAction(_prev: { ok?: boolean; error?: HandProblem }, formData: FormData) {
  const adminId = await requireModerator();
  const text = (k: string) => String(formData.get(k) ?? "");
  const res = await addMoment({ day: text("day"), title: text("title"), note: text("note"), link: text("link"), game: text("game") }, adminId);
  if (res.ok) refresh();
  return res;
}

/** Smash history: approve or reject a member's moment, or take an approved one down. */
export async function reviewMomentAction(id: string, approve: boolean) {
  const adminId = await requireModerator();
  await reviewMoment(id, approve, adminId);
  refresh();
}

/** Smash history: approve or reject a member's top 8 VOD, or take an approved one down. */
export async function reviewMajorVodAction(id: string, approve: boolean) {
  const adminId = await requireModerator();
  await reviewMajorVod(id, approve, adminId);
  refresh();
}

/** Smash history: link a name in older results to a start.gg player (a suggestion, or a pasted id/link). */
export async function linkNameAction(name: string, suggested: string | null, _prev: { ok?: boolean; error?: string }, formData: FormData) {
  const adminId = await requireModerator();
  const playerId = suggested ?? readPlayerId(String(formData.get("player") ?? ""));
  if (!playerId) return { error: "Paste a start.gg player id or a Smashy player page link (smashy.gg/players/…)." };
  // "game": one game only (a tag two people used in different games), or empty for every game.
  const res = await linkName(name, playerId, adminId, String(formData.get("game") ?? "") || null);
  if (res.ok) refresh();
  return res;
}

/** Smash history: link a name to a suggested player (a button). */
export async function linkSuggestedAction(name: string, playerId: string) {
  const adminId = await requireModerator();
  const res = await linkName(name, playerId, adminId);
  if (res.error) throw new Error(res.error);
  refresh();
}

/** Smash history: link every name that matches exactly one known player. */
export async function linkAllExactAction() {
  const adminId = await requireModerator();
  await linkAllExact(adminId);
  refresh();
}

/** Smash history: remove a name link. */
export async function unlinkNameAction(key: string) {
  await requireModerator();
  await unlinkName(key);
  refresh();
}

/** Smash history: mark a reported mistake done. */
export async function resolveReportAction(id: string) {
  await requireModerator();
  await resolveReport(id);
  refresh();
}

/** Smash history: save changes to a major added by hand (its details and every game's results). */
export async function updateHandMajorAction(slug: string, _prev: { ok?: boolean; error?: HandProblem; slug?: string }, formData: FormData): Promise<{ ok?: boolean; error?: HandProblem; slug?: string }> {
  await requireModerator();
  const text = (k: string) => String(formData.get(k) ?? "");
  const blocks = Math.min(HAND_MAX_BLOCKS, Math.max(1, Number(text("blocks")) || HAND_GAME_BLOCKS));
  const res = await updateHandMajor(slug, {
    name: text("name"),
    start: text("start"),
    end: text("end"),
    city: text("city"),
    country: text("country"),
    sourceUrl: text("source"),
    games: Array.from({ length: blocks }, (_, i) => ({ game: text(`game${i}`), eventName: text(`event${i}`), entrants: text(`entrants${i}`), top8: text(`top8_${i}`) })),
  });
  if (res.ok) {
    updateTag(MAJORS_TAG);
    refresh();
  }
  return res.ok ? { ok: true, slug } : res;
}

/** Smash history: remove a major added by hand (and its results). */
export async function removeHandMajor(slug: string) {
  await requireModerator();
  await deleteHandMajor(slug);
  updateTag(MAJORS_TAG);
  refresh();
}

/** Re-scan start.gg now (takes about a minute, runs after the click returns). */
export async function rescanMajors() {
  await requireModerator();
  after(() => runRefresh("majors", 0, syncMajors));
}

// ---------- Reels ----------

/** Approve a Twitch channel for Reels (link or name), then collect its clips. */
export async function addChannel(_prev: { ok?: boolean; error?: string }, formData: FormData) {
  await requireModerator();
  const res = await addReelChannel(String(formData.get("channel") ?? ""));
  if (res.ok) {
    after(() => runRefresh("reels", 0, syncReels));
    refresh();
  }
  return res;
}

/** Approve a YouTube channel for Reels (link, @handle or id), then collect its Shorts. */
export async function addYouTube(_prev: { ok?: boolean; error?: string }, formData: FormData) {
  await requireModerator();
  const res = await addYouTubeChannel(String(formData.get("channel") ?? ""), String(formData.get("game") ?? ""));
  if (res.ok) {
    after(() => runRefresh("reels", 0, syncReels));
    refresh();
  }
  return res;
}

/** Set a YouTube channel's usual game (used when a Short's title doesn't name one). */
export async function setChannelGame(login: string, formData: FormData) {
  await requireModerator();
  await setReelChannelGame(login, String(formData.get("game") ?? ""));
  after(() => runRefresh("reels", 0, syncReels));
  refresh();
}

/** Private beta: turn invite-only on or off. */
export async function toggleInviteOnly(on: boolean) {
  await requireModerator();
  await setInviteOnly(on);
  updateTag(INVITE_ONLY_TAG); // every server sees the change at once
  refresh();
}

/** Make an invite code (for one person, or a group with more uses). */
export async function makeInvite(_prev: { code?: string; error?: string }, formData: FormData): Promise<{ code?: string; error?: string }> {
  const userId = await requireModerator();
  try {
    const code = await createInviteCode(userId, Number(formData.get("uses") ?? 1), String(formData.get("note") ?? "").trim() || null);
    refresh();
    return { code };
  } catch {
    return { error: "Couldn't make a code. Please try again." };
  }
}

export async function toggleInviteDisabled(code: string, disabled: boolean) {
  await requireModerator();
  await setInviteDisabled(code, disabled);
  refresh();
}

/** Approve a clip someone shared (into Reels, under the chosen game) or reject it. */
export async function reviewClip(id: string, approve: boolean, formData: FormData) {
  await requireModerator();
  await reviewSubmission(id, approve, String(formData.get("game") ?? ""));
  refresh();
}

/** Help build Smashy (round 653): mark a community suggestion done (acted on) or dismissed. */
export async function closeCommunitySuggestion(id: string, status: "done" | "dismissed") {
  await requireModerator();
  await closeSuggestion(id, status);
  refresh();
}

/** Approve a suggested channel, then collect its clips. */
export async function approveChannel(login: string) {
  await requireModerator();
  await approveReelChannel(login);
  after(() => runRefresh("reels", 0, syncReels));
  refresh();
}

/** Block a channel (its clips disappear and it won't be re-added automatically), or unblock it. */
export async function toggleChannelBlocked(login: string, blocked: boolean) {
  await requireModerator();
  await setReelChannelBlocked(login, blocked);
  refresh();
}

/** Hide one clip from Reels, or bring it back. */
export async function toggleReelHidden(clipId: string, hidden: boolean) {
  await requireModerator();
  await setReelHidden(clipId, hidden);
  refresh();
}

/** Collect clips now instead of waiting for the next automatic run. */
export async function refreshReelsNow() {
  await requireModerator();
  after(() => runRefresh("reels", 0, syncReels));
}

/** Approve or reject a scene's custom emoji. */
export async function reviewSceneEmoji(id: string, approve: boolean) {
  await requireModerator();
  await decideSceneEmoji(id, approve);
  refresh();
}

/** Suspend an account (they can't sign in until unsuspended). Not other site admins, not yourself. */
export async function suspendUser(userId: string, formData: FormData) {
  const me = await requireModerator();
  const reason = String(formData.get("reason") ?? "").trim();
  if (userId === me || (await isSiteAdmin(userId))) return;
  const { suspendAccount } = await import("@/lib/accounts");
  await suspendAccount(userId, reason || "Broke Smashy's rules", me);
  refresh();
}

export async function unsuspendUser(userId: string) {
  await requireModerator();
  const { unsuspendAccount } = await import("@/lib/accounts");
  await unsuspendAccount(userId);
  refresh();
}

/** Mark an error in the error log as handled (it comes back if it happens again). */
export async function resolveError(id: string) {
  await requireModerator();
  await createAdminClient().from("error_reports").update({ resolved_at: new Date().toISOString() }).eq("id", id);
  refresh();
}

/**
 * Hide a start.gg player from player lookup (someone asked not to be listed): they stop showing
 * in Search > Players and have no player page or head-to-head card. Takes their Smashy player
 * page link, their start.gg player id, or their start.gg profile link.
 */
export async function hideStartggPlayer(_prev: { done?: string; error?: string }, formData: FormData): Promise<{ done?: string; error?: string }> {
  const moderatorId = await requireModerator();
  const ref = playerRef(String(formData.get("player") ?? "").slice(0, 200));
  if (!ref) return { error: "Paste their player page link from Smashy, their start.gg player id, or their start.gg profile link." };
  const player = await ("slug" in ref ? getStartggPlayerBySlug(ref.slug) : getStartggPlayer(ref.id)).catch(() => undefined);
  if (player === undefined) return { error: "start.gg didn't answer. Try again in a minute." };
  if (!player) return { error: "No start.gg player matches that." };
  await setPlayerHidden(player.playerId, true, player);
  await createAdminClient().from("moderation_actions").insert({ moderator_id: moderatorId, action: "hide_startgg_player", reason: `player ${player.playerId}` });
  refresh();
  return { done: `${player.tag} is hidden from player lookup.` };
}

/** List a hidden start.gg player again. */
export async function unhideStartggPlayer(playerId: string) {
  const moderatorId = await requireModerator();
  if (await setPlayerHidden(playerId, false)) {
    await createAdminClient().from("moderation_actions").insert({ moderator_id: moderatorId, action: "unhide_startgg_player", reason: `player ${playerId}` });
  }
  refresh();
}
