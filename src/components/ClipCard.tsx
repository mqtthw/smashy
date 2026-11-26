"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

/**
 * A short gameplay clip that loops silently while it's on screen (round 914), with who posted it under
 * it. It only loads once it's near the screen and pauses when scrolled away, so a page of them costs a
 * phone little. People who ask their device for less motion get the still picture and the video's own
 * controls instead. Tapping the clip pauses or resumes it.
 */
export default function ClipCard({ src, poster, width, height, caption, by, href, label }: { src: string; poster: string; width: number; height: number; caption: string; by: string; href: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      v.controls = true;
      return;
    }
    const watch = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) void v.play().catch(() => {});
        else v.pause();
      },
      { rootMargin: "100px" },
    );
    watch.observe(v);
    return () => watch.disconnect();
  }, []);

  return (
    <figure className="flex flex-col gap-1">
      <video
        ref={ref}
        src={src}
        poster={poster}
        width={width}
        height={height}
        muted
        loop
        playsInline
        preload="none"
        aria-label={label}
        onClick={(e) => (e.currentTarget.paused ? void e.currentTarget.play().catch(() => {}) : e.currentTarget.pause())}
        className="max-h-72 w-full cursor-pointer rounded-lg border border-line bg-black object-contain"
      />
      <figcaption className="text-meta text-muted">
        {caption && <span className="text-foreground">{caption} · </span>}
        <Link href={href} className="hover:underline">{by}</Link>
      </figcaption>
    </figure>
  );
}
