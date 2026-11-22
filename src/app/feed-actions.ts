"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { CHARACTERS } from "@/lib/characters";
import { characterFromText } from "@/lib/hashtags";
import { FEED_GAMES, POST_MAX_LENGTH, sceneEmojiUrl, type FeedGame } from "@/lib/posts";
import { isFlair, POLL_LENGTHS, THREAD_MAX_LENGTH, THREAD_TITLE_MAX, THREAD_TITLE_MIN } from "@/lib/postConstants";
import { actionError, GENERIC_ACTION_ERROR, GONE_ERROR, type ActionResult } from "@/lib/actionErrors";
import { postErrorMessage } from "@/lib/postErrors";
import { searchPeople } from "@/lib/search";
import { after } from "next/server";
import { attachImages, checkImagesUsable, cleanupPostImages, uploadPostImage, type UploadedImage } from "@/lib/postImages";
import { parseMediaList } from "@/lib/postMedia";
import { attachVideo, cleanupPostVideos, startVideoUpload, videoUsable } from "@/lib/postVideos";
import { isValidReaction, type SceneEmoji } from "@/lib/reactions";
import { getPlayerHistory, getPlayerRecent } from "@/lib/startgg";
import { composerTemplates } from "@/lib/composerTemplates";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getVerifiedUserId } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { firstClipLinkIn } from "@/lib/reelLinks";
import { submitClip, type ShareProblem } from "@/lib/reelSubmissions";

type Translate = Awaited<ReturnType<typeof getT>>;

export type ComposeState = { error?: string; ok?: number; postId?: string };

async function requireUser() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/signin");
  return userId;
}

function cleanBody(t: Translate, raw: FormDataEntryValue | null, max = POST_MAX_LENGTH): string | { error: string } {
  const body = String(raw ?? "").replace(/\r\n/g, "\n").trim();
  if (!body) return { error: t("feed.err.empty") };
  if (body.length > max) return { error: t("feed.err.tooLong", { n: max }) };
  return body;
}

const friendlyError = (error: { message: string; code?: string }) => postErrorMessage(error.message, error.code);

