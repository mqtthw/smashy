// What a shared post link shows in Discord, iMessage, X… (round 459): a post with a Twitch clip shows
// the clip's own title, channel and picture instead of the raw link. Server-only (Twitch keys).
import "server-only";
import { cacheLife } from "next/cache";
import sharp from "sharp";
import { getClipById } from "./twitch";

export { twitchClipIdIn, withoutLinks } from "./embeds";

export type ClipPreview = { title: string; channel: string; thumbnail: string };

/** A clip's title, channel and picture, kept a day and shared by every server. Null if Twitch can't say. */
export async function getClipPreview(clipId: string): Promise<ClipPreview | null> {
  "use cache: remote";
  cacheLife("days");
  if (!/^[A-Za-z0-9_-]{4,120}$/.test(clipId)) return null;
  const clip = await getClipById(clipId).catch(() => null);
  if (!clip?.thumbnail_url?.startsWith("https://")) return null;
  return { title: clip.title, channel: clip.broadcaster_name, thumbnail: clip.thumbnail_url };
}

/** The clip's picture, sized for a link preview card (a data URL), or null. */
export async function clipPictureForCard(thumbnail: string): Promise<string | null> {
  try {
    const u = new URL(thumbnail);
    if (u.protocol !== "https:" || !/(^|\.)(jtvnw\.net|twitch\.tv|twitchcdn\.net)$/.test(u.hostname)) return null;
    const res = await fetch(u, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const jpeg = await sharp(Buffer.from(await res.arrayBuffer())).resize({ width: 1200, height: 630, fit: "cover" }).jpeg({ quality: 80 }).toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null;
  }
}
