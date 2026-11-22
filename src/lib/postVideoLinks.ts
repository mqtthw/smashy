// Where post videos live (Supabase Storage). Kept apart from postVideos.ts so pages that only show
// videos don't load the video converter.

export type PostVideo = { url: string; posterUrl: string; width: number; height: number; durationMs: number };

/** Raw uploads (private; the browser puts the file here, the server processes and deletes it). */
export const POST_VIDEO_UPLOADS_BUCKET = "post-video-uploads";
/** Finished videos (MP4) and their still pictures (WebP), public. */
export const POST_VIDEOS_BUCKET = "post-videos";

export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // Supabase's free plan allows 50 MB per file
export const MAX_VIDEO_SECONDS = 60;
export const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"] as const;

export const postVideoUrl = (path: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${POST_VIDEOS_BUCKET}/${path}`;

/** "0:42" */
export function videoLength(ms: number) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
