"use client";

// Videos on a post (up to 2, round 450): the "Video" button, the upload (straight to storage, with
// progress), the server's check and re-save, and the previews in the composer. See lib/postVideos.ts.
import { useEffect, useRef } from "react";
import { startVideo } from "@/app/feed-actions";
import Icon from "@/components/ui/Icon";
import { useT } from "@/lib/i18n/client";
import { MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS, POST_VIDEO_UPLOADS_BUCKET, VIDEO_TYPES, videoLength } from "@/lib/postVideoLinks";

export type DraftVideo = {
  key: string;
  at: number; // when it was added: photos and videos go on the post in this order
  preview: string; // local copy, for the preview while it uploads
  status: "uploading" | "processing" | "ready" | "error";
  progress: number; // 0–100 while uploading
  id?: string;
  posterUrl?: string;
  durationMs?: number;
  error?: string;
};

type SetVideos = (fn: (cur: DraftVideo[]) => DraftVideo[]) => void;

/** True while a video is still on its way (the Post button waits). */
export const videoBusy = (videos: DraftVideo[]) => videos.some((v) => v.status === "uploading" || v.status === "processing");

/** How long a local video file is, in seconds (null if the browser can't tell). */
function fileSeconds(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => resolve(Number.isFinite(v.duration) ? v.duration : null);
    v.onerror = () => resolve(null);
    v.src = url;
  });
}

/** Sends the file to the one-time upload link, reporting progress. */
function sendFile(path: string, token: string, file: File, onProgress: (pct: number) => void): Promise<boolean> {
  return new Promise((resolve) => {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/upload/sign/${POST_VIDEO_UPLOADS_BUCKET}/${path}?token=${encodeURIComponent(token)}`;
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("apikey", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("content-type", file.type);
    xhr.setRequestHeader("cache-control", "max-age=3600");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
    xhr.onerror = () => resolve(false);
    xhr.send(file);
  });
}

/** The "Video" button. Off once the post has 2 videos or 4 attachments in all. */
export function AddVideoButton({ setVideos, full }: { setVideos: SetVideos; full: boolean }) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);

  async function add(file: File | undefined) {
    if (input.current) input.current.value = "";
    if (!file) return;
    const preview = URL.createObjectURL(file);
    const key = preview;
    const update = (patch: Partial<DraftVideo>) => setVideos((cur) => cur.map((v) => (v.key === key ? { ...v, ...patch } : v)));
    setVideos((cur) => [...cur, { key, at: Date.now(), preview, status: "uploading", progress: 0 }]);
    // Quick checks first, so nobody waits for an upload that would be turned down anyway.
    if (!(VIDEO_TYPES as readonly string[]).includes(file.type)) return update({ status: "error", error: t("feed.video.type") });
    if (file.size > MAX_VIDEO_BYTES) return update({ status: "error", error: t("feed.video.big", { mb: MAX_VIDEO_BYTES / 1024 / 1024 }) });
    const seconds = await fileSeconds(preview);
    if (seconds !== null && seconds > MAX_VIDEO_SECONDS + 0.5) return update({ status: "error", error: t("feed.video.long", { s: MAX_VIDEO_SECONDS }) });

    const start = await startVideo(file.size, file.type).catch(() => ({ error: t("feed.video.saveFailed") }));
    if ("error" in start) return update({ status: "error", error: start.error });
    if (!(await sendFile(start.path, start.token, file, (progress) => update({ progress })))) return update({ status: "error", error: t("feed.video.notUploaded") });

    update({ status: "processing", progress: 100 });
    try {
      const res = await fetch("/api/post-videos/finish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: start.id }) });
      const json = (await res.json()) as { video?: { id: string; posterUrl: string; durationMs: number }; error?: string };
      if (json.video) update({ status: "ready", id: json.video.id, posterUrl: json.video.posterUrl, durationMs: json.video.durationMs });
      else update({ status: "error", error: json.error ?? t("feed.video.saveFailed") });
    } catch {
      update({ status: "error", error: t("feed.video.saveFailed") });
    }
  }

  const blocked = full;
  const label = full ? t("feed.media.full") : t("feed.video.add");
  return (
    <>
      <input ref={input} type="file" accept={VIDEO_TYPES.join(",")} hidden onChange={(e) => void add(e.target.files?.[0])} />
      <button type="button" onClick={() => input.current?.click()} disabled={blocked} className="btn btn-sm btn-ghost" aria-label={label} title={label}>
        <Icon name="play" /> <span className="hidden sm:inline">{t("feed.video.button")}</span>
      </button>
    </>
  );
}

/** The videos being added, each with its preview, where it's at, and a remove button. */
export function DraftVideosView({ videos, setVideos }: { videos: DraftVideo[]; setVideos: SetVideos }) {
  if (!videos.length) return null;
  return (
    <div className="flex flex-col gap-2">
      {videos.map((v) => <DraftVideoView key={v.key} video={v} onRemove={() => setVideos((cur) => cur.filter((x) => x.key !== v.key))} />)}
    </div>
  );
}

function DraftVideoView({ video, onRemove }: { video: DraftVideo; onRemove: () => void }) {
  const t = useT();
  // Free the local copy when it goes away.
  const preview = video.preview;
  useEffect(() => () => URL.revokeObjectURL(preview), [preview]);
  return (
    <div className="flex flex-col gap-1">
      <div className="relative overflow-hidden rounded-xl bg-black">
        <video
          src={video.preview}
          poster={video.posterUrl}
          muted
          playsInline
          controls={video.status === "ready"}
          preload="metadata"
          className={`max-h-72 w-full object-contain ${video.status === "ready" ? "" : "opacity-50"}`}
        />
        {video.status !== "ready" && video.status !== "error" && (
          <span className="absolute inset-x-3 bottom-3 flex flex-col gap-1 rounded-lg bg-black/70 p-2 text-sm text-white" role="status">
            {video.status === "uploading" ? t("feed.video.uploading", { pct: video.progress }) : t("feed.video.processing")}
            {video.status === "uploading" && (
              <span className="h-1.5 overflow-hidden rounded-full bg-white/20">
                <span className="block h-full bg-white" style={{ width: `${video.progress}%` }} />
              </span>
            )}
          </span>
        )}
        <button type="button" onClick={onRemove} className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-sm text-white" aria-label={t("feed.video.remove")}>
          ✕
        </button>
      </div>
      {video.status === "error" && <p className="text-sm text-danger" role="alert">{video.error}</p>}
      {video.status === "ready" && video.durationMs ? <p className="text-meta text-muted">{t("feed.video.readyNote", { length: videoLength(video.durationMs) })}</p> : null}
      {video.status !== "error" && video.status !== "ready" && <p className="text-meta text-muted">{t("feed.video.hint", { s: MAX_VIDEO_SECONDS, mb: MAX_VIDEO_BYTES / 1024 / 1024 })}</p>}
    </div>
  );
}
