import Link from "next/link";
import { connection } from "next/server";
import GameBadge from "@/components/GameBadge";
import { bracketPath } from "@/lib/brackets/types";
import { currentBracket, formatEventTime } from "@/lib/format";
import { onlineToday } from "@/lib/onlineToday";
import { getOnlineTournaments } from "@/lib/startgg";
import Icon from "@/components/ui/Icon";
import { getT } from "@/lib/i18n/server";
import Fold from "@/components/ui/Fold";

/**
 * Today's online brackets on start.gg (the same shared list as the Online tab): live ones open their
 * bracket. `as` is the heading level (h3 when it sits under another heading, as on the guest home page);
 * `fold` lets the heading fold the list shut (guest home).
 */
export default async function OnlineToday({ as: Heading = "h2", fold = false }: { as?: "h2" | "h3"; fold?: boolean } = {}) {
  await connection(); // "today" depends on the current time
  const rows = onlineToday(await getOnlineTournaments().catch(() => []));
  const tr = await getT();
  if (!rows.length) return null;
  const heading = <Heading id="online-today" className="font-bold"><Icon name="globe" /> {tr("browse.brackets.onlineToday")}</Heading>;
  const allLink = <Link href="/events?view=online" className="text-meta text-brand">{tr("browse.brackets.allOnline")}</Link>;
  const list = (
      <ul className="card divide-y divide-line">
        {rows.map(({ t, live, start }) => {
          const games = [...new Set(t.events.map((e) => e.game))];
          return (
            <li key={t.slug}>
              <Link href={live && t.events.length ? bracketPath("startgg", (currentBracket(t) ?? [...t.events].sort((a, b) => (b.numEntrants ?? 0) - (a.numEntrants ?? 0))[0]).id) : `/events/${t.slug}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface">
                {/* A fixed-width column of centred game labels (round 831), so every name starts at the same place. */}
                <span className="flex w-[4.25rem] shrink-0 flex-col gap-1 [&>.badge]:justify-center">
                  {games.slice(0, 2).map((g) => <GameBadge key={g} game={g} />)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{t.name}</span>
                  <span className="block truncate text-meta text-muted">
                    {[live ? tr("browse.live") : formatEventTime(start, t.timezone), t.numAttendees ? tr("browse.players", { n: t.numAttendees }) : null].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="shrink-0 text-meta font-semibold text-brand">{live ? tr("browse.bracketArrow") : tr("browse.detailsArrow")}</span>
              </Link>
            </li>
          );
        })}
      </ul>
  );
  if (fold) return <section aria-labelledby="online-today"><Fold id="home-online-today" heading={heading} aside={allLink}>{list}</Fold></section>;
  return (
    <section className="flex flex-col gap-2" aria-labelledby="online-today">
      <div className="flex items-baseline justify-between">
        {heading}
        {allLink}
      </div>
      {list}
    </section>
  );
}
