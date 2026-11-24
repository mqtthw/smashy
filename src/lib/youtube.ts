// YouTube Data API with Smashy's API key. Server-only: the key must never reach the browser.
// The key only identifies Smashy to YouTube; no one's YouTube or Google account is connected.
//
// Quota: YouTube gives 10,000 units a day for free. Each call here costs 1 unit, and collecting a
// channel's Shorts takes 2, so even dozens of channels every 3 hours stays far under the limit.
import "server-only";
import type { GameKey } from "./games";

const API = "https://www.googleapis.com/youtube/v3";

export const hasYouTubeKey = () => Boolean(process.env.YOUTUBE_API_KEY);

class NotFound extends Error {}

async function yt<T>(path: string, params: Record<string, string>): Promise<T> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY is missing. Add it to .env.local.");
  const res = await fetch(`${API}/${path}?${new URLSearchParams({ ...params, key })}`, { signal: AbortSignal.timeout(15000) });
  if (res.status === 404) throw new NotFound(path);
  // Never include the URL in errors: it contains the key.
  if (!res.ok) throw new Error(`YouTube ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

export type YouTubeChannel = { id: string; title: string };

/**
 * Finds a channel from what an admin pastes: a link (youtube.com/@name, /channel/UC…), an @handle,
 * or a channel id. Null if YouTube doesn't know it.
 */
export async function findYouTubeChannel(input: string): Promise<YouTubeChannel | null> {
  const s = input.trim();
  const id = s.match(/(?:^|\/channel\/)(UC[A-Za-z0-9_-]{22})(?:[/?#]|$)/)?.[1];
  const handle = id ? null : s.match(/(?:youtube\.com\/)?(@[\w.-]{3,30})(?:[/?#]|$)/)?.[1];
  if (!id && !handle) return null;
  const { items } = await yt<{ items?: { id: string; snippet: { title: string } }[] }>("channels", {
    part: "snippet",
    ...(id ? { id } : { forHandle: handle! }),
  });
  const c = items?.[0];
  return c ? { id: c.id, title: c.snippet.title } : null;
}

export type YouTubeVideo = {
  id: string;
  channelId: string;
  channelTitle: string;
  title: string;
  description: string;
  tags: string[];
  publishedAt: string;
  duration: number | null; // seconds
  views: number;
  thumbnailUrl: string | null;
  /**
   * Whether the owner lets it play on other sites (round 817). Some turn that off, and Reels then showed
   * YouTube's "Video unavailable: playback on other websites has been disabled by the video owner" box.
   */
  embeddable: boolean;
};

type VideoItem = {
  id: string;
  snippet: { channelId: string; channelTitle: string; title: string; description?: string; tags?: string[]; publishedAt: string; thumbnails?: Record<string, { url: string }> };
  contentDetails?: { duration?: string };
  statistics?: { viewCount?: string };
  status?: { embeddable?: boolean };
};

/** "PT1M5S" → 65 */
export function isoDuration(d: string | undefined): number | null {
  const m = d?.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  return m ? Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) : null;
}

/** Details for up to 50 videos per call. Videos that were deleted or made private are left out. */
export async function getYouTubeVideos(ids: string[]): Promise<YouTubeVideo[]> {
  const out: YouTubeVideo[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    if (!batch.length) continue;
    const { items } = await yt<{ items?: VideoItem[] }>("videos", { part: "snippet,contentDetails,statistics,status", id: batch.join(","), maxResults: "50" });
    for (const v of items ?? []) {
      const t = v.snippet.thumbnails ?? {};
      out.push({
        id: v.id,
        channelId: v.snippet.channelId,
        channelTitle: v.snippet.channelTitle,
        title: v.snippet.title,
        description: (v.snippet.description ?? "").slice(0, 1000),
        tags: v.snippet.tags ?? [],
        publishedAt: v.snippet.publishedAt,
        duration: isoDuration(v.contentDetails?.duration),
        views: Math.min(Number(v.statistics?.viewCount ?? 0) || 0, 2_000_000_000),
        thumbnailUrl: (t.high ?? t.medium ?? t.default)?.url ?? null,
        embeddable: v.status?.embeddable !== false, // missing: assume it plays, as before
      });
    }
  }
  return out;
}

/**
 * A channel's Shorts published since a date, newest first (up to 50).
 *
 * YouTube's API has no "is this a Short" field. Every channel has a hidden playlist of just its
 * Shorts (its id is the channel id with "UC" swapped for "UUSH"); YouTube doesn't document it, but
 * it's what YouTube's own Shorts tab uses. If YouTube ever removes it, this returns nothing and
 * Reels carries on with Twitch clips.
 */
export async function getChannelShorts(channelId: string, since: Date): Promise<YouTubeVideo[]> {
  let items: { contentDetails: { videoId: string; videoPublishedAt?: string } }[] = [];
  try {
    ({ items = [] } = await yt<{ items?: typeof items }>("playlistItems", {
      part: "contentDetails",
      playlistId: "UUSH" + channelId.slice(2),
      maxResults: "50",
    }));
  } catch (e) {
    if (e instanceof NotFound) return []; // the channel has no Shorts
    throw e;
  }
  const ids = items
    .filter((i) => !i.contentDetails.videoPublishedAt || Date.parse(i.contentDetails.videoPublishedAt) >= since.getTime())
    .map((i) => i.contentDetails.videoId);
  // Shorts are at most 3 minutes; anything longer slipped into the playlist by mistake.
  return (await getYouTubeVideos(ids)).filter((v) => v.duration === null || v.duration <= 180);
}

/** YouTube said Smashy's daily allowance is used up (403 quotaExceeded). */
export class YouTubeQuotaError extends Error {}

/**
 * Smash Shorts matching a search, from any channel (round 716: Reels search). Expensive: a YouTube
 * search costs 100 of the 10,000 daily units, so callers cache and cap it. Safe search is strict and
 * "smash bros" is added to the words; only videos of 3 minutes or less that name a Smash game in their
 * title, description or tags are kept.
 */
export async function searchShorts(words: string): Promise<(YouTubeVideo & { game: GameKey })[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return [];
  const res = await fetch(
    `${API}/search?${new URLSearchParams({ part: "id", q: `${words} smash bros`, type: "video", videoDuration: "short", safeSearch: "strict", maxResults: "25", key })}`,
    { signal: AbortSignal.timeout(15000) },
  );
  if (res.status === 403 && /quota/i.test(await res.text().catch(() => ""))) throw new YouTubeQuotaError("YouTube quota used up");
  if (!res.ok) throw new Error(`YouTube search failed: ${res.status}`); // never the URL: it has the key
  const { items = [] } = (await res.json()) as { items?: { id: { videoId?: string } }[] };
  const ids = items.map((i) => i.id.videoId).filter((id): id is string => !!id);
  const out: (YouTubeVideo & { game: GameKey })[] = [];
  for (const v of await getYouTubeVideos(ids)) {
    if (v.duration === null || v.duration > 180) continue;
    if (!v.embeddable) continue; // its owner doesn't let it play on other sites (round 817)
    const game = guessGame(v, null);
    if (game) out.push({ ...v, game });
  }
  return out;
}

/**
 * Whether a video is a Short. The API can't tell, but youtube.com/shorts/<id> opens for a Short and
 * redirects to the normal watch page for anything else. Null if YouTube couldn't be reached.
 */
export async function isYouTubeShort(videoId: string): Promise<boolean | null> {
  try {
    const res = await fetch(`https://www.youtube.com/shorts/${encodeURIComponent(videoId)}`, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 200) return true;
    // Only a redirect to the normal watch page means "not a Short". Anything else (a consent or
    // bot-check page) means we couldn't tell.
    if (res.status >= 300 && res.status < 400 && /youtube\.com\/watch\?/.test(res.headers.get("location") ?? "")) return false;
    return null;
  } catch {
    return null;
  }
}