/** Plain text post or reply, or a discussion thread (a post with a title). */
export async function createPost(_prev: ComposeState, formData: FormData): Promise<ComposeState> {
  const userId = await requireUser();
  const t = await getT();
  const parentId = formData.get("parent_id") ? String(formData.get("parent_id")) : null;
  // A discussion thread: a top-level post with a title (and a flair), allowed to be longer.
  const title = parentId ? "" : String(formData.get("title") ?? "").replace(/\s+/g, " ").trim();
  if (title && (title.length < THREAD_TITLE_MIN || title.length > THREAD_TITLE_MAX)) {
    return { error: t("feed.err.titleLength", { min: THREAD_TITLE_MIN, max: THREAD_TITLE_MAX }) };
  }
  const flairRaw = String(formData.get("flair") ?? "discussion");
  const flair = title ? (isFlair(flairRaw) ? flairRaw : "discussion") : null;
  const body = cleanBody(t, formData.get("body"), title ? THREAD_MAX_LENGTH : POST_MAX_LENGTH);
  if (typeof body !== "string") return body;
  const replyToRaw = parentId ? String(formData.get("reply_to") ?? "") : "";
  const replyTo = /^[0-9a-f-]{36}$/i.test(replyToRaw) ? replyToRaw : null;
  const spoiler = formData.get("spoiler") === "on" || formData.get("spoiler") === "true";

  const rulesetId = !parentId && formData.get("ruleset_id") ? String(formData.get("ruleset_id")) : null;
  const quoteOf = !parentId && formData.get("quote_of") ? String(formData.get("quote_of")) : null;
  const gameRaw = String(formData.get("game") ?? "general");
  let game: FeedGame = (FEED_GAMES as readonly string[]).includes(gameRaw) ? (gameRaw as FeedGame) : "general";

  // Character tag: picked in the composer, or found in hashtags like #SSBU_CLOUD / #fox.
  let character: string | null = null;
  if (!parentId) {
    const picked = String(formData.get("character") ?? "");
    if (game !== "general" && picked && CHARACTERS[game].some((c) => c.key === picked)) character = picked;
    if (!character) {
      const fromTags = characterFromText(body, game === "general" ? null : game);
      if (fromTags && (game === "general" || fromTags.game === game)) {
        game = fromTags.game; // "#SSBU_CLOUD" in a General post files it under Ultimate
        character = fromTags.character;
      }
    }
  }

  // Matchup tag ("Fox vs Marth"): only with a character, and a different one from the same game.
  let vsCharacter: string | null = null;
  const vsPicked = parentId ? "" : String(formData.get("vs_character") ?? "");
  if (character && game !== "general" && vsPicked && vsPicked !== character && CHARACTERS[game].some((c) => c.key === vsPicked)) vsCharacter = vsPicked;

  // Photos and videos in one order: up to 4, at most 2 videos (round 450). Each keeps its place.
  const media = parseMediaList(formData.get("media"), formData.get("images"), formData.get("video"));
  const images = media.flatMap((m, position) => (m.kind === "image" ? [{ id: m.id, alt: m.alt, position }] : []));
  const videos = media.flatMap((m, position) => (m.kind === "video" ? [{ id: m.id, position }] : []));
  const imageProblem = await checkImagesUsable(userId, images);
  if (imageProblem) return { error: imageProblem };
  for (const v of videos) if (!(await videoUsable(userId, v.id))) return { error: t("feed.video.expired") };
  const poll = parsePoll(t, formData);
  if (typeof poll === "string") return { error: poll };
  if (poll && (parentId || quoteOf || rulesetId)) return { error: t("feed.err.pollNewOnly") };

  const supabase = await createClient();
  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      author_id: userId,
      parent_id: parentId,
      game,
      body,
      ...(character ? { character } : {}),
      ...(title ? { title, flair } : {}),
      ...(replyTo ? { reply_to: replyTo } : {}),
      ...(spoiler ? { spoiler: true } : {}),
      ...(vsCharacter ? { vs_character: vsCharacter } : {}),
      ...(rulesetId ? { ruleset_id: rulesetId } : {}),
      ...(quoteOf ? { quote_of: quoteOf } : {}),
    })
    .select("id")
    .single();
  if (error) {
    console.error("createPost failed", error.code, error.message);
    return { error: friendlyError(error) };
  }
  if (images.length && !(await attachImages(userId, post.id, images))) {
    refresh();
    return { ok: Date.now(), error: t("feed.err.photoFailed") };
  }
  for (const v of videos) {
    if (!(await attachVideo(userId, post.id, v.id, v.position))) {
      refresh();
      return { ok: Date.now(), error: t("feed.err.videoFailed") };
    }
  }
  if (poll) {
    const closesAt = new Date(Date.now() + poll.hours * 3600_000).toISOString();
    const { error: pollError } = await supabase.from("polls").insert({ post_id: post.id, options: poll.options, closes_at: closesAt });
    if (pollError) {
      console.error("poll insert failed", pollError.code, pollError.message);
      refresh();
      return { ok: Date.now(), error: t("feed.err.pollFailed") };
    }
  }
  // "Also share to Reels" (round 460): the clip waits for a site admin, as from the Reels share page.
  // A problem with it never undoes the post; it's said below the box instead.
  const reelLink = !parentId && !rulesetId && !spoiler && game !== "general" && formData.get("to_reels") === "on" ? firstClipLinkIn(body) : null;
  if (reelLink) {
    const shared = await submitClip(userId, reelLink, game).catch((): { error: ShareProblem } => ({ error: { key: "feed.compose.toReelsFailed" } }));
    if (shared.error) {
      refresh();
      return { ok: Date.now(), error: `${t("feed.compose.toReelsNot")} ${t(shared.error.key, shared.error.values)}` };
    }
  }
  refresh();
  return { ok: Date.now(), ...(title ? { postId: post.id as string } : {}) };
}



/** A poll from the composer: null if none, a message if it's not right. */
function parsePoll(t: Translate, formData: FormData): { options: string[]; hours: number } | null | string {
  const raw = formData.get("poll_options");
  if (!raw) return null;
  let list: unknown;
  try {
    list = JSON.parse(String(raw));
  } catch {
    return t("feed.err.pollRead");
  }
  if (!Array.isArray(list)) return t("feed.err.pollRead");
  const options = list.map((o) => String(o).replace(/\s+/g, " ").trim()).filter(Boolean);
  if (options.length < 2) return t("feed.err.pollMin");
  if (options.length > 4) return t("feed.err.pollMax");
  if (options.some((o) => o.length > 40)) return t("feed.err.pollChoiceLong");
  if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) return t("feed.err.pollSame");
  const hours = Number(formData.get("poll_hours"));
  if (!(POLL_LENGTHS as readonly number[]).includes(hours)) return t("feed.err.pollHours");
  return { options, hours };
}

