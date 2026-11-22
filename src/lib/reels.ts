// Reels: the best recent Twitch clips and YouTube Shorts from approved channels.
// The server refreshes them every few hours in the background (like majors); pages read the table.
import "server-only";
import { connection } from "next/server";
import { gamesFor, isGameKey, type GameKey } from "./games";
import { runRefresh } from "./refreshJobs";
import { cleanPublicText } from "./wordFilter";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";
import { createGuestClient } from "./supabase/guest";
import { cacheLife } from "next/cache";
import { TWITCH_GAMES, getChannelClips, getTopGameClips, getTwitchUsers, getTwitchUsersByIds, type TwitchClip } from "./twitch";
import { TOP_CLIP_WINDOWS_DAYS, isLowQualityClip, topClipMinViews } from "./reelQuality";
import { findYouTubeChannel, getChannelShorts, getYouTubeVideos, guessGame, hasYouTubeKey, type YouTubeVideo } from "./youtube";
import type { ReelPlatform } from "./reelLinks";
import { rankTopClips } from "./topClips";
import { mixPage, postsBefore, rankPostVideos } from "./reelMix";
import { getReelPostVideos, type Post } from "./posts";

export type { ReelPlatform } from "./reelLinks";

// Refreshed when someone opens Reels and the last run is this old (plus the daily job).
const REFRESH_MINUTES = 60;
const CLIP_DAYS = 14; // how far back to look for clips
const SHOW_DAYS = 30; // how long a clip can stay in Reels
// YouTube's rules: data from its API must be refreshed (or deleted) at least every 30 days.
const YOUTUBE_REFRESH_DAYS = 7;

export type Reel = {
  clipId: string; // Twitch clip slug, YouTube video id, or "post-<post id>" for a video from a post
  platform: ReelPlatform | "smashy"; // "smashy": a video someone attached to a post (see `post`)
  channelLogin: string;
  channelName: string | null;
  title: string;
  game: GameKey;
  views: number;
  duration: number | null;
  thumbnailUrl: string | null;
  videoId: string | null;
  vodOffset: number | null;
  createdAt: string;
  comments: number;
  likes: number;
  sharedBy: { tag: string; handle: string } | null; // a clip someone shared (null for teens, to guests)
  /** Set for a video from a post: the post, the file, and whether the viewer liked the post. */
  post?: { id: string; videoUrl: string; width: number; height: number; likedByMe: boolean; authorHandle: string };
};
/** A Twitch or YouTube clip (everything from the reels table). */
export type ExternalReel = Reel & { platform: ReelPlatform };

export type ReelChannel = {
  login: string; // Twitch login, or YouTube channel id (UC…)
  platform: ReelPlatform;
  displayName: string | null;
  source: "admin" | "auto" | "submitted" | "top"; // top = found through Twitch-wide top clips
  approved: boolean;
  blocked: boolean;
  twitchId: string | null;
  defaultGame: GameKey | null; // YouTube: the game when a Short's title doesn't say
};

// ---------- Keeping clips fresh ----------

/** Fetches the latest top clips and Shorts from every approved channel. Takes a few seconds per 10 channels. */
export async function syncReels() {
  const twitch = await syncTwitchClips();
  // The most-watched recent Smash clips across all of Twitch (optional extra: failures don't stop the rest).
  let top = 0;
  try {
    top = await syncTopTwitchClips();
  } catch (e) {
    console.error("Twitch top clips sync failed", e);
  }
  // YouTube is optional: without a key (or if YouTube is down) Twitch clips still refresh.
  let youtube = 0;
  if (hasYouTubeKey()) {
    try {
      youtube = await syncYouTubeShorts();
    } catch (e) {
      console.error("YouTube Shorts sync failed", e);
    }
  }
  return twitch + top + youtube;
}

/** One collected Twitch clip, ready to save (title cleaned, junk flagged). */
function twitchRow(clip: TwitchClip, login: string, game: GameKey, minViews?: number) {
  // Titles are written by whoever clipped it: mask swearing, hide anything worse (and flag it).
  const title = cleanPublicText(clip.title.slice(0, 200));
  return {
    clip_id: clip.id,
    channel_login: login,
    channel_name: clip.broadcaster_name,
    title: title.text,
    title_flagged: title.flagged,
    game,
    view_count: clip.view_count,
    duration: clip.duration,
    thumbnail_url: clip.thumbnail_url,
    video_id: clip.video_id || null,
    vod_offset: clip.vod_offset,
    created_at: clip.created_at,
    fetched_at: new Date().toISOString(),
    low_quality: isLowQualityClip(clip.title, clip.view_count, minViews),
  };
}