// ---------- Which game is it? ----------

const GAME_WORDS: [GameKey, RegExp][] = [
  // Hashtags run words together (#smashultimate, #smashmelee), so those are matched too.
  // スマブラDX / スマブラSP: how Japanese titles name Melee and Ultimate (round 716).
  ["melee", /\bmelee\b|\bssbm\b|smash ?melee|スマブラ ?dx/i],
  ["ultimate", /\bultimate\b|\bssbu\b|smash ?ultimate|スマブラ ?sp/i],
  ["pplus", /project ?\+|project ?plus|\bp\+|\bpplus\b/i],
  ["smash64", /\bssb ?64\b|smash ?64\b|\bn64\b/i],
  ["brawl", /\bbrawl\b|\bssbb\b|smash ?brawl/i],
  ["smash4", /\bsmash ?4\b|\bsm4sh\b|\bssb4\b|\bwii ?u\b/i],
];

function gamesNamed(text: string): GameKey[] {
  return GAME_WORDS.filter(([, re]) => re.test(text)).map(([g]) => g);
}

/**
 * YouTube doesn't say which game a video is. Look at the title, then the description (where
 * channels put hashtags like #ssbm), then the tags; the first that names exactly one game wins.
 * If one names several, it's only settled by the channel's usual game (set by an admin). If none
 * name a game, use the channel's usual game. Null = can't tell, so it's left out.
 */
export function guessGame(video: { title: string; description?: string; tags: string[] }, channelGame: GameKey | null): GameKey | null {
  for (const text of [video.title, video.description ?? "", video.tags.join(" , ")]) {
    const named = gamesNamed(text);
    if (named.length === 1) return named[0];
    if (named.length > 1) return channelGame && named.includes(channelGame) ? channelGame : null;
  }
  return channelGame;
}
