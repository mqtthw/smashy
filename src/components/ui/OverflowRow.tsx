"use client";

import { Children, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/client";

// useLayoutEffect warns on the server; this runs it only in the browser.
const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const GAP = 8; // gap-2

/**
 * One line of chips, never two and never a sideways scroll (round 852, Matthew: wrapped rows "take too
 * much room and feel sloppy", scrolling "feels worse"). As many chips as fit are shown in order; the
 * rest go into a "More" button at the end that opens them as a list. The chips are measured in a hidden
 * copy of the row, so the count follows the screen's width as it changes.
 */
export default function OverflowRow({ label, labelledBy, className = "", children }: { label?: string; labelledBy?: string; className?: string; children: React.ReactNode }) {
  const t = useT();
  const items = Children.toArray(children);
  const box = useRef<HTMLDivElement>(null);
  const ruler = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(items.length);
  const [open, setOpen] = useState(false);

  useBrowserLayoutEffect(() => {
    const el = box.current;
    const r = ruler.current;
    if (!el || !r) return;
    const measure = () => {
      const widths = [...r.children].map((c) => (c as HTMLElement).offsetWidth);
      const more = widths.pop() ?? 0; // the last child of the ruler is the More button
      const room = el.clientWidth;
      const total = widths.reduce((s, w, i) => s + w + (i ? GAP : 0), 0);
      if (total <= room) return setFit(widths.length);
      let used = more;
      let n = 0;
      while (n < widths.length && used + GAP + widths[n] <= room) used += GAP + widths[n++];
      setFit(Math.max(1, n));
    };
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    return () => watch.disconnect();
  }, [items.length]);

  // Close the list on a tap elsewhere or Escape.
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  const moreButton = (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" className="chip shrink-0 font-semibold" {...props}>{t("ui.more.title")} ▾</button>
  );
  const hidden = items.slice(fit);
  return (
    <div ref={box} className={`relative ${className}`}>
      {/* The hidden copy the widths are read from: every chip, then the More button. */}
      <div aria-hidden="true" inert className="pointer-events-none invisible absolute inset-0 overflow-hidden">
        <div ref={ruler} className="absolute top-0 left-0 flex gap-2 whitespace-nowrap">
          {items.map((c, i) => <span key={i} className="flex shrink-0">{c}</span>)}
          {moreButton({ tabIndex: -1 })}
        </div>
      </div>
      <nav aria-label={label} aria-labelledby={labelledBy} className="flex gap-2 overflow-hidden whitespace-nowrap [&>*]:shrink-0">
        {items.slice(0, fit)}
        {hidden.length > 0 && (
          <div className="relative">
            {moreButton({ "aria-expanded": open, onClick: () => setOpen((o) => !o) })}
          </div>
        )}
      </nav>
      {open && hidden.length > 0 && (
        <div className="card absolute top-full right-0 z-20 mt-1 flex min-w-44 flex-col gap-1 bg-background p-1.5 shadow-xl [&>*]:justify-start" onClick={() => setOpen(false)}>
          {hidden}
        </div>
      )}
    </div>
  );
}
