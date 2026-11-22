"use client";

import { useEffect, useRef, useState } from "react";
import type { PostImage } from "@/lib/postImageLinks";
import { useT } from "@/lib/i18n/client";

/**
 * A post's photos, Twitter-style: one photo keeps its shape (very tall ones are cropped to 3:4),
 * two to four share a 16:9 grid. Tapping a photo opens a full-screen viewer (arrows, swipe, Esc).
 */
export default function PostImages({ images }: { images: PostImage[] }) {
  const t = useT();
  const [open, setOpen] = useState<number | null>(null);
  if (!images.length) return null;
  const one = images.length === 1;
  return (
    <>
      <div
        className={`mt-2 overflow-hidden rounded-xl border border-line ${one ? "" : "grid aspect-video grid-cols-2 gap-0.5"} ${images.length > 2 ? "grid-rows-2" : ""}`}
        style={one ? { aspectRatio: String(Math.max(images[0].width / images[0].height, 0.75)) } : undefined}
      >
        {images.map((img, i) => (
          <button
            key={img.url}
            type="button"
            onClick={() => setOpen(i)}
            className={`relative block h-full w-full cursor-zoom-in bg-surface ${images.length === 3 && i === 0 ? "row-span-2" : ""}`}
            aria-label={img.alt ? t("feed.photo.view", { alt: img.alt }) : t("feed.photo.viewN", { n: i + 1, total: images.length })}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt={img.alt} width={img.width} height={img.height} loading="lazy" decoding="async" className="h-full w-full object-cover" />
            {img.alt && (
              <span title={img.alt} className="absolute bottom-1.5 left-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-white">ALT</span>
            )}
          </button>
        ))}
      </div>
      {open !== null && <PhotoViewer images={images} start={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function PhotoViewer({ images, start, onClose }: { images: PostImage[]; start: number; onClose: () => void }) {
  const t = useT();
  const dialog = useRef<HTMLDialogElement>(null);
  const [i, setI] = useState(start);
  const touchX = useRef<number | null>(null);
  const many = images.length > 1;
  const go = (d: number) => setI((n) => (n + d + images.length) % images.length);

  useEffect(() => {
    // Traps focus; Esc closes (fires "close"). No close() on cleanup: that would fire onClose and
    // shut the viewer the moment React re-runs this effect (it does in development).
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
  }, []);

  const img = images[i];
  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
      onKeyDown={(e) => {
        if (many && e.key === "ArrowRight") go(1);
        if (many && e.key === "ArrowLeft") go(-1);
      }}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        const start = touchX.current;
        touchX.current = null;
        if (!many || start === null) return;
        const dx = e.changedTouches[0].clientX - start;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      }}
      aria-label={t("feed.photo.of", { n: i + 1, total: images.length })}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-black/95 p-0 text-white backdrop:bg-black/80"
    >
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-4" onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img.url} alt={img.alt} className="max-h-[85dvh] max-w-full object-contain" />
        {(img.alt || many) && (
          <p className="max-w-xl text-center text-sm text-white/80">
            {many && <span className="mr-2 font-semibold">{i + 1} / {images.length}</span>}
            {img.alt}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => dialog.current?.close()}
        aria-label={t("common.close")}
        autoFocus
        className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-lg hover:bg-white/25"
      >
        ✕
      </button>
      {many && (
        <>
          <button type="button" onClick={() => go(-1)} aria-label={t("feed.photo.prev")} className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-xl hover:bg-white/25">
            ‹
          </button>
          <button type="button" onClick={() => go(1)} aria-label={t("feed.photo.next")} className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-xl hover:bg-white/25">
            ›
          </button>
        </>
      )}
    </dialog>
  );
}