/**
 * The most-watched recent clips in each Smash category on all of Twitch (see reelQuality.ts for the bar).
 * Their channels are added as "top" channels: approved for showing these clips, not collected in full.
 * Blocked channels stay out.
 */
async function syncTopTwitchClips() {
  const db = createAdminClient();
  const now = Date.now();
  const byId = new Map<string, { clip: TwitchClip; game: GameKey }>();
  for (const [gameId, game] of Object.entries(TWITCH_GAMES)) {
    const big = game === "melee" || game === "ultimate";
    for (const days of TOP_CLIP_WINDOWS_DAYS) {
      const since = new Date(now - days * 86400e3);
      for (const clip of await getTopGameClips(gameId, since, big ? (days === 1 ? 50 : 100) : 30).catch(() => [])) {
        if (clip.view_count >= topClipMinViews(clip.created_at, now)) byId.set(clip.id, { clip, game });
      }
    }
  }
  const clips = [...byId.values()];
  if (!clips.length) return 0;

  // Channel logins (clips only carry the channel's id), and which channels are blocked.
  const users = await getTwitchUsersByIds([...new Set(clips.map((c) => c.clip.broadcaster_id))]);
  const loginOf = new Map(users.map((u) => [u.id, u]));
  await db.from("reel_channels").upsert(
    users.map((u) => ({ login: u.login, twitch_id: u.id, display_name: u.display_name, platform: "twitch", source: "top", approved: true })),
    { onConflict: "login", ignoreDuplicates: true }, // existing channels keep their settings (blocked stays blocked)
  );
  // Blocked by login or by Twitch id (so a blocked streamer who renames stays blocked).
  const { data: blocked } = await db.from("reel_channels").select("login, twitch_id").eq("blocked", true);
  const blockedSet = new Set((blocked ?? []).map((c) => c.login as string));
  const blockedIds = new Set((blocked ?? []).map((c) => c.twitch_id as string | null).filter(Boolean));

  const rows = clips.flatMap(({ clip, game }) => {
    const user = loginOf.get(clip.broadcaster_id);
    return user && !blockedSet.has(user.login) && !blockedIds.has(clip.broadcaster_id) ? [twitchRow(clip, user.login, game, topClipMinViews(clip.created_at, now))] : [];
  });
  await saveCollected(rows);

  return rows.length;
}

async function syncTwitchClips() {
  const db = createAdminClient();

  // 1) Channels that streamed majors are suggested automatically. They wait for an admin to approve
  //    them (any TO can type any channel on start.gg), and an admin-blocked channel stays blocked.
  const { data: majors } = await db.from("majors").select("stream_name").eq("stream_source", "TWITCH").not("stream_name", "is", null);
  const autoLogins = [...new Set((majors ?? []).map((m) => String(m.stream_name).toLowerCase()).filter((l) => /^[a-z0-9_]{2,25}$/.test(l)))];
  if (autoLogins.length) {
    await db.from("reel_channels").upsert(autoLogins.map((login) => ({ login, source: "auto" })), { onConflict: "login", ignoreDuplicates: true });
  }

  // 2) Look up Twitch ids for channels that don't have one yet.
  const { data: channels } = await db.from("reel_channels").select("login, twitch_id").eq("platform", "twitch").eq("blocked", false);
  const missing = (channels ?? []).filter((c) => !c.twitch_id).map((c) => c.login);
  if (missing.length) {
    for (const u of await getTwitchUsers(missing)) {
      await db.from("reel_channels").update({ twitch_id: u.id, display_name: u.display_name }).eq("login", u.login);
    }
  }

  // 3) Each channel's most-viewed smash clips from the last two weeks, plus its top clips from the
  //    last two days (so a fresh clip isn't crowded out by the fortnight's biggest ones).
  // ("top" channels only show their Twitch-wide top clips; they aren't collected in full.)
  const { data: ready } = await db.from("reel_channels").select("login, twitch_id").eq("platform", "twitch").eq("approved", true).eq("blocked", false).neq("source", "top").not("twitch_id", "is", null);
  const since = new Date(Date.now() - CLIP_DAYS * 86400e3);
  const recent = new Date(Date.now() - 2 * 86400e3);
  const rows = [];
  for (const c of ready ?? []) {
    const [older, fresh] = await Promise.all([getChannelClips(c.twitch_id!, since, 50).catch(() => []), getChannelClips(c.twitch_id!, recent, 20).catch(() => [])]);
    const clips = [...new Map([...older, ...fresh].map((x) => [x.id, x])).values()];
    for (const clip of clips) {
      const game = TWITCH_GAMES[clip.game_id];
      if (!game) continue; // tournament channels stream other games too
      rows.push(twitchRow(clip, c.login, game));
    }
  }
  await saveCollected(rows);
  return rows.length;
}

