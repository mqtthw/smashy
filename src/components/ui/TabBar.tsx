"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent } from "react";

export type Tab = { key: string; label: string; href: string };

/**
 * A row of slanted plates (round 846; it was an X-style underlined row): the active one solid red.
 * Tabs are links, so every view has a shareable URL.
 * `sticky` pins the row to the top of the screen while the list scrolls.
 * The tapped tab is underlined the moment it's tapped (round 553), before its page arrives.
 * A row with more tabs than fit scrolls sideways on its own (tabs never shrink), so it can never
 * push the whole page wider than the phone. `scroll` is kept for callers that already pass it.
 */
export default function TabBar({
  tabs,
  active,
  label,
  sticky = false,
  onTabClick,
}: {
  tabs: Tab[];
  active: string;
  label: string;
  sticky?: boolean;
  scroll?: boolean;
  /** Runs before the link is followed; it may call preventDefault (the Feed's instant game tabs). */
  onTabClick?: (e: MouseEvent<HTMLAnchorElement>, tab: Tab) => void;
}) {
  // Remembers which tab was active when another was tapped, so the server's answer takes over again.
  const [tapped, setTapped] = useState<{ key: string; was: string } | null>(null);
  const shown = tapped && tapped.was === active ? tapped.key : active;
  // The active tab scrolls into view when the row is wider than the screen (round 842): Search → Events
  // opened with its own tab hidden past the right edge, so nothing looked selected. Only the row
  // scrolls, never the page.
  const nav = useRef<HTMLElement>(null);
  useEffect(() => {
    const row = nav.current;
    const tab = row?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!row || !tab || row.scrollWidth <= row.clientWidth) return;
    const left = tab.offsetLeft - row.offsetLeft;
    if (left < row.scrollLeft || left + tab.offsetWidth > row.scrollLeft + row.clientWidth) {
      row.scrollLeft = Math.max(0, left - (row.clientWidth - tab.offsetWidth) / 2);
    }
  }, [shown]);
  return (
    <nav
      ref={nav}
      aria-label={label}
      className={`flex gap-1.5 border-b border-line px-4 py-2.5 [scrollbar-width:none] ${sticky ? "sticky top-0 z-[5] glass-sticky" : ""} overflow-x-auto`}
    >
      {tabs.map((t) => {
        const on = t.key === shown;
        return (
          <Link
            key={t.key}
            href={t.href}
            onClick={(e) => {
              onTabClick?.(e, t);
              if (!e.defaultPrevented && !on) setTapped({ key: t.key, was: active });
            }}
            aria-current={on ? "page" : undefined}
            className={`plate text-body ${on ? "plate-on" : ""}`}
          >
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
