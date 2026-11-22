"use client";

// A post's video: its still picture until someone presses play. Nothing downloads before that
// (preload "none"), which keeps the feed light and Smashy's storage bill down.
import { useT } from "@/lib/i18n/client";
import { videoLength, type PostVideo } from "@/lib/postVideoLinks";

export default function PostVideoPlayer({ video }: { video: PostVideo }) {
  const t = useT();
  const tall = video.height > video.width;
  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-line bg-black">
      <video
        src={video.url}
        poster={video.posterUrl}
        controls
        playsInline
        preload="none"
        width={video.width}
        height={video.height}
        aria-label={t("feed.video.label", { length: videoLength(video.durationMs) })}
        className={`mx-auto block h-auto object-contain ${tall ? "max-h-[32rem] w-auto max-w-full" : "w-full"}`}
        style={{ aspectRatio: `${video.width} / ${video.height}` }}
      />
    </div>
  );
}