/**
 * Saves collected clips. `hidden` isn't sent, so a clip an admin hid stays hidden. Clips someone
 * shared keep the game an admin approved them under (only their numbers and details refresh).
 */
async function saveCollected(rows: ({ clip_id: string; game: GameKey } & Record<string, unknown>)[]) {
  if (!rows.length) return;
  const db = createAdminClient();
  const { data: shared } = await db.from("reels").select("clip_id").in("clip_id", rows.map((r) => r.clip_id)).not("submitted_at", "is", null);
  const keepGame = new Set((shared ?? []).map((r) => r.clip_id));
  const fresh = rows.filter((r) => !keepGame.has(r.clip_id));
  if (fresh.length) {
    const { error } = await db.from("reels").upsert(fresh, { onConflict: "clip_id" });
    if (error) throw error;
  }
  for (const r of rows.filter((x) => keepGame.has(x.clip_id))) {
    const details: Record<string, unknown> = { ...r };
    delete details.clip_id;
    delete details.game;
    delete details.low_quality; // a clip someone shared was checked by an admin: never junk
    const { error } = await db.from("reels").update(details).eq("clip_id", r.clip_id);
    if (error) throw error;
  }
}

function shortRow(v: YouTubeVideo, channelLogin: string, game: GameKey) {
  const title = cleanPublicText(v.title.slice(0, 200));
  return {
    clip_id: v.id,
    platform: "youtube",
    channel_login: channelLogin,
    channel_name: v.channelTitle,
    title: title.text,
    title_flagged: title.flagged,
    game,
    view_count: v.views,
    duration: v.duration,
    thumbnail_url: v.thumbnailUrl,
    video_id: null,
    vod_offset: null,
    created_at: v.publishedAt,
    fetched_at: new Date().toISOString(),
  };
}

/** Recent Shorts from approved YouTube channels, plus a refresh of older ones (YouTube's 30-day rule). */
async function syncYouTubeShorts() {
  const db = createAdminClient();
  const { data: channels } = await db
    .from("reel_channels")
    .select("login, default_game")
    .eq("platform", "youtube")
    .eq("approved", true)
    .eq("blocked", false);
  const since = new Date(Date.now() - SHOW_DAYS * 86400e3);
  const rows = [];
  for (const c of channels ?? []) {
    let shorts: YouTubeVideo[] = [];
    try {
      shorts = await getChannelShorts(c.login, since);
    } catch (e) {
      console.error("Shorts failed for", c.login, e instanceof Error ? e.message : e);
    }
    for (const v of shorts) {
      const game = guessGame(v, isGameKey(c.default_game) ? c.default_game : null);
      if (game) rows.push(shortRow(v, c.login, game)); // can't tell which game: leave it out
    }
  }
  await saveCollected(rows);

  // Older Shorts (still linked from comments and posts): refresh what YouTube says about them.
  // Ones YouTube no longer has (deleted or made private) lose their details and are marked
  // unavailable (never shown; separate from an admin hiding a clip).
  const { data: stale } = await db
    .from("reels")
    .select("clip_id, channel_login, game")
    .eq("platform", "youtube")
    .lt("fetched_at", new Date(Date.now() - YOUTUBE_REFRESH_DAYS * 86400e3).toISOString())
    .limit(500);
  if (stale?.length) {
    const found = new Map((await getYouTubeVideos(stale.map((r) => r.clip_id))).map((v) => [v.id, v]));
    for (const r of stale) {
      const v = found.get(r.clip_id);
      let update: Record<string, unknown>;
      if (v) {
        const row: Record<string, unknown> = shortRow(v, r.channel_login, r.game);
        delete row.clip_id;
        delete row.game; // keep the game it was filed under
        update = { ...row, unavailable: false };
      } else {
        update = { title: "", thumbnail_url: null, view_count: 0, unavailable: true, fetched_at: new Date().toISOString() };
      }
      const { error } = await db.from("reels").update(update).eq("clip_id", r.clip_id);
      if (error) throw error;
    }
  }
  return rows.length;
}

