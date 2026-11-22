import type { Metadata } from "next";
import { localeFor } from "@/lib/i18n/core";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import GameBadge from "@/components/GameBadge";
import EventRulesets from "@/components/scenes/EventRulesets";
import { getExpectedWeekly } from "@/lib/events";
import { formatEventDate, formatEventTime } from "@/lib/format";
import { GAMES } from "@/lib/games";
import { getTournamentWinners, type EventWinners } from "@/lib/startgg";
import { PageSkeleton } from "@/components/ui/Skeleton";
import GoingButton from "@/components/events/GoingButton";
import EventTimes, { zoneLabel } from "@/components/events/EventTimes";
import { getGoing, weeklyRef } from "@/lib/rsvps";
import { getUserId } from "@/lib/supabase/server";
import Icon from "@/components/ui/Icon";
import { LangProvider, T } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";
import type { Lang, MessageKey, Values } from "@/lib/i18n/core";
import { SITE_IMAGE } from "@/lib/siteMeta";
import NewTab from "@/components/ui/NewTab";

type Tr = (key: MessageKey, values?: Values) => string;

/** "every Monday at 7:00 PM CST" or "every other Thursday at 6:30 PM CST" (in the visitor's language). */
function scheduleText(unix: number, tz: string, intervalDays: 7 | 14, t: Tr, lang: Lang) {
  const day = new Intl.DateTimeFormat(localeFor(lang), { weekday: "long", timeZone: tz }).format(new Date(unix * 1000));
  return t(intervalDays === 14 ? "browse.weekly.everyOther" : "browse.weekly.every", { day, time: formatEventTime(unix, tz) });
}

export async function generateMetadata({ params }: PageProps<"/events/weekly/[id]">): Promise<Metadata> {
  const { id } = await params;
  const w = await getExpectedWeekly(id).catch(() => null);
  if (!w) return { title: "Weekly not found" };

  const games = w.games.map((g) => GAMES[g.game].short).join(", ");
  const description = `Expected ${formatEventDate(w.startAt, w.timezone)} · ${w.city} · ${games}`;
  return { title: w.name, description, openGraph: { title: w.name, description, images: [SITE_IMAGE] } };
}

/** Who won each event last time ("🏆 Melee Singles: Fox · 2nd Marth"), from start.gg's final standings. */
async function LastWinners({ slug, t }: { slug: string; t: Tr }) {
  const winners = Object.values(await getTournamentWinners(slug).catch(() => ({}) as Record<string, EventWinners>));
  if (!winners.length) return null;
  return (
    <ul className="mt-2 flex flex-col gap-1 text-sm">
      {winners.slice(0, 6).map((w, i) => (
        <li key={`${i}-${w.eventName}`}>
          <Icon name="trophy" /> <span className="text-muted">{w.eventName}:</span> <span className="font-semibold">{w.first}</span>
          {w.second && <span className="text-muted"> · {t("browse.winner.second", { name: w.second })}</span>}
        </li>
      ))}
    </ul>
  );
}

async function WeeklyDetails({ params }: Pick<PageProps<"/events/weekly/[id]">, "params">) {
  const { id } = await params;
  const w = await getExpectedWeekly(id);
  if (!w) notFound();
  const [userId, t, lang] = await Promise.all([getUserId(), getT(), getLang()]);
  const ref = weeklyRef(w.id, w.startAt);
  const going = await getGoing("weekly", ref, userId);

  const mapsUrl = w.venueAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(w.venueAddress)}`
    : null;

  return (
    <LangProvider lang={lang}>
    <article className="flex flex-col gap-5 p-4">
      <div className="flex items-start gap-3">
        {w.imageUrl && <Image src={w.imageUrl} alt="" width={56} height={56} className="rounded-xl border border-line" />}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold leading-tight">{w.name}</h1>
            <span className="rounded-full border border-dashed border-muted px-2 text-xs text-muted">{t("browse.expected")}</span>
          </div>
          <p className="text-muted">
            {formatEventDate(w.startAt, w.timezone, lang)} · {formatEventTime(w.startAt, w.timezone, lang)}
          </p>
        </div>
      </div>

      <section className="rounded-2xl bg-surface p-4 text-sm">
        <p className="font-semibold">{t("browse.weekly.notPosted")}</p>
        <p className="mt-1 text-muted">
          {t("browse.weekly.runs", { series: w.seriesName, schedule: scheduleText(w.startAt, w.timezone, w.intervalDays, t, lang), n: w.editionsSeen })}
        </p>
      </section>

      <GoingButton kind="weekly" eventRef={ref} {...going} signedIn={!!userId} calendarHref={`/events/weekly/${w.id}/calendar.ics`} />

      <section className="card p-4">
        <h2 className="mb-1 font-bold">{t("browse.event.where")}</h2>
        <p>{w.venueName ?? w.city}</p>
        {w.venueAddress && <p className="text-sm text-muted">{w.venueAddress}</p>}
        {mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-brand">
            {t("browse.openMaps")}
          <NewTab /></a>
        )}
        <p className="mt-2 text-xs text-muted">{t("browse.weekly.basedOnLast")}</p>
      </section>

      {w.events?.some((e) => e.startAt) && (
        <section className="card p-4">
          <h2 className="font-bold">{t("browse.weekly.usualTimes")}</h2>
          <p className="mb-2 text-meta text-muted">{t("browse.weekly.fromLast", { name: w.lastEdition.name, zone: zoneLabel(w.startAt, w.timezone) })}</p>
          <EventTimes events={w.events} timezone={w.timezone} max={8} t={t} lang={lang} />
        </section>
      )}

      <section className="card p-4">
        <h2 className="mb-2 font-bold">{t("browse.weekly.usually")}</h2>
        <ul className="flex flex-col gap-2">
          {w.games.map((g) => (
            <li key={g.game} className="flex items-center justify-between gap-3">
              <GameBadge game={g.game} />
              <span className="text-sm text-muted">
                {g.typicalEntrants ? t("browse.weekly.about", { n: g.typicalEntrants }) : t("browse.weekly.small")}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <EventRulesets games={w.games.map((g) => g.game)} seriesId={w.id} seriesName={w.seriesName} />

      <section className="card p-4">
        <h2 className="mb-1 font-bold">{t("browse.weekly.lastTime")}</h2>
        <Link href={`/events/${w.lastEdition.slug}`} className="text-brand">
          {w.lastEdition.name}
        </Link>
        <p className="text-sm text-muted">
          {formatEventDate(w.lastEdition.startAt, w.timezone, lang)}
          {w.lastEdition.entrants ? ` · ${t("browse.players", { n: w.lastEdition.entrants })}` : ""}
        </p>
        <Suspense fallback={null}>
          <LastWinners slug={w.lastEdition.slug} t={t} />
        </Suspense>
      </section>
    </article>
    </LangProvider>
  );
}

export default function ExpectedWeeklyPage(props: PageProps<"/events/weekly/[id]">) {
  return (
    <div>
      <Link href="/events" className="block px-4 pt-4 text-sm text-muted hover:text-foreground">
        <T k="browse.allEvents" />
      </Link>
      <Suspense fallback={<div className="p-4"><PageSkeleton label="Loading weekly…" /></div>}>
        <WeeklyDetails params={props.params} />
      </Suspense>
    </div>
  );
}
