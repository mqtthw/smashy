// Photos and videos on a post, in one order (round 450): up to 4 attachments in any mix, at most 2
// videos. Shared by server and browser code.
import type { PostImage } from "./postImageLinks";
import type { PostVideo } from "./postVideoLinks";

export const MAX_POST_MEDIA = 4;
export const MAX_POST_VIDEOS = 2;

/** One attachment the composer sends. */
export type MediaPick = { kind: "image"; id: string; alt: string } | { kind: "video"; id: string };

/** One attachment on a finished post, in order. */
export type PostMediaItem = { kind: "image"; image: PostImage } | { kind: "video"; video: PostVideo };

const ID = /^[0-9a-f-]{36}$/i;

/**
 * The composer's attachments, in order: the "media" list when it's there, otherwise the older
 * separate "images" list and "video" id (photos first). Bad entries are dropped; at most 4, of which
 * at most 2 videos (extra videos are dropped, not the whole list).
 */
export function parseMediaList(media: FormDataEntryValue | null, images?: FormDataEntryValue | null, video?: FormDataEntryValue | null): MediaPick[] {
  let raw: unknown[] = [];
  try {
    if (media) raw = JSON.parse(String(media));
    else {
      const imgs = JSON.parse(String(images ?? "[]"));
      raw = [...(Array.isArray(imgs) ? imgs.map((i) => ({ ...i, kind: "image" })) : []), ...(video ? [{ kind: "video", id: String(video) }] : [])];
    }
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  const out: MediaPick[] = [];
  const seen = new Set<string>();
  let videos = 0;
  for (const m of raw as { kind?: unknown; id?: unknown; alt?: unknown }[]) {
    if (!m || typeof m.id !== "string" || !ID.test(m.id) || seen.has(m.id)) continue;
    if (m.kind === "image") out.push({ kind: "image", id: m.id, alt: typeof m.alt === "string" ? m.alt.trim().slice(0, 300) : "" });
    else if (m.kind === "video" && videos < MAX_POST_VIDEOS) {
      out.push({ kind: "video", id: m.id });
      videos++;
    } else continue;
    seen.add(m.id);
    if (out.length === MAX_POST_MEDIA) break;
  }
  return out;
}

/**
 * How a post's attachments are shown: photos next to each other share one grid; each video gets its
 * own player. [photo, photo, video, photo] -> [grid of 2], [video], [grid of 1].
 */
export function mediaBlocks(media: PostMediaItem[]): ({ kind: "images"; images: PostImage[] } | { kind: "video"; video: PostVideo })[] {
  const blocks: ({ kind: "images"; images: PostImage[] } | { kind: "video"; video: PostVideo })[] = [];
  for (const m of media) {
    const last = blocks[blocks.length - 1];
    if (m.kind === "image") {
      if (last?.kind === "images") last.images.push(m.image);
      else blocks.push({ kind: "images", images: [m.image] });
    } else blocks.push({ kind: "video", video: m.video });
  }
  return blocks;
}