/** Runs syncReels if the last run is a few hours old (only one at a time). Call it inside after(). */
export async function refreshReelsIfStale() {
  await runRefresh("reels", REFRESH_MINUTES, syncReels, { fromPageView: true });
}

// ---------- Reading ----------

type ReelRow = {
  clip_id: string; platform: ReelPlatform; channel_login: string; channel_name: string | null; title: string; game: GameKey; view_count: number;
  duration: number | null; thumbnail_url: string | null; video_id: string | null; vod_offset: number | null; created_at: string;
  like_count?: number;
  comments?: { count: number }[];
  sharer?: { tag: string; handle: string } | null;
};
const REEL_COLUMNS = "clip_id, platform, channel_login, channel_name, title, game, view_count, duration, thumbnail_url, video_id, vod_offset, created_at, like_count";

const toReel = (r: ReelRow): ExternalReel => ({
  clipId: r.clip_id, platform: r.platform, channelLogin: r.channel_login, channelName: r.channel_name, title: r.title, game: r.game, views: r.view_count,
  duration: r.duration, thumbnailUrl: r.thumbnail_url, videoId: r.video_id, vodOffset: r.vod_offset, createdAt: r.created_at,
  comments: r.comments?.[0]?.count ?? 0,
  likes: r.like_count ?? 0,
  sharedBy: r.sharer ?? null,
});

/**
 * One page of Reels for this viewer: main games for everyone, older games only for people who play them.
 * `game` narrows to one game. `seen` = clips this device already watched; they go to the back of the line.
 */
export async function getReels(opts: { myGames: readonly string[]; game?: GameKey | null; offset?: number; limit?: number; seen?: readonly string[]; userId?: string | null }): Promise<{ reels: Reel[]; hasMore: boolean }> {
  // Guests read with the plain guest connection (no cookies), so their first page can be kept and
  // shared (getGuestReels, round 582). Signed in: the viewer's own, per visit (ranking uses the time).
  let supabase;
  if (opts.userId) {
    await connection();
    supabase = await createClient();
  } else {
    supabase = createGuestClient();
  }
  const games = opts.game ? [opts.game] : gamesFor(opts.myGames);
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;
  const seen = [...(opts.seen ?? [])];
  // Videos from posts take every 5th spot (lib/reelMix.ts). A failure there never stops Reels.
  const postVideos = getReelPostVideos(games, opts.userId ?? null).catch((e) => (console.error("Post videos for Reels failed", e), [] as Post[]));
  // The database ranks clips (new first, proven ones mixed in, see reels_page) and returns just this
  // page, plus one extra to know if there's more.
  const clipsFrom = (clipOffset: number) =>
    supabase
      .rpc("reels_page", { p_games: games, p_limit: limit + 1, p_offset: clipOffset, p_seen: seen })
      .select(`${REEL_COLUMNS}, comments:posts!posts_reel_clip_id_fkey ( count ), sharer:profiles!reels_submitted_by_fkey ( tag, handle )`);
  // Where clips start depends on how many post videos come before this page, which is none on the
  // first page: then both are asked for at once (round 554) instead of one after the other. A Supabase
  // query only starts when something waits on it, so .then() starts it now (round 662: until then it
  // still waited for the post videos, about 0.5 s, before asking for the clips).
  const early = postsBefore(offset, Number.MAX_SAFE_INTEGER) === 0 ? clipsFrom(offset).then((r) => r) : null;
  const posts = rankPostVideos(await postVideos, new Set(seen.filter((id) => id.startsWith("post-")).map((id) => id.slice(5))), Date.now()).map(postToReel);
  const { data, error } = await (early ?? clipsFrom(offset - postsBefore(offset, posts.length)));
  if (error) throw error;
  const rows = (data ?? []) as unknown as ReelRow[];
  const page = mixPage<Reel>(offset, limit, posts, rows.slice(0, limit).map(toReel), rows.length > limit);
  return { reels: page.items, hasMore: page.hasMore };
}