/** Vote in a poll (once; votes are private). */
export async function votePoll(postId: string, choice: number): Promise<ActionResult> {
  const userId = await requireUser();
  if (!Number.isInteger(choice) || choice < 0 || choice > 3) return { error: GENERIC_ACTION_ERROR };
  const supabase = await createClient();
  const { error } = await supabase.from("poll_votes").insert({ post_id: postId, user_id: userId, choice });
  if (error && error.code === "42501") return { error: (await getT())("feed.err.pollClosed") };
  if (error) return actionError(error);
  // No page refresh: the poll shows its results itself (and re-running the feed would reshuffle For You).
  return {};
}

/**
 * Starts a video upload for the post being written: a one-time link the browser sends the file to.
 * The server then checks and prepares it (POST /api/post-videos/finish).
 */
export async function startVideo(size: number, type: string): Promise<{ id: string; path: string; token: string } | { error: string }> {
  const userId = await requireUser();
  const res = await startVideoUpload(userId, Number(size), String(type));
  if ("error" in res) return { error: (await getT())(res.error, res.values) };
  return res;
}

/** Uploads one photo for the post being written (checked for safety first). */
export async function uploadImage(formData: FormData): Promise<{ image?: UploadedImage; error?: string }> {
  const userId = await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: (await getT())("feed.err.pickImage") };
  const res = await uploadPostImage(userId, file);
  return typeof res === "string" ? { error: res } : { image: res };
}

/**
 * "I placed X/Y at Z!" or "I signed up for Z!".
 * The event card is checked against the user's own start.gg history, then saved by the server,
 * so result cards can't be faked.
 */
export async function createTemplatePost(_prev: ComposeState, formData: FormData): Promise<ComposeState> {
  const userId = await requireUser();
  const t = await getT();
  const body = cleanBody(t, formData.get("body"));
  if (typeof body !== "string") return body;
  const kind = String(formData.get("kind"));
  const eventId = String(formData.get("event_id") ?? "");
  if (kind !== "placed" && kind !== "signed_up") return { error: t("feed.err.pickEvent") };

  const supabase = await createClient();
  const { data: link } = await supabase.from("startgg_links").select("startgg_user_id, startgg_player_id").eq("user_id", userId).maybeSingle();
  if (!link) return { error: t("feed.err.linkStartgg") };

  // The same choices the composer offered: fresh (minutes) and history (hours), so a brand-new
  // sign-up or tonight's placement can be posted right away.
  const [history, fresh] = await Promise.all([
    getPlayerHistory(link.startgg_user_id).catch(() => null),
    // With the player id, like the composer (round 463): events an organizer added you to are found
    // through your sets, and without it posting their card failed with "Couldn't confirm".
    getPlayerRecent(link.startgg_user_id, link.startgg_player_id).catch(() => []),
  ]);
  const options = composerTemplates(fresh, history?.entries ?? [], Math.floor(Date.now() / 1000));
  const entry = (kind === "placed" ? options.results : options.signups).find((e) => e.eventId === eventId);
  if (!entry) return { error: t("feed.err.notConfirmed") };

  // These posts are saved by the server (so cards can't be faked), which means the database can't
  // tell who is posting: the "one card per event" and new-account limits are checked here instead.
  const db = createAdminClient();
  const [{ data: profile }, { count: lastHour }, { data: already }, { data: siteAdmin }] = await Promise.all([
    db.from("profiles").select("created_at").eq("id", userId).maybeSingle(),
    db.from("posts").select("id", { count: "exact", head: true }).eq("author_id", userId).gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString()),
    db.from("posts").select("id").eq("author_id", userId).eq("template", kind).eq("tournament_slug", entry.tournamentSlug).eq("event_name", entry.eventName).is("removed_at", null).limit(1),
    db.from("site_admins").select("user_id").eq("user_id", userId).maybeSingle(),
  ]);
  if (already?.length) return { error: t("feed.err.alreadyShared") };
  const newAccount = !!profile && Date.parse(profile.created_at as string) > Date.now() - 7 * 24 * 60 * 60 * 1000;
  if (newAccount && !siteAdmin && (lastHour ?? 0) >= 10) return { error: t("feed.err.newAccount") };

  const { error } = await db
    .from("posts")
    .insert({
      author_id: userId,
      game: entry.game,
      body,
      spoiler: formData.get("spoiler") === "on" || formData.get("spoiler") === "true",
      template: kind,
      tournament_slug: entry.tournamentSlug,
      tournament_name: entry.tournamentName,
      event_name: entry.eventName,
      event_start_at: new Date(entry.startAt * 1000).toISOString(),
      placement: kind === "placed" ? entry.placement : null,
      num_entrants: entry.numEntrants && entry.numEntrants > 0 ? entry.numEntrants : null,
    });
  if (error) {
    console.error("createTemplatePost failed", error.code, error.message);
    return { error: friendlyError(error) };
  }
  refresh();
  return { ok: Date.now() };
}

