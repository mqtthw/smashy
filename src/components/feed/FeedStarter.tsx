import Link from "next/link";
import { getRegionEvents } from "@/lib/events";
import { regionName } from "@/lib/regions";
import { displayCity, sameCity } from "@/lib/cityMatch";
import { formatEventDate, isRunning } from "@/lib/format";
import { getTopClips } from "@/lib/reels";
import ClipStrip from "@/components/feed/ClipStrip";
import Icon from "@/components/ui/Icon";
import { T } from "@/lib/i18n/client";

function upcomingSoon<T extends { startAt: number; endAt?: number | null; city: string | null }>(list: T[], city: string | null): T[] {
  const now = Date.now() / 1000;
  const soon = list.filter((t) => (t.endAt ?? t.startAt + 86400) > now && t.startAt < now + 7 * 86400);
  if (!city) return soon;
  const local = soon.filter((t) => sameCity(city, t.city));
  return local.length ? local : soon;
}

/**
 * Shown on the feed while it's quiet (few or no posts): the top clips, what's on this week, and a nudge
 * to post. So a new member's first look at Smashy is never an empty page.
 * `showClips` and `showEvents` are off where the guest welcome above already shows them.
 */
export default async function FeedStarter({
  myGames,
  city,
  region,
  signedIn,
  showEvents = true,
  showClips = true,
}: {
  myGames: string[];
  city: string | null;
  region: string;
  signedIn: boolean;
  showEvents?: boolean;
  showClips?: boolean;
}) {
  const [clips, events] = await Promise.all([
    showClips ? getTopClips({ myGames, limit: 8 }).catch(() => null) : Promise.resolve(null),
    showEvents ? getRegionEvents(region).catch(() => null) : Promise.resolve(null),
  ]);
  const week = upcomingSoon(events?.tournaments ?? [], city).slice(0, 4);
  const where = city && week.some((t) => sameCity(city, t.city)) ? displayCity(city) : regionName(region);

  return (
    <div className="flex flex-col gap-5 border-b border-line py-5">
      {clips && <ClipStrip reels={clips} headingId="starter-clips" />}

      {week.length > 0 && (
        <section aria-labelledby="starter-events" className="flex flex-col gap-2 px-4">
          <div className="flex items-baseline justify-between">
            <h2 id="starter-events" className="font-bold"><T k="feed.starter.thisWeek" values={{ where }} /></h2>
            <Link href="/events" className="text-sm font-semibold text-brand"><T k="feed.starter.allEvents" /></Link>
          </div>
          <ul className="divide-y divide-line card">
            {week.map((t) => (
              <li key={t.id}>
                <Link href={`/events/${t.slug}`} className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-surface">
                  <span className="truncate text-sm font-semibold">{t.name}</span>
                  <span className={`shrink-0 text-meta ${isRunning(t) ? "font-semibold text-brand" : "text-muted"}`}>{isRunning(t) ? <T k="feed.starter.live" /> : formatEventDate(t.startAt, t.timezone)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mx-4 flex items-center gap-3 rounded-2xl bg-brand/10 p-4">
        <Icon name="megaphone" className="text-2xl text-brand" />
        <div className="min-w-0 flex-1">
          <p className="font-bold"><T k="feed.starter.title" /></p>
          <p className="text-sm text-muted">
            <T k={signedIn ? "feed.starter.signedIn" : "feed.starter.guest"} />
          </p>
        </div>
        {!signedIn && <Link href="/signin" className="btn btn-sm btn-primary shrink-0"><T k="feed.join" /></Link>}
      </section>
    </div>
  );
}
