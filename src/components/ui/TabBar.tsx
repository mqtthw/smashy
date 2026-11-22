"use client";
import Link from "next/link";
import { useState, type MouseEvent } from "react";

export type Tab = { key: string; label: string; href: string };

/**
 * X-style tab row: equal-width tabs, bold label with a short brand-red bar under the active one.
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
  return (
    <nav
      aria-label={label}
      className={`flex border-b border-line ${sticky ? "sticky top-0 z-[5] glass-sticky" : ""} overflow-x-auto`}
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
            className={`flex flex-1 shrink-0 justify-center px-4 text-body transition-colors hover:bg-surface ${on ? "font-bold text-foreground" : "text-muted"}`}
          >
            <span className="relative py-3.5">
              {t.label}
              {on && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 rounded-full bg-brand" />}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