/**
 * A guest's first page of Reels (all games, or one): the same for every guest, so it's kept for a
 * minute and shared by every server (round 582) instead of ranked on each visit.
 */
export async function getGuestReels(game: GameKey | null, limit: number): Promise<{ reels: Reel[]; hasMore: boolean }> {
  "use cache: remote";
  cacheLife({ stale: 30, revalidate: 60, expire: 600 });
  return getReels({ myGames: [], game, limit, userId: null });
}

/** A post's video as a Reel (its comments are the post's replies, its likes the post's likes). */
function postToReel(p: Post): Reel {
  const v = p.video!;
  return {
    clipId: `post-${p.id}`,
    platform: "smashy",
    channelLogin: p.author.handle,
    channelName: p.author.tag,
    title: (p.title ?? p.body).replace(/\s+/g, " ").trim().slice(0, 200), // as on the post itself
    game: p.game as GameKey,
    views: 0,
    duration: Math.round(v.durationMs / 1000),
    thumbnailUrl: v.posterUrl,
    videoId: null,
    vodOffset: null,
    createdAt: p.createdAt,
    comments: p.replyCount,
    likes: p.likeCount,
    sharedBy: null,
    post: { id: p.id, videoUrl: v.url, width: v.width, height: v.height, likedByMe: p.likedByMe, authorHandle: p.author.handle },
  };
}

/**
 * "Top clips right now" (the strip on the feed and the guest home page): the best clips of the last
 * few days, not of the month. Reels' own order (reels_page) lets a clip that went big weeks ago keep
 * its place, which suits an endless feed but made this strip look stuck. Here only clips from the
 * last 3 days count (7 when there are too few), views are softened (square root of views against the
 * platform's usual count) so one viral clip doesn't win for days, and one channel gets at most two spots.
 */
export async function getTopClips(opts: { myGames: readonly string[]; limit?: number }): Promise<Reel[]> {
  await connection(); // depends on the current time
  const limit = opts.limit ?? 8;
  const games = gamesFor(opts.myGames);
  const supabase = await createClient();
  const recent = async (days: number) => {
    const since = new Date(Date.now() - days * 86400e3).toISOString();
    const { data, error } = await supabase
      .from("reels")
      .select(`${REEL_COLUMNS}, submitted_at`)
      .in("game", games)
      .eq("low_quality", false)
      .or(`created_at.gt.${since},submitted_at.gt.${since}`)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data ?? []) as unknown as (ReelRow & { submitted_at: string | null })[];
  };
  let rows = await recent(3);
  if (rows.length < limit * 2) rows = await recent(7);
  return rankTopClips(rows, Date.now(), limit).map(toReel);
}

/** One clip (null if it's hidden or unknown). */
export async function getReel(clipId: string): Promise<ExternalReel | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reels")
    .select(`${REEL_COLUMNS}, comments:posts!posts_reel_clip_id_fkey ( count ), sharer:profiles!reels_submitted_by_fkey ( tag, handle )`)
    .eq("clip_id", clipId)
    .maybeSingle();
  if (error) throw error;
  return data ? toReel(data as unknown as ReelRow) : null;
}

// ---------- Admin ----------

/** How fresh Reels is: clips from the last day and week (shown, not junk), and the last refresh. */
export async function getReelsFreshness(): Promise<{ lastDay: number; lastWeek: number; lastRefresh: string | null }> {
  const db = createAdminClient();
  const count = async (days: number) => {
    const { count } = await db
      .from("reels")
      .select("clip_id", { count: "exact", head: true })
      .eq("hidden", false)
      .eq("unavailable", false)
      .eq("low_quality", false)
      .gt("created_at", new Date(Date.now() - days * 86400e3).toISOString());
    return count ?? 0;
  };
  const [lastDay, lastWeek, { data: job }] = await Promise.all([count(1), count(7), db.from("reels_sync").select("last_run").limit(1).maybeSingle()]);
  return { lastDay, lastWeek, lastRefresh: (job?.last_run as string | null) ?? null };
}

