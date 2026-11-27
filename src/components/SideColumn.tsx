"use client";

// The right-hand column on wide screens (round 500): online brackets today, on the home page only
// (round 899). Phones and tablets never load it: it asks /api/side only once the screen
// is wide enough to show it.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArcadePromo } from "@/components/arcade/ArcadeCard";
import GameBadge from "@/components/GameBadge";
import { formatEventTime } from "@/lib/format";
import { useLang, useT } from "@/lib/i18n/client";
import type { SideData } from "@/lib/sideColumn";

const WIDE = "(min-width: 1280px)";

export default function SideColumn() {
  const t = useT();
  const lang = useLang();
  const [data, setData] = useState<SideData | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const media = window.matchMedia(WIDE);
    let loaded = false;
    const load = () => {
      if (loaded || !media.matches) return;
      loaded = true;
      fetch("/api/side")
        .then((r) => (r.ok ? r.json() : null))
        .then((d: SideData | null) => d && setData(d))
        .catch(() => {});
    };
    load();
    media.addEventListener("change", load);
    return () => media.removeEventListener("change", load);
  }, []);

  // Until the lists arrive, an empty column of the same width holds the space (round 723): the page used to
  // be centered without it, then jump 160 px to the left when it appeared, on every page load.
  // Only the home page fills it, with "Online today" (round 813 moved that list here; the home page hides its
  // own copy on wide screens). Elsewhere it stays empty (rounds 869, 892, 899: reviewers saw nearby events and
  // the same two majors beside every page as a copy-pasted rail). The empty column keeps pages from shifting.
  // The home page and, since round 965, Play (Matthew: "we should include this right tab on the Play page as well").
  const home = pathname === "/" || pathname === "/play";
  // Round 901: other pages get no column at all, so they sit centred; an empty column left a wide dark strip.
  if (!home) return null;
  if (!data) return <div aria-hidden="true" className="hidden w-80 shrink-0 print:hidden xl:block" />;

  return (
    <aside aria-label={t("browse.brackets.onlineToday")} className="sticky top-0 hidden h-screen w-80 shrink-0 flex-col gap-4 overflow-y-auto p-4 print:hidden xl:flex">
      {/* The Arcade's daily puzzles (round 944, Matthew: on the right "so it stands out and isn't in the way of
          the feed"). Narrower screens have no column, so the Feed keeps its own card there. */}
      <ArcadePromo />
      {/* Online brackets today (round 813, Matthew: in the side column "so the feed isn't too cluttered"). */}
      {data.online?.length > 0 && (
        <section className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between px-1">
            <h2 className="font-bold">{t("browse.brackets.onlineToday")}</h2>
            <Link href="/events?view=online" className="text-meta font-semibold text-brand">{t("browse.brackets.allOnline")}</Link>
          </div>
          <ul className="card flex flex-col divide-y divide-line overflow-hidden">
            {data.online.map((o) => (
              <li key={o.slug}>
                <Link href={o.href} className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface">
                  <span className="flex shrink-0 flex-col gap-1">{o.games.map((g) => <GameBadge key={g} game={g} />)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{o.name}</span>
                    <span className="block truncate text-meta text-muted">
                      {[o.live ? t("browse.live") : formatEventTime(o.start, o.timezone, lang), o.players ? t("browse.players", { n: o.players }) : null].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
