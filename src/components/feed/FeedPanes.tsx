"use client";
// The Feed's game tabs. Round 559 built every game's list on each visit, hidden, so tabs switched with no
// server trip; round 657 dropped that to cut the Feed's CPU cost (it was Smashy's most expensive page).
// Now a tab is an ordinary link: the tapped tab lights up at once (so the tap never feels ignored) while
// its posts load, and a tab already opened comes back instantly for a minute (staleTimes.dynamic in
// next.config.ts).
import { useState, type MouseEvent } from "react";
import { useSearchParams } from "next/navigation";
import TabBar, { type Tab } from "@/components/ui/TabBar";

/** The game the address bar shows, or null when it's a later page (?page= or ?before=). */
export function urlGame(sp: Pick<URLSearchParams, "get"> | null): string | null {
  if (!sp || sp.get("page") || sp.get("before")) return null;
  return sp.get("game") ?? "all";
}

export function FeedGameTabs({ tabs, active, label }: { tabs: Tab[]; active: string; label: string }) {
  const want = urlGame(useSearchParams());
  const current = want && tabs.some((t) => t.key === want) ? want : active;
  // The tab just tapped, shown as selected until the address catches up (then `current` takes over).
  const [tapped, setTapped] = useState<{ key: string; from: string } | null>(null);
  const shown = tapped && tapped.from === current ? tapped.key : current;
  const onTabClick = (e: MouseEvent<HTMLAnchorElement>, tab: Tab) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0 || tab.key === current) return;
    setTapped({ key: tab.key, from: current });
  };
  // No wrapper element: the tab row is sticky, and a wrapper would stop it sticking.
  return <TabBar sticky scroll label={label} active={shown} tabs={tabs} onTabClick={onTabClick} />;
}
