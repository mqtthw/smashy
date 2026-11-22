"use client";

import { useEffect, useRef } from "react";
import { uploadImage } from "@/app/feed-actions";
import { shrinkImage } from "@/lib/shrinkImage";
import Icon from "@/components/ui/Icon";
import { useT } from "@/lib/i18n/client";

export const MAX_IMAGES = 4;

export type DraftImage = {
  key: string;
  preview: string; // local preview while uploading
  status: "uploading" | "ready" | "error";
  id?: string;
  error?: string;
  alt: string;
  at: number; // when it was added: photos and videos go on the post in this order
};

/** What the post form sends: the uploaded images, in order. */
export const imagesField = (images: DraftImage[]) =>
  JSON.stringify(images.filter((i) => i.status === "ready").map((i) => ({ id: i.id, alt: i.alt })));

type SetImages = (fn: (cur: DraftImage[]) => DraftImage[]) => void;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** Only the image files from a pick, paste or drop. */
export const imageFiles = (files: FileList | File[] | null | undefined) => Array.from(files ?? []).filter((f) => IMAGE_TYPES.includes(f.type));

// crypto.randomUUID only exists on https/localhost; plain http (e.g. testing on a phone over wifi) needs a fallback.
const newKey = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

/**
 * Adds photos (from the button, a paste or a drop): shrinks each, uploads it, and tracks its status.
 * Use one per composer: it counts photos already being added, so quick repeat picks can't go past 4.
 */
export function useAddImages(images: DraftImage[], setImages: SetImages, reserved = 0) {
  const t = useT();
  const count = useRef(images.length);
  useEffect(() => {
    count.current = images.length;
  }, [images.length]);

  return async function add(files: File[]) {
    const room = Math.max(0, MAX_IMAGES - count.current - reserved); // videos share the 4 places
    const picked = files.slice(0, room).map((file) => ({ file, key: newKey(), preview: URL.createObjectURL(file) }));
    count.current += picked.length;
    if (!picked.length) return;
    const now = Date.now();
    setImages((cur) => [...cur, ...picked.map(({ key, preview }, i) => ({ key, preview, status: "uploading" as const, alt: "", at: now + i }))]);
    for (const { file, key } of picked) {
      const update = (patch: Partial<DraftImage>) => setImages((cur) => cur.map((i) => (i.key === key ? { ...i, ...patch } : i)));
      try {
        const small = await shrinkImage(file);
        const fd = new FormData();
        fd.append("file", new File([small], "photo.jpg", { type: "image/jpeg" }));
        const res = await uploadImage(fd);
        if (res.image) update({ status: "ready", id: res.image.id });
        else update({ status: "error", error: res.error ?? t("feed.photo.addFailed") });
      } catch {
        update({ status: "error", error: t("feed.photo.readFailed") });
      }
    }
  };
}

/** The "Photo" button. `onFiles` is the composer's useAddImages (shared with paste and drop). */
export function AddPhotoButton({ full, onFiles }: { full: boolean; onFiles: (files: File[]) => Promise<void> }) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);

  async function add(files: FileList | null) {
    await onFiles(imageFiles(files));
    if (input.current) input.current.value = "";
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        hidden
        onChange={(e) => void add(e.target.files)}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={full}
        className="btn btn-sm btn-ghost"
        aria-label={full ? t("feed.photo.max", { n: MAX_IMAGES }) : t("feed.photo.add")}
        title={full ? t("feed.photo.max", { n: MAX_IMAGES }) : t("feed.photo.add")}
      >
        <Icon name="image" /> {t("feed.photo.button")}
      </button>
    </>
  );
}

/** Previews of the photos being added, with a remove button and an optional description each. */
export function DraftImages({ images, setImages }: { images: DraftImage[]; setImages: SetImages }) {
  const t = useT();
  // Free the local previews when they go away.
  const previews = useRef(new Set<string>());
  useEffect(() => {
    const now = new Set(images.map((i) => i.preview));
    for (const p of previews.current) if (!now.has(p)) URL.revokeObjectURL(p);
    previews.current = now;
  }, [images]);

  if (!images.length) return null;
  const remove = (key: string) => setImages((cur) => cur.filter((i) => i.key !== key));
  return (
    <div className="grid grid-cols-2 gap-2">
      {images.map((img, n) => (
        <div key={img.key} className="flex flex-col gap-1">
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-surface">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.preview} alt="" className={`h-full w-full object-cover ${img.status === "ready" ? "" : "opacity-50"}`} />
            {img.status === "uploading" && (
              <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold">{t("feed.photo.checking")}</span>
            )}
            <button
              type="button"
              onClick={() => remove(img.key)}
              aria-label={t("feed.photo.remove", { n: n + 1 })}
              className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white"
            >
              ✕
            </button>
          </div>
          {img.status === "error" ? (
            <p className="text-xs text-danger">{img.error}</p>
          ) : (
            <input
              value={img.alt}
              onChange={(e) => setImages((cur) => cur.map((i) => (i.key === img.key ? { ...i, alt: e.target.value.slice(0, 300) } : i)))}
              placeholder={t("feed.photo.describe")}
              aria-label={t("feed.photo.describeLabel", { n: n + 1 })}
              className="field py-1 text-xs"
            />
          )}
        </div>
      ))}
    </div>
  );
}
