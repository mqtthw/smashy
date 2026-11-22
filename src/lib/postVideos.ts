// Videos on posts: start an upload, process it (check, re-save, safety check, store), attach it to a
// post, and clean up files nobody uses anymore. Server-only.
//
// How an upload goes:
// 1. startVideoUpload: checks the size and type, makes a row and a one-time upload link into the
//    private "post-video-uploads" bucket. The browser sends the file straight to storage (Vercel
//    can't pass more than 4.5 MB through the website's server).
// 2. finishVideoUpload (POST /api/post-videos/finish): downloads the raw file, checks it's a video of
//    at most 60 seconds, and re-saves it with ffmpeg as a plain MP4 (H.264 and AAC, at most 1280 px,
//    which every browser plays). Re-saving drops everything hidden in the file, like where a phone
//    video was filmed. Then 4 frames spread through the video go through the same automatic safety
//    check as photos (Smashy has teen users); one frame becomes the still picture. The finished
//    files go in the public "post-videos" bucket and the raw upload is deleted.
// 3. The post is saved with the video's id and attachVideo puts it on the post.
import "server-only";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";
import type { MessageKey } from "./i18n/en";
import { blockedReason, checkImage, hasImageSafetyKey } from "./imageSafety";
import {
  MAX_VIDEO_BYTES,
  MAX_VIDEO_SECONDS,
  POST_VIDEO_UPLOADS_BUCKET as RAW,
  POST_VIDEOS_BUCKET as BUCKET,
  postVideoUrl,
  VIDEO_TYPES,
  type PostVideo,
} from "./postVideoLinks";
import { createAdminClient } from "./supabase/admin";

const run = promisify(execFile);
const VIDEOS_PER_HOUR = 6;
const VIDEOS_PER_DAY = 20;
const MAX_SIDE = 1280;
const SAFETY_FRAMES = [0.1, 0.35, 0.6, 0.85]; // where in the video the checked frames come from
const EXT: Record<string, string> = { "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" };

export type UploadedVideo = PostVideo & { id: string };
type Fail = { error: MessageKey; values?: Record<string, number> };

/** Step 1: a one-time link for the browser to upload the raw file to. */
export async function startVideoUpload(userId: string, size: number, type: string): Promise<{ id: string; path: string; token: string } | Fail> {
  if (!hasImageSafetyKey() || !ffmpegPath) return { error: "feed.video.off" };
  if (!(VIDEO_TYPES as readonly string[]).includes(type)) return { error: "feed.video.type" };
  if (!Number.isFinite(size) || size <= 0) return { error: "feed.video.unreadable" };
  if (size > MAX_VIDEO_BYTES) return { error: "feed.video.big", values: { mb: MAX_VIDEO_BYTES / 1024 / 1024 } };

  const db = createAdminClient();
  const since = (ms: number) => new Date(Date.now() - ms).toISOString();
  const [{ count: hour }, { count: day }] = await Promise.all([
    db.from("post_videos").select("id", { count: "exact", head: true }).eq("user_id", userId).gt("created_at", since(3600e3)),
    db.from("post_videos").select("id", { count: "exact", head: true }).eq("user_id", userId).gt("created_at", since(86400e3)),
  ]);
  if ((hour ?? 0) >= VIDEOS_PER_HOUR || (day ?? 0) >= VIDEOS_PER_DAY) return { error: "feed.video.fast" };

  const rawPath = `${userId}/${randomUUID()}.${EXT[type]}`;
  const { data: row, error } = await db.from("post_videos").insert({ user_id: userId, raw_path: rawPath }).select("id").single();
  if (error) {
    console.error("Video row failed", error.message);
    return { error: "feed.video.saveFailed" };
  }
  const { data: link, error: linkError } = await db.storage.from(RAW).createSignedUploadUrl(rawPath);
  if (linkError || !link) {
    console.error("Video upload link failed", linkError?.message);
    await db.from("post_videos").delete().eq("id", row.id);
    return { error: "feed.video.saveFailed" };
  }
  return { id: row.id as string, path: rawPath, token: link.token };
}

/**
 * What ffmpeg says about a file: its length and picture size (null when it has no video). `ms` is
 * null when the file doesn't say how long it is (videos recorded in a browser often don't).
 */
