// "More smash in Texas" at the bottom of an event page (round 704): most visitors arrive from a Google search
// for one tournament and leave after that page, so it lists up to 4 other upcoming tournaments in the same
// region, plus a link to all of them. Guests also get one line on why to make an account. Reads only the
// saved lists (no start.gg request), and shows nothing when the region is unknown or has nothing else coming up.
import Link from "next/link";
import GameBadge from "@/components/GameBadge";
import { getSavedUpcomingTournaments } from "@/lib/events";
import { dateBadgeParts } from "@/lib/format";
import type { MessageKey, Values } from "@/lib/i18n/core";
import { regionName } from "@/lib/regions";
import { signInPath } from "@/lib/returnTo";
import { nearbyPicks } from "@/lib/nearbyPicks";

type Props = { region: string; slug: string; signedIn: boolean; lang: string; t: (key: MessageKey, values?: Values) => string };

export default async function NearbyEvents({ region, slug, signedIn, lang, t }: Props) {
  const picks = nearbyPicks(await getSavedUpcomingTournaments(region).catch(() => []), slug);
  if (!picks.length) return null;
  const place = regionName(region);
  return (
    <section className="card overflow-hidden">
      <h2 className="px-4 pt-4 pb-1 font-bold">{t("browse.event.nearby", { place })}</h2>
      <ul className="divide-y divide-line">
        {picks.map((e) => {
          const d = dateBadgeParts(e.startAt, e.timezone, lang);
          return (
            <li key={e.id}>
              <Link href={`/events/${e.slug}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface">
                <span className="date-bubble" aria-hidden="true">
                  <span className="text-[0.625rem] font-bold text-brand">{d.month}</span>
                  <span className="text-lg font-bold">{d.day}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{e.name}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-1">
                    {[...new Set(e.events.map((x) => x.game))].slice(0, 2).map((g) => <GameBadge key={g} game={g} />)}
                    {e.city && <span className="truncate text-meta text-muted">{e.city}</span>}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <Link href={`/events?region=${encodeURIComponent(region)}`} className="block border-t border-line px-4 py-3 text-sm font-semibold text-brand hover:bg-surface">
        {t("browse.event.nearbyAll", { place })} →
      </Link>
      {!signedIn && (
        <div className="flex items-center gap-3 border-t border-line bg-surface px-4 py-3">
          <p className="min-w-0 flex-1 text-sm text-muted">{t("browse.event.joinPitch")}</p>
          <Link href={signInPath(`/events/${slug}`)} className="btn btn-sm btn-primary shrink-0">{t("browse.event.join")}</Link>
        </div>
      )}
    </section>
  );
}