/** Like actionError, but says so plainly when the post was deleted while someone was looking at it. */
async function postActionError(supabase: Awaited<ReturnType<typeof createClient>>, postId: string, error: { code?: string; message: string }): Promise<ActionResult> {
  const res = actionError(error);
  if (res.error !== GENERIC_ACTION_ERROR) return res;
  const { data } = await supabase.from("posts").select("id").eq("id", postId).maybeSingle();
  return data ? res : { error: GONE_ERROR };
}

export async function toggleLike(postId: string, like: boolean): Promise<ActionResult> {
  const userId = await requireUser();
  const supabase = await createClient();
  const { error } = like
    ? await supabase.from("post_likes").upsert({ post_id: postId, user_id: userId }, { onConflict: "post_id,user_id", ignoreDuplicates: true })
    : await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId);
  if (error) return postActionError(supabase, postId, error);
  // No page refresh: the heart keeps its own count, and re-running the feed would reshuffle For You.
  return {};
}

export async function toggleRepost(postId: string, repost: boolean): Promise<ActionResult> {
  const userId = await requireUser();
  const supabase = await createClient();
  const { error } = repost
    ? await supabase.from("reposts").upsert({ post_id: postId, user_id: userId }, { onConflict: "post_id,user_id", ignoreDuplicates: true })
    : await supabase.from("reposts").delete().eq("post_id", postId).eq("user_id", userId);
  if (error) return postActionError(supabase, postId, error);
  // No page refresh, like the heart: the button keeps its own count.
  return {};
}

/** @mention suggestions while typing (people you can see, by tag or handle). */
export async function suggestHandles(q: string): Promise<{ tag: string; handle: string; avatarUrl: string | null }[]> {
  await requireUser();
  const term = String(q ?? "").replace(/[^A-Za-z0-9_]/g, "").slice(0, 20);
  if (term.length < 1) return [];
  return (await searchPeople(term.length < 2 ? `${term}` : term, 5)).map((p) => ({ tag: p.tag, handle: p.handle, avatarUrl: p.avatarUrl }));
}

/** Fix a typo: edit your own post within 15 minutes of posting. */
export async function editPost(postId: string, body: string): Promise<ActionResult> {
  const userId = await requireUser();
  const supabase = await createClient();
  const text = String(body ?? "").replace(/\r\n/g, "\n");
  const { data: before } = await supabase.from("posts").select("body").eq("id", postId).eq("author_id", userId).maybeSingle();
  const { error } = await supabase.rpc("edit_post", { post: postId, new_body: text });
  if (error) return actionError(error);
  // A hashtag like #SSBU_CLOUD files a post under that character: re-check it after the edit.
  const { data: post } = await supabase.from("posts").select("game, character, vs_character, parent_id").eq("id", postId).eq("author_id", userId).maybeSingle();
  // A matchup ("Fox vs Marth") was picked on purpose: hashtags in the edited text don't change it.
  if (post && !post.parent_id && !post.vs_character) {
    const game = post.game === "general" ? null : (post.game as Exclude<FeedGame, "general">);
    const tagged = characterFromText(text, game);
    const next = tagged && (post.game === "general" || tagged.game === post.game) ? tagged : null;
    if (next && (next.character !== post.character || next.game !== post.game)) {
      await createAdminClient().from("posts").update({ character: next.character, game: next.game }).eq("id", postId).eq("author_id", userId);
    } else if (!next && post.character && before) {
      // The hashtag that tagged it was taken out: untag it (a character picked in the composer, with
      // no hashtag behind it, stays).
      const old = characterFromText(before.body as string, game);
      if (old && old.character === post.character) {
        await createAdminClient().from("posts").update({ character: null }).eq("id", postId).eq("author_id", userId);
      }
    }
  }
  refresh();
  return {};
}

/**
 * Moves your own post to another game's feed (or General), any time: a post filed under the wrong
 * game is easy to do and the text-edit window is only 15 minutes. Top-level posts only (replies
 * follow their thread). A character or matchup tag is cleared, since characters belong to a game.
 */
export async function setPostGame(postId: string, game: string): Promise<ActionResult> {
  const userId = await requireUser();
  if (!(FEED_GAMES as readonly string[]).includes(game)) return { error: GENERIC_ACTION_ERROR };
  const supabase = await createClient();
  const { data: post } = await supabase.from("posts").select("game, parent_id, removed_at").eq("id", postId).eq("author_id", userId).maybeSingle();
  if (!post || post.parent_id || post.removed_at) return { error: GONE_ERROR };
  if (post.game === game) return {};
  const { error } = await createAdminClient()
    .from("posts")
    .update({ game, character: null, vs_character: null })
    .eq("id", postId)
    .eq("author_id", userId)
    .is("parent_id", null);
  if (error) return actionError(error);
  refresh();
  return {};
}

