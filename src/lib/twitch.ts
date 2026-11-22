// Twitch API (Helix) with Smashy's app keys. Server-only: the secret must never reach the browser.
// The keys only identify Smashy to Twitch; no one's Twitch account is connected.
import "server-only";
import { cacheLife } from "next/cache";
import type { GameKey } from "./games";

/** Twitch category ids for smash games. P+ streams usually run under the Brawl category. */
export const TWITCH_GAMES: Record<string, GameKey> = {
  "16282": "melee",
  "504461": "ultimate",
  "17516": "smash64",
  "18833": "brawl",
  "488353": "smash4", // Wii U
  "489023": "smash4", // 3DS
};

let token: { value: string; expires: number } | null = null;

async function appToken(force = false): Promise<string> {
  if (!force && token && token.expires > Date.now() + 60_000) return token.value;
  const id = process.env.TWITCH_CLIENT_ID;
  const secret = process.env.TWITCH_CLIENT_SECRET;
  if (!id || !secret) throw new Error("TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET are missing. Add them to .env.local.");
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: id, client_secret: secret, grant_type: "client_credentials" }),
  });
  if (!res.ok) throw new Error(`Twitch sign-in failed: ${res.status}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  token = { value: json.access_token, expires: Date.now() + json.expires_in * 1000 };
  return token.value;
}

async function helix<T>(path: string): Promise<T> {
  for (const force of [false, true]) {
    const res = await fetch(`https://api.twitch.tv/helix/${path}`, {
      headers: { Authorization: `Bearer ${await appToken(force)}`, "Client-Id": process.env.TWITCH_CLIENT_ID ?? "" },
    });
    if (res.status === 401 && !force) continue; // token expired: get a new one and retry once
    if (!res.ok) throw new Error(`Twitch ${path.split("?")[0]} failed: ${res.status}`);
    return (await res.json()) as T;
  }
  throw new Error("Twitch request failed");
}

export type TwitchUser = { id: string; login: string; display_name: string };

/** Twitch users by login name (up to 100 per call). */
export async function getTwitchUsers(logins: string[]): Promise<TwitchUser[]> {
  const out: TwitchUser[] = [];
  for (let i = 0; i < logins.length; i += 100) {
    const q = logins.slice(i, i + 100).map((l) => `login=${encodeURIComponent(l)}`).join("&");
    if (!q) continue;
    const { data } = await helix<{ data: TwitchUser[] }>(`users?${q}`);
    out.push(...data);
  }
  return out;
}

export type TwitchClip = {
  id: string;
  broadcaster_id: string;
  broadcaster_name: string;
  video_id: string;
  game_id: string;
  title: string;
  view_count: number;
  created_at: string;
  thumbnail_url: string;
  duration: number;
  vod_offset: number | null;
};

/** A channel's most-viewed clips since a date (Twitch sorts by views). */
export async function getChannelClips(broadcasterId: string, since: Date, first = 20): Promise<TwitchClip[]> {
  const { data } = await helix<{ data: TwitchClip[] }>(
    // ended_at matters: without it Twitch only returns the first week after started_at.
    `clips?broadcaster_id=${encodeURIComponent(broadcasterId)}&started_at=${since.toISOString()}&ended_at=${new Date().toISOString()}&first=${first}`,
  );
  return data;
}

/** The most-viewed clips in a game category across all of Twitch since a date (Twitch sorts by views). */
export async function getTopGameClips(gameId: string, since: Date, first = 50): Promise<TwitchClip[]> {
  const { data } = await helix<{ data: TwitchClip[] }>(
    `clips?game_id=${encodeURIComponent(gameId)}&started_at=${since.toISOString()}&ended_at=${new Date().toISOString()}&first=${Math.min(100, first)}`,
  );
  return data;
}

/** Twitch users by id (up to 100 per call). */
export async function getTwitchUsersByIds(ids: string[]): Promise<TwitchUser[]> {
  const out: TwitchUser[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    const q = ids.slice(i, i + 100).map((id) => `id=${encodeURIComponent(id)}`).join("&");
    if (!q) continue;
    const { data } = await helix<{ data: TwitchUser[] }>(`users?${q}`);
    out.push(...data);
  }
  return out;
}

/** One clip by its id (the slug in clips.twitch.tv/<slug>), or null if Twitch doesn't have it. */
export async function getClipById(clipId: string): Promise<TwitchClip | null> {
  const { data } = await helix<{ data: TwitchClip[] }>(`clips?id=${encodeURIComponent(clipId)}`);
  return data[0] ?? null;
}

/** One Twitch user by id (clips only give the channel's id and display name, not its login). */
export async function getTwitchUserById(id: string): Promise<TwitchUser | null> {
  const { data } = await helix<{ data: TwitchUser[] }>(`users?id=${encodeURIComponent(id)}`);
  return data[0] ?? null;
}

type TwitchVideo = { id: string; created_at: string; duration: string; url: string };

/** "2h8m25s" -> seconds */
export function parseTwitchDuration(d: string): number {
  const m = d.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
  return m ? Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) : 0;
}

/** seconds -> "1h02m03s" (Twitch's ?t= format) */
export function twitchTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h${String(m).padStart(2, "0")}m${String(s % 60).padStart(2, "0")}s`;
}

export type VodMoment = { videoId: string; offset: number; url: string; channel: string };

/**
 * The spot in a channel's past broadcast at a given moment (unix seconds), if the VOD still exists.
 * Twitch keeps VODs for 7 to 60 days depending on the channel.
 */
export async function findVodMoment(channel: string, at: number): Promise<VodMoment | null> {
  "use cache";
  const found = await vodMomentNow(channel, at);
  // A miss is often temporary (Twitch didn't answer, or the broadcast is still going and its VOD
  // doesn't reach that moment yet), so it's only kept for minutes; a found spot doesn't change.
  if (found) cacheLife("hours");
  else cacheLife("minutes");
  return found;
}

async function vodMomentNow(channel: string, at: number): Promise<VodMoment | null> {
  const login = channel.toLowerCase();
  if (!/^[a-z0-9_]{2,25}$/.test(login)) return null;
  const [user] = await getTwitchUsers([login]).catch(() => []);
  if (!user) return null;
  const { data } = await helix<{ data: TwitchVideo[] }>(`videos?user_id=${user.id}&type=archive&first=40`).catch(() => ({ data: [] as TwitchVideo[] }));
  for (const v of data) {
    const start = Date.parse(v.created_at) / 1000;
    const end = start + parseTwitchDuration(v.duration);
    if (at >= start && at <= end) {
      const offset = Math.max(0, at - start);
      return { videoId: v.id, offset, url: `https://www.twitch.tv/videos/${v.id}?t=${twitchTime(offset)}`, channel: user.display_name };
    }
  }
  return null;
}
