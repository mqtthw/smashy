"use client";
// A top-of-page link that goes back where you came from (round 593, Matthew: Hungrybox's page, opened
// from Smash history's records, sent "←" to player search). When this tab reached the page from another
// Smashy page it reads "← Back" and returns there, scroll position and all; opened from outside (a
// shared link, a new tab) it is the page's usual link, e.g. "← Find a player".
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/base";

// Whether this tab can go back to an earlier Smashy page. Where the browser says where it is in the tab's
// history (the Navigation API), that decides: Back from the second page reaches the first, which then
// shows its usual link again, and an opened shared link never sends you off Smashy (round 630). Elsewhere,
// a count of page changes (round 593), which can't tell Back from a new page.
type Nav = { currentEntry?: { index: number } | null };
const nav = (): Nav | undefined => (typeof window === "undefined" ? undefined : (window as unknown as { navigation?: Nav }).navigation);
const startIndex = nav()?.currentEntry?.index ?? null; // where this tab was when Smashy loaded
let pagesShown = 0;
let canBack = false;
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/** Follows page changes in this tab. Mounted once, in the layout. */
export function PageCounter() {
  const pathname = usePathname();
  useEffect(() => {
    pagesShown++;
    const here = nav()?.currentEntry?.index;
    canBack = startIndex !== null && typeof here === "number" ? here > startIndex : pagesShown > 1;
    listeners.forEach((fn) => fn());
  }, [pathname]);
  return null;
}

export default function BackLink({ href, label, className = "" }: { href: string; label: MessageKey; className?: string }) {
  const t = useT();
  const router = useRouter();
  const canGoBack = useSyncExternalStore(subscribe, () => canBack, () => false);
  if (canGoBack) {
    return (
      <button type="button" onClick={() => router.back()} className={className}>
        ← {t("common.back")}
      </button>
    );
  }
  return (
    <Link href={href} className={className}>
      {t(label)}
    </Link>
  );
}