/** Save a post to your bookmarks (private), or remove it. */
export async function toggleBookmark(postId: string, save: boolean): Promise<ActionResult> {
  const userId = await requireUser();
  const supabase = await createClient();
  const { error } = save
    ? await supabase.from("bookmarks").insert({ user_id: userId, post_id: postId })
    : await supabase.from("bookmarks").delete().eq("user_id", userId).eq("post_id", postId);
  if (error && error.code !== "23505") return actionError(error);
  // No page refresh: the menu keeps its own state (the Saved page reloads itself).
  return {};
}

/** Pin one of your posts to the top of your profile (or unpin with null). */
export async function setPinnedPost(postId: string | null): Promise<ActionResult> {
  const userId = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ pinned_post_id: postId }).eq("id", userId);
  if (error) return actionError(error);
  refresh();
  return {};
}

export async function deletePost(postId: string, redirectTo?: string) {
  const userId = await requireUser();
  const supabase = await createClient();
  await supabase.from("posts").delete().eq("id", postId).eq("author_id", userId);
  after(() => cleanupPostImages().catch((e) => console.error("Image cleanup failed", e))); // its photos go too
  after(() => cleanupPostVideos().catch((e) => console.error("Video cleanup failed", e))); // and its video
  if (redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")) redirect(redirectTo);
  refresh();
}

const REPORT_REASONS = ["spam", "harassment", "inappropriate", "off_topic", "other"];

export async function reportPost(postId: string, reason: string, details: string): Promise<{ ok?: boolean; error?: string }> {
  const userId = await requireUser();
  if (!REPORT_REASONS.includes(reason)) return { error: (await getT())("feed.err.pickReason") };
  const supabase = await createClient();
  const { error } = await supabase
    .from("post_reports")
    .insert({ post_id: postId, reporter_id: userId, reason, details: details.trim().slice(0, 500) || null });
  // 23505 = already reported by this user: treat as done.
  if (error && error.code !== "23505") {
    const t = await getT();
    return { error: error.code === "P0429" ? t("feed.err.tooManyReports") : t("feed.err.reportFailed") };
  }
  // Also keep it out of the reporter's For You feed.
  await supabase.from("post_dismissals").upsert({ user_id: userId, post_id: postId }, { ignoreDuplicates: true });
  return { ok: true };
}

/** "Not interested": hides the post from your For You feed and shows that person's posts less for 30 days. */
export async function dismissPost(postId: string): Promise<{ ok?: boolean; error?: string }> {
  const userId = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("post_dismissals").upsert({ user_id: userId, post_id: postId }, { ignoreDuplicates: true });
  if (error) return { error: (await getT())("common.tryAgain") };
  // No page refresh: the card hides itself (re-running the feed would reshuffle For You).
  return { ok: true };
}

/** Add or remove one emoji reaction (the heart is separate). */
export async function toggleReaction(postId: string, emoji: string, on: boolean): Promise<{ error?: string }> {
  const userId = await requireUser();
  if (!isValidReaction(emoji)) return { error: (await getT())("feed.err.emoji") };
  const supabase = await createClient();
  const { error } = on
    ? await supabase.from("post_reactions").insert({ post_id: postId, user_id: userId, emoji })
    : await supabase.from("post_reactions").delete().eq("post_id", postId).eq("user_id", userId).eq("emoji", emoji);
  // Messages from the database checks are written for people ("Join that scene to use its emojis.").
  if (error) {
    const res = actionError(error);
    if (res.error) return res;
  }
  // No page refresh, like the heart: the chips keep their own counts.
  return {};
}

/** Approved emojis from scenes you've joined (for the reaction picker). */
export async function getMySceneEmojis(): Promise<SceneEmoji[]> {
  const userId = await getVerifiedUserId();
  if (!userId) return [];
  const supabase = await createClient();
  const { data: member } = await supabase.from("scene_members").select("scene_id").eq("user_id", userId);
  const ids = (member ?? []).map((m) => m.scene_id);
  if (!ids.length) return [];
  const { data } = await supabase
    .from("scene_emojis")
    .select("id, name, image_path, scene:scenes(name)")
    .in("scene_id", ids)
    .eq("status", "approved")
    .order("name");
  return (data ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    url: sceneEmojiUrl(e.image_path),
    sceneName: (e.scene as unknown as { name: string } | null)?.name ?? "",
  }));
}