async function probe(file: string): Promise<{ ms: number | null; width: number; height: number } | null> {
  // "ffmpeg -i" with no output prints the file's details and exits with an error; that's expected.
  const out = await run(ffmpegPath!, ["-hide_banner", "-i", file], { timeout: 30_000 }).catch((e: { stderr?: string }) => ({ stderr: e.stderr ?? "" }));
  const text = out.stderr ?? "";
  const d = text.match(/Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/);
  const v = text.match(/Stream #\S+.*Video: .*?, (\d{2,5})x(\d{2,5})/);
  if (!v) return null;
  const ms = d ? Math.round(((+d[1] * 60 + +d[2]) * 60 + +d[3]) * 1000) : null;
  return { ms: ms && ms > 0 ? ms : null, width: +v[1], height: +v[2] };
}

/** One frame (PNG) from `at` seconds into the video. */
async function frameAt(file: string, at: number): Promise<Buffer> {
  const { stdout } = await run(ffmpegPath!, ["-hide_banner", "-loglevel", "error", "-ss", at.toFixed(2), "-i", file, "-frames:v", "1", "-f", "image2", "-c:v", "png", "pipe:1"], {
    encoding: "buffer",
    maxBuffer: 30 * 1024 * 1024,
    timeout: 30_000,
  });
  return stdout as unknown as Buffer;
}

/** Step 2: process the uploaded file. Only its uploader can, once. */
export async function finishVideoUpload(userId: string, id: string): Promise<UploadedVideo | Fail> {
  const db = createAdminClient();
  const { data: row } = await db.from("post_videos").select("id, raw_path, status").eq("id", id).eq("user_id", userId).maybeSingle();
  if (!row || row.status !== "uploading") return { error: "feed.video.expired" };
  const rawPath = row.raw_path as string;
  // Claim it so a second tap can't process it twice: from here on it's either ready or failed.
  const { data: claimed } = await db.from("post_videos").update({ status: "failed" }).eq("id", id).eq("status", "uploading").select("id");
  if (!claimed?.length) return { error: "feed.video.expired" };

  const dir = await mkdtemp(join(tmpdir(), "smashy-video-"));
  const fail = async (error: MessageKey, values?: Record<string, number>): Promise<Fail> => ({ error, values });
  try {
    const { data: raw, error: dlError } = await db.storage.from(RAW).download(rawPath);
    if (dlError || !raw) return fail("feed.video.notUploaded");
    if (raw.size > MAX_VIDEO_BYTES) return fail("feed.video.big", { mb: MAX_VIDEO_BYTES / 1024 / 1024 });
    const input = join(dir, "in");
    await writeFile(input, Buffer.from(await raw.arrayBuffer()));

    const info = await probe(input);
    if (!info) return fail("feed.video.unreadable");
    const tooLong = (ms: number | null) => ms !== null && ms > (MAX_VIDEO_SECONDS + 0.5) * 1000;
    if (tooLong(info.ms)) return fail("feed.video.long", { s: MAX_VIDEO_SECONDS });

    // Re-save: H.264 video and AAC sound in an MP4 that starts playing before it's fully loaded, at
    // most 1280 px on its longest side (even sizes, which H.264 needs), turned upright, with no
    // hidden data (-map_metadata -1 drops location, camera and the rest; subtitles and data tracks
    // aren't copied).
    const output = join(dir, "out.mp4");
    try {
      await run(
        ffmpegPath!,
        [
          "-hide_banner", "-loglevel", "error", "-y", "-i", input,
          "-map", "0:v:0", "-map", "0:a:0?", "-map_metadata", "-1", "-map_chapters", "-1", "-sn", "-dn",
          "-vf", `scale=w='min(${MAX_SIDE},iw)':h='min(${MAX_SIDE},ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2`,
          "-c:v", "libx264", "-preset", "veryfast", "-crf", "26", "-pix_fmt", "yuv420p",
          "-c:a", "aac", "-b:a", "128k", "-ac", "2",
          "-movflags", "+faststart", "-t", String(MAX_VIDEO_SECONDS + 1),
          output,
        ],
        { timeout: 240_000, maxBuffer: 10 * 1024 * 1024 },
      );
    } catch (e) {
      console.error("Video re-save failed", e instanceof Error ? e.message.slice(0, 300) : e);
      return fail("feed.video.unreadable");
    }
    // The re-save stops at 61 seconds, so a file that didn't say its length but runs longer shows up here.
    const probed = await probe(output);
    if (!probed?.ms) return fail("feed.video.unreadable");
    if (tooLong(probed.ms)) return fail("feed.video.long", { s: MAX_VIDEO_SECONDS });
    const done = { ...probed, ms: probed.ms };

    // Safety: frames spread through the video, the same check as photos. Any one blocked: no upload.
    try {
      const sec = done.ms / 1000;
      for (const at of SAFETY_FRAMES) {
        const frame = await sharp(await frameAt(output, sec * at)).resize({ width: 640, height: 640, fit: "inside" }).jpeg({ quality: 80 }).toBuffer();
        const reason = blockedReason(await checkImage(frame));
        if (reason) {
          console.warn("Video blocked by safety check", { userId, reason });
          return fail("feed.video.blocked");
        }
      }
    } catch (e) {
      console.error("Video safety check failed", e instanceof Error ? e.message : e);
      return fail("feed.video.checkFailed");
    }

    const poster = await sharp(await frameAt(output, Math.min(1, done.ms / 2000))).webp({ quality: 80 }).toBuffer();
    const name = `${userId}/${randomUUID()}`;
    const path = `${name}.mp4`;
    const posterPath = `${name}.webp`;
    const store = db.storage.from(BUCKET);
    const [up1, up2] = await Promise.all([
      store.upload(path, await readFile(output), { contentType: "video/mp4", cacheControl: "31536000" }),
      store.upload(posterPath, poster, { contentType: "image/webp", cacheControl: "31536000" }),
    ]);
    if (up1.error || up2.error) {
      console.error("Video store failed", up1.error?.message ?? up2.error?.message);
      await store.remove([path, posterPath]);
      return fail("feed.video.saveFailed");
    }
    const { error } = await db
      .from("post_videos")
      .update({ status: "ready", path, poster_path: posterPath, width: done.width, height: done.height, duration_ms: done.ms })
      .eq("id", id);
    if (error) {
      console.error("Video row update failed", error.message);
      await store.remove([path, posterPath]);
      return fail("feed.video.saveFailed");
    }
    return { id, url: postVideoUrl(path), posterUrl: postVideoUrl(posterPath), width: done.width, height: done.height, durationMs: done.ms };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
    await db.storage.from(RAW).remove([rawPath]).catch(() => {}); // the raw file is never kept
  }
}

/** The composer's video id, if it sent a well-formed one. */
export function parseVideoId(raw: FormDataEntryValue | null): string | null {
  const s = String(raw ?? "");
  return /^[0-9a-f-]{36}$/i.test(s) ? s : null;
}

/** True when the video is this person's, finished, and not on a post yet. */
export async function videoUsable(userId: string, id: string): Promise<boolean> {
  const { data } = await createAdminClient().from("post_videos").select("id").eq("id", id).eq("user_id", userId).eq("status", "ready").is("post_id", null).maybeSingle();
  return !!data;
}

/** Puts the video on the post at its place in the post's order. Returns false if it couldn't be attached. */
export async function attachVideo(userId: string, postId: string, id: string, position = 0): Promise<boolean> {
  const { data, error } = await createAdminClient()
    .from("post_videos")
    .update({ post_id: postId, position, attached_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .eq("status", "ready")
    .is("post_id", null)
    .select("id");
  if (error || !data?.length) console.error("attachVideo failed", error?.message ?? "no row");
  return !error && !!data?.length;
}

const filesOf = (rows: { path: string | null; poster_path: string | null }[]) => rows.flatMap((r) => [r.path, r.poster_path]).filter((p): p is string => !!p);

/**
 * Deletes video files nobody can see anymore: from deleted posts, from posts moderators removed,
 * uploads that never made it into a post (after a day), and failed or abandoned raw uploads.
 * Safe to run any time.
 */
export async function cleanupPostVideos() {
  const db = createAdminClient();
  const dayAgo = new Date(Date.now() - 86400e3).toISOString();
  const [{ data: loose }, { data: removed }] = await Promise.all([
    db.from("post_videos").select("id, raw_path, path, poster_path").is("post_id", null).or(`attached_at.not.is.null,created_at.lt."${dayAgo}"`).limit(200),
    db.from("post_videos").select("id, raw_path, path, poster_path, post:posts!inner ( removed_at )").not("post.removed_at", "is", null).limit(200),
  ]);
  const gone = [...(loose ?? []), ...(removed ?? [])] as { id: string; raw_path: string; path: string | null; poster_path: string | null }[];
  if (!gone.length) return 0;
  const files = filesOf(gone);
  if (files.length) {
    const { error } = await db.storage.from(BUCKET).remove(files);
    if (error) throw error;
  }
  await db.storage.from(RAW).remove(gone.map((g) => g.raw_path)).catch(() => {});
  await db.from("post_videos").delete().in("id", gone.map((g) => g.id));
  return gone.length;
}

/** Deletes a post's video right away (a moderator removed the post: the file stops working too). */
export async function deletePostVideos(postId: string) {
  const db = createAdminClient();
  const { data } = await db.from("post_videos").select("id, path, poster_path").eq("post_id", postId);
  if (!data?.length) return;
  const files = filesOf(data);
  if (files.length) {
    const { error } = await db.storage.from(BUCKET).remove(files);
    if (error) throw error;
  }
  await db.from("post_videos").delete().in("id", data.map((d) => d.id));
}
