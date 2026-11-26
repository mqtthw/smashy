// The ticker (round 909 on the guest front page; its own piece and on the signed-in Feed since round
// 915, Matthew: "I really like the rotating bar"): what's on near you, the next majors and the week's
// results, running right to left, each a link. It waits while pointed at; people who ask for less
// motion get a row they can scroll. The look is `.ticker` in globals.css.
import Link from "next/link";
import { MajorDates } from "@/components/majors/MajorText";
import { getRegionEvents, type TexasEvents } from "@/lib/events";
import { isRunning, whenLabel } from "@/lib/format";
import { getLang, getT } from "@/lib/i18n/server";
import { majorsFor, type Major } from "@/lib/majors";
import { getViewerRegion } from "@/lib/viewerRegion";

export type TickerItem = { href: string; label: React.ReactNode; name: string; live?: boolean };

/** The ticker's lines: up to four coming up or running in the region, the next six majors, the week's top three results. */
export function tickerItems(events: TexasEvents | null, majors: Major[], lang: string, t: Awaited<ReturnType<typeof getT>>): TickerItem[] {
  const now = Date.now() / 1000;
  const upcoming = (events?.tournaments ?? []).filter((ev) => (ev.endAt ?? ev.startAt + 86400) > now).slice(0, 4);
  return [
    ...upcoming.map((ev) => ({ href: `/events/${ev.slug}`, label: whenLabel(ev, undefined, lang), name: ev.name, live: isRunning(ev) })),
    ...majorsFor(majors, []).slice(0, 6).map((m) => ({ href: `/events/${m.slug}`, label: m.live ? t("browse.majors.happeningNow") : <MajorDates m={m} />, name: m.name, live: m.live })),
    ...(events?.recent ?? []).slice(0, 3).map((ev) => ({ href: `/events/${ev.slug}`, label: t("ui.guest.results"), name: ev.name })),
  ].filter((it, i, all) => all.findIndex((o) => o.href === it.href) === i);
}

export default function LiveTicker({ items, className = "" }: { items: TickerItem[]; className?: string }) {
  if (!items.length) return null;
  return (
    <div className={`ticker ${className}`}>
      <div className="ticker-track">
        {/* The second copy only makes the loop seamless. */}
        {[0, 1].map((copy) => (
          <ul key={copy} aria-hidden={copy === 1} className="flex shrink-0">
            {items.map((it) => (
              <li key={it.href} className="shrink-0">
                <Link href={it.href} tabIndex={copy === 1 ? -1 : undefined} className="flex items-center gap-2 px-4 py-1.5 text-sm whitespace-nowrap hover:underline">
                  <span className={`text-meta font-black tracking-wide uppercase italic ${it.live ? "text-like" : "text-brand"}`}>{it.label}</span>
                  <span className="font-semibold">{it.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}

/** The ticker for someone signed in: their own region's events (their profile's, else where they seem to be). */
export async function FeedTicker({ userId, majors }: { userId: string; majors: Major[] }) {
  // An extra on the Feed: if the region or its events can't be read, the Feed shows without it.
  const [region, t, lang] = await Promise.all([getViewerRegion(userId).catch(() => null), getT(), getLang()]);
  const events = region ? await getRegionEvents(region).catch(() => null) : null;
  return <LiveTicker items={tickerItems(events, majors, lang, t)} />;
}
