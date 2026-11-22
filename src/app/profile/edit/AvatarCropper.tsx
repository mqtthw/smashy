"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/client";

const VIEW = 288; // the crop box, in CSS pixels
const OUT = 512; // the saved picture, in pixels
const MAX_ZOOM = 4;

type Pos = { x: number; y: number }; // where the image's top-left corner sits inside the crop box

/**
 * Crop a profile picture: drag to move, the slider, scroll wheel or +/- buttons to zoom.
 * Hands back a square JPEG of what's inside the circle.
 */
export default function AvatarCropper({ src, onCancel, onDone }: { src: string; onCancel: () => void; onDone: (picture: Blob) => void }) {
  const t = useT();
  const dialog = useRef<HTMLDialogElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState<Pos>({ x: 0, y: 0 });
  const drag = useRef<{ id: number; startX: number; startY: number; from: Pos } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  // The picture being cropped: the original, or a rotated copy (a temporary blob: link).
  const [working, setWorking] = useState(src);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  useEffect(() => {
    const el = new Image();
    el.crossOrigin = "anonymous"; // so a picture from storage can be redrawn and saved
    el.onload = () => {
      const s = VIEW / Math.min(el.naturalWidth, el.naturalHeight);
      setPos({ x: (VIEW - el.naturalWidth * s) / 2, y: (VIEW - el.naturalHeight * s) / 2 });
      setZoom(1);
      setImg(el);
    };
    el.onerror = () => setFailed(true);
    el.src = working;
    return () => {
      if (working !== src && working.startsWith("blob:")) URL.revokeObjectURL(working);
    };
  }, [working, src]);

  // Turn the picture a quarter turn clockwise (makes a rotated copy, then crops that).
  const rotate = () => {
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalHeight;
    canvas.height = img.naturalWidth;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.translate(canvas.width, 0);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(img, 0, 0);
    try {
      canvas.toBlob((b) => b && setWorking(URL.createObjectURL(b)), "image/png");
    } catch {
      setFailed(true);
    }
  };

  const scaleFor = (z: number) => (img ? (VIEW / Math.min(img.naturalWidth, img.naturalHeight)) * z : 1);
  // Keep the picture covering the whole crop box.
  const clamp = (p: Pos, z: number): Pos => {
    if (!img) return p;
    const s = scaleFor(z);
    return {
      x: Math.min(0, Math.max(VIEW - img.naturalWidth * s, p.x)),
      y: Math.min(0, Math.max(VIEW - img.naturalHeight * s, p.y)),
    };
  };
  // Zoom around the middle of the circle.
  const zoomTo = (next: number) => {
    const z = Math.min(MAX_ZOOM, Math.max(1, next));
    const ratio = scaleFor(z) / scaleFor(zoom);
    const c = VIEW / 2;
    setPos(clamp({ x: c - (c - pos.x) * ratio, y: c - (c - pos.y) * ratio }, z));
    setZoom(z);
  };

  // Scroll-wheel zoom. A native listener, because React's can't stop the page behind from scrolling.
  const latest = useRef({ zoomTo, zoom });
  useEffect(() => {
    latest.current = { zoomTo, zoom };
  });
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      latest.current.zoomTo(latest.current.zoom - e.deltaY * 0.002);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [img]);

  const save = () => {
    if (!img) return;
    const s = scaleFor(zoom);
    const canvas = document.createElement("canvas");
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return setFailed(true);
    ctx.fillStyle = "#ffffff"; // see-through parts become white
    ctx.fillRect(0, 0, OUT, OUT);
    ctx.drawImage(img, -pos.x / s, -pos.y / s, VIEW / s, VIEW / s, 0, 0, OUT, OUT);
    try {
      canvas.toBlob((b) => (b ? onDone(b) : setFailed(true)), "image/jpeg", 0.9);
    } catch {
      setFailed(true);
    }
  };

  const s = scaleFor(zoom);
  return (
    <dialog
      ref={dialog}
      onClose={onCancel}
      aria-label={t("people.crop.title")}
      className="m-auto w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-background p-5 text-foreground backdrop:bg-black/60"
    >
      <h2 className="mb-1 text-lg font-bold">{t("people.crop.title")}</h2>
      <p className="mb-3 text-meta text-muted">{t("people.crop.help")}</p>
      {failed ? (
        <p role="alert" className="text-sm text-danger">{t("people.crop.failed")}</p>
      ) : (
        <div
          className="relative mx-auto touch-none select-none overflow-hidden rounded-xl bg-surface-2"
          style={{ width: VIEW, height: VIEW, cursor: img ? "grab" : "default" }}
          onPointerDown={(e) => {
            if (!img) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { id: e.pointerId, startX: e.clientX, startY: e.clientY, from: pos };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d || d.id !== e.pointerId) return;
            setPos(clamp({ x: d.from.x + e.clientX - d.startX, y: d.from.y + e.clientY - d.startY }, zoom));
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          ref={box}
          tabIndex={0}
          role="group"
          aria-roledescription={t("people.crop.area")}
          aria-label={t("people.crop.areaHelp")}
          onKeyDown={(e) => {
            if (e.key === "+" || e.key === "=") return zoomTo(zoom + 0.25);
            if (e.key === "-") return zoomTo(zoom - 0.25);
            const step = { ArrowLeft: [8, 0], ArrowRight: [-8, 0], ArrowUp: [0, 8], ArrowDown: [0, -8] }[e.key];
            if (!step) return;
            e.preventDefault();
            setPos(clamp({ x: pos.x + step[0], y: pos.y + step[1] }, zoom));
          }}
        >
          {img && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={working}
              alt=""
              draggable={false}
              className="pointer-events-none absolute left-0 top-0 max-w-none"
              style={{ width: img.naturalWidth * s, height: img.naturalHeight * s, transform: `translate(${pos.x}px, ${pos.y}px)` }}
            />
          )}
          {/* The circle that becomes the picture; outside it is dimmed. */}
          <div className="pointer-events-none absolute inset-0 rounded-full" style={{ boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.5)" }} />
        </div>
      )}
      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={() => zoomTo(zoom - 0.25)} disabled={!img || zoom <= 1} className="btn btn-sm btn-ghost" aria-label={t("people.crop.zoomOut")}>−</button>
        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          disabled={!img}
          onChange={(e) => zoomTo(Number(e.target.value))}
          aria-label={t("people.crop.zoom")}
          className="flex-1"
        />
        <button type="button" onClick={() => zoomTo(zoom + 0.25)} disabled={!img || zoom >= MAX_ZOOM} className="btn btn-sm btn-ghost" aria-label={t("people.crop.zoomIn")}>+</button>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={rotate} disabled={!img || failed} className="btn btn-sm btn-ghost mr-auto" aria-label={t("people.crop.rotateAria")}>{t("people.crop.rotate")}</button>
        <button type="button" onClick={() => dialog.current?.close()} className="btn btn-sm btn-ghost">{t("common.cancel")}</button>
        <button type="button" onClick={save} disabled={!img || failed} className="btn btn-sm btn-primary">{t("people.crop.save")}</button>
      </div>
    </dialog>
  );
}
