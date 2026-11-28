"use client";

// Phones only (round 888): the Smashy wordmark (to the home page) with the same buttons as the home page's
// header (round 902: search, Characters and More; it had only search, so the header changed from page to
// page). Someone opening a shared link to an event or a player page used to see only "← Back" and the tab
// bar. Not on the home page (it has its own header), Reels and an open chat (full screen), or sign-in.
import type { ReactNode } from "react";
import IntentLink from "@/components/ui/IntentLink";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";
import RotatingCharacterIcon from "@/components/RotatingCharacterIcon";
import { useT } from "@/lib/i18n/client";

const SKIP = [/^\/$/, /^\/reels/, /^\/messages\/.+/, /^\/signin/, /^\/welcome/, /^\/auth/];

/** The home page header's round button look (src/app/page.tsx). */
export const PHONE_HEADER_BTN = "flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-full border border-line px-2 text-sm font-semibold text-foreground hover:bg-surface";

export default function PhoneBrandBar({ menu, characterIcons }: { menu: ReactNode; characterIcons: string[] }) {
  const pathname = usePathname() ?? "/";
  const t = useT();
  if (SKIP.some((r) => r.test(pathname))) return null;
  return (
    <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2 md:hidden print:hidden">
      <IntentLink href="/" aria-label={t("nav.home")}>
        <Logo className="text-2xl" />
      </IntentLink>
      <div className="flex items-center gap-2">
        <IntentLink href="/search" aria-label={t("feed.search")} title={t("feed.search")} className={PHONE_HEADER_BTN}>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current" strokeWidth={2}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
        </IntentLink>
        <IntentLink href="/games" title={t("feed.resources")} className={PHONE_HEADER_BTN}>
          <RotatingCharacterIcon icons={characterIcons} />
          <span>{t("feed.resources")}</span>
        </IntentLink>
        {menu}
      </div>
    </div>
  );
}
