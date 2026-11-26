"use client";

import { Children, isValidElement, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/client";

// useLayoutEffect warns on the server; this runs it only in the browser.
const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const GAP = 8; // gap-2

/**
 * One line of chips, never two and never a sideways scroll (round 852, Matthew: wrapped rows "take too
 * much room and feel sloppy", scrolling "feels worse"). As many chips as fit are shown in order; the
 * rest go into a "More" button at the end that opens them as a list. The chips are measured in a hidden
 * copy of the row, so the count follows the screen's width as it changes. A chip that's picked
 * (aria-current or aria-pressed) always stays in the row, so the choice is never hidden under More.
 */
export default function OverflowRow({ label, labelledBy, className = "", children }: { label?: string; labelledBy?: string; className?: string; children: React.ReactNode }) {
  const t = useT();
  const items = Children.toArray(children);
  const box = useRef<HTMLDivElement>(null);
  const ruler = useRef<HTMLDivElement>(null);
  const all = items.map((_, i) => i);
  const [shown, setShown] = useState<number[]>(all);
  // The picked chips (the year you're on, the game filter that's on): kept in the row whatever the width.
  const picked = items.map((c, i) => (isValidElement<{ "aria-current"?: unknown; "aria-pressed"?: unknown }>(c) && (c.props["aria-current"] || c.props["aria-pressed"] === true) ? i : -1)).filter((i) => i >= 0);
  const pickedKey = picked.join(",");
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
      if (total <= room) return setShown(widths.map((_, i) => i));
      const keep = new Set(pickedKey ? pickedKey.split(",").map(Number) : []);
      let used = more + [...keep].reduce((s, i) => s + GAP + (widths[i] ?? 0), 0);
      for (let i = 0; i < widths.length; i++) {
        if (keep.has(i)) continue;
        if (used + GAP + widths[i] > room) break;
        used += GAP + widths[i];
        keep.add(i);
      }
      if (!keep.size) keep.add(0);
      setShown([...keep].sort((a, b) => a - b));
    };
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    return () => watch.disconnect();
  }, [items.length, pickedKey]);

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
  const visible = shown.filter((i) => i < items.length).map((i) => items[i]);
  const hidden = items.filter((_, i) => !shown.includes(i));
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
        {visible}
        {hidden.length > 0 && (
          <div className="relative">
            {moreButton({ "aria-expanded": open, onClick: () => setOpen((o) => !o) })}
          </div>
        )}
      </nav>
      {open && hidden.length > 0 && (
        <div
          className={`card absolute top-full right-0 z-20 mt-1 flex gap-1 bg-background p-1.5 shadow-xl ${hidden.length > 6 ? "w-72 flex-wrap" : "min-w-44 flex-col [&>*]:justify-start"}`}
          onClick={() => setOpen(false)}
        >
          {hidden}
        </div>
      )}
    </div>
  );
}