export async function getReelChannels(): Promise<ReelChannel[]> {
  const { data, error } = await createAdminClient()
    .from("reel_channels")
    .select("login, platform, display_name, source, approved, blocked, twitch_id, default_game")
    .order("platform")
    .order("login");
  if (error) throw error;
  return (data ?? []).map((c) => ({
    login: c.login,
    platform: c.platform,
    displayName: c.display_name,
    source: c.source,
    approved: c.approved,
    blocked: c.blocked,
    twitchId: c.twitch_id,
    defaultGame: isGameKey(c.default_game) ? c.default_game : null,
  }));
}

/** Approve a YouTube channel (link, @handle or channel id) for Reels, with its usual game (optional). */
export async function addYouTubeChannel(input: string, game: string): Promise<{ ok?: boolean; error?: string }> {
  if (!hasYouTubeKey()) return { error: "YouTube isn't set up yet: YOUTUBE_API_KEY is missing." };
  let channel;
  try {
    channel = await findYouTubeChannel(input);
  } catch (e) {
    console.error("YouTube channel lookup failed", e instanceof Error ? e.message : e);
    return { error: "Couldn't reach YouTube. Please try again." };
  }
  if (!channel) return { error: "Couldn't find that YouTube channel. Paste its link or @handle." };
  const { error } = await createAdminClient()
    .from("reel_channels")
    .upsert(
      { login: channel.id, platform: "youtube", display_name: channel.title, source: "admin", approved: true, blocked: false, default_game: isGameKey(game) ? game : null },
      { onConflict: "login" },
    );
  return error ? { error: "Couldn't save it. Please try again." } : { ok: true };
}

/** A YouTube channel's usual game (used when a Short's title doesn't name one). */
export async function setReelChannelGame(login: string, game: string) {
  const { error } = await createAdminClient()
    .from("reel_channels")
    .update({ default_game: isGameKey(game) ? game : null })
    .eq("login", login)
    .eq("platform", "youtube");
  if (error) throw error;
}

/** Pulls the channel name out of a twitch.tv link (or takes a bare name). */
export function parseTwitchLogin(input: string): string | null {
  const s = input.trim();
  const login = (s.match(/twitch\.tv\/([a-z0-9_]{2,25})/i)?.[1] ?? s).toLowerCase();
  return /^[a-z0-9_]{2,25}$/.test(login) ? login : null;
}

export async function addReelChannel(input: string): Promise<{ ok?: boolean; error?: string }> {
  const login = parseTwitchLogin(input);
  if (!login) return { error: "Paste a Twitch channel name or link." };
  const [user] = await getTwitchUsers([login]).catch(() => []);
  if (!user) return { error: "Couldn't find that Twitch channel." };
  const { error } = await createAdminClient()
    .from("reel_channels")
    .upsert({ login: user.login, twitch_id: user.id, display_name: user.display_name, source: "admin", approved: true, blocked: false }, { onConflict: "login" });
  return error ? { error: "Couldn't save it. Please try again." } : { ok: true };
}

/** Approve a suggested channel so its clips can appear in Reels. */
export async function approveReelChannel(login: string) {
  const { error } = await createAdminClient().from("reel_channels").update({ approved: true, blocked: false }).eq("login", login);
  if (error) throw error;
}

export async function setReelChannelBlocked(login: string, blocked: boolean) {
  const { error } = await createAdminClient().from("reel_channels").update({ blocked }).eq("login", login);
  if (error) throw error;
}

export async function setReelHidden(clipId: string, hidden: boolean) {
  const { error } = await createAdminClient().from("reels").update({ hidden }).eq("clip_id", clipId);
  if (error) throw error;
}

/** Admin list: recent clips, including hidden ones, most viewed first. */
export async function getReelsForAdmin(): Promise<(ExternalReel & { hidden: boolean; titleFlagged: boolean })[]> {
  const since = new Date(Date.now() - SHOW_DAYS * 86400e3).toISOString();
  const { data, error } = await createAdminClient()
    .from("reels")
    .select(`${REEL_COLUMNS}, hidden, title_flagged`)
    .eq("unavailable", false)
    // Same window as Reels: shared clips count from when they were approved.
    .or(`created_at.gt."${since}",submitted_at.gt."${since}"`)
    .order("view_count", { ascending: false })
    .limit(100);
  if (error) throw error;
  return ((data ?? []) as (ReelRow & { hidden: boolean; title_flagged: boolean })[]).map((r) => ({ ...toReel(r), hidden: r.hidden, titleFlagged: r.title_flagged }));
}
