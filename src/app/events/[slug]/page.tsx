import type { Metadata } from "next";
import { SeasonsCounting } from "@/components/seasons/SeasonParts";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import GameBadge from "@/components/GameBadge";
import EventRulesets from "@/components/scenes/EventRulesets";
import NearbyEvents from "@/components/events/NearbyEvents";
import LiveStream from "@/components/majors/LiveStream";
import { LiveDot } from "@/components/majors/MajorParts";
import { getMajor } from "@/lib/majors";
import { bracketPath } from "@/lib/brackets/types";
import { seriesIdFor, seriesNameFor } from "@/lib/weeklies";
import { currentBracket, formatEventDate, formatEventTime, isRunning, otherYear, unixNow } from "@/lib/format";
import { GAMES } from "@/lib/games";
import { getTournament, getTournamentResults, getTournamentWinners, type EventWinners } from "@/lib/startgg";
import { PageSkeleton } from "@/components/ui/Skeleton";
import GoingButton from "@/components/events/GoingButton";
import ShareButton from "@/components/ui/ShareButton";
import { bracketName, byStart, zoneLabel } from "@/components/events/EventTimes";
import { getGoing } from "@/lib/rsvps";
import { getAttachedRulesets } from "@/lib/scenes";
import { getUserId } from "@/lib/supabase/server";
import { eventJsonLd } from "@/lib/eventSchema";
import { siteUrl, resultsTitle } from "@/lib/siteMeta";
import Icon from "@/components/ui/Icon";
import { LangProvider, T } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";
import type { MessageKey, Values } from "@/lib/i18n/core";
import NewTab from "@/components/ui/NewTab";
import { liquipediaSearch } from "@/lib/liquipedia";
import FullStandings, { visibleStandings } from "@/components/history/FullStandings";
import { getMajorStandings, type StandingRow } from "@/lib/majorStandings";

type Tr = (key: MessageKey, values?: Values) => string;

// Link previews (Discord, X, iMessage) use this title and description.
export async function generateMetadata({ params }: PageProps<"/events/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTournament(slug).catch(() => null);
  if (!t) return { title: "Event not found" };

  const games = [...new Set(t.events.map((e) => GAMES[e.game].short))].join(", "); // each game once (a major has many brackets per game)
  // Finished: say who won the biggest event instead ("🏆 Cody Schwab won Melee Singles · 2nd aMSa").
  await connection(); // "finished" depends on the current time
  // A tournament from another year says which year (old majors open from Smash history).
  const date = formatEventDate(t.startAt, t.timezone, undefined, { year: otherYear(t.startAt) });
  let description = `${date} · ${t.city ?? "Location TBA"} · ${games}`;
  // A finished tournament's title says what the page has (round 802): people search "<name> results"
  // and "<name> top 8", and the name alone was the whole title. The link preview keeps the plain name.
  let title = t.name;
  if (isOver(t.startAt, t.endAt)) {
    title = resultsTitle(t.name, new Date(t.startAt * 1000).getUTCFullYear());
    const winners = await getTournamentWinners(t.slug).catch(() => ({}) as Record<string, EventWinners>);
    const top = [...t.events].sort((a, b) => (b.numEntrants ?? 0) - (a.numEntrants ?? 0)).find((e) => winners[e.id]);
    if (top) {
      const w = winners[top.id];
      description = `🏆 ${w.first} won ${bracketName(top.name, top.game)}${w.second ? ` · 2nd ${w.second}` : ""} · ${date}`;
    }
  }
  return {
    title,
    description,
    openGraph: { title: t.name, description, images: t.bannerUrl ?? t.imageUrl ?? undefined },
  };
}

/** True once the tournament has finished. */
function isOver(startAt: number, endAt: number | null) {
  return (endAt ?? startAt + 86400) < Date.now() / 1000;
}

/** "🏆 Fred won · 2nd Leo" under a finished event (start.gg's final standings), with its Top 8 picture to post. */
function EventWinner({ winners, t, picture }: { winners: EventWinners; t: Tr; picture: string }) {
  return (
    <p className="pl-[4.5rem] text-sm text-muted">
      <Icon name="trophy" /> <span className="font-semibold text-foreground">{winners.first}</span> {t("browse.winner.won")}{winners.second && ` · ${t("browse.winner.second", { name: winners.second })}`}
      {" · "}
      <a href={picture} target="_blank" rel="noopener" className="link whitespace-nowrap"><Icon name="image" /> {t("event.graphic.link")}<NewTab /></a>
    </p>
  );
}

async function TournamentDetails({ params }: Pick<PageProps<"/events/[slug]">, "params">) {
  const { slug } = await params;
  // undefined = start.gg couldn't be reached (null = no such event).
  const [t, major, tr, lang] = await Promise.all([getTournament(slug).catch(() => undefined), getMajor(slug).catch(() => null), getT(), getLang()]);
  if (t === undefined) {
    return (
      <div className="m-4 card p-5">
        <p className="font-semibold">{tr("browse.event.couldntReach")}</p>
        <p className="mt-1 text-sm text-muted">{tr("browse.event.detailsFrom")}</p>
        <Link href={`/events/${encodeURIComponent(slug)}`} className="mt-3 inline-block btn btn-sm btn-outline">{tr("browse.tryAgain")}</Link>
      </div>
    );
  }
  if (!t) notFound();
  await connection(); // "live now" depends on the current time, so render per visit
  const live = isRunning(t); // from the first bracket's start, not start.gg's tournament start
  // The attached rulesets load from here, alongside who's going (round 708): the section used to start its
  // own lookup only once the page above it was ready, a third database wait in a row.
  const seriesId = seriesIdFor(t.name, t.city);
  const rulesets = getAttachedRulesets({ tournamentSlug: t.slug, seriesId: seriesId ?? undefined });
  rulesets.catch(() => {}); // EventRulesets reports a failure; this only stops an unhandled rejection
  const userId = await getUserId();
  const over = isOver(t.startAt, t.endAt);
  // Once it has started, the main thing to do is follow the bracket: the
  // biggest event's bracket on Smashy becomes the main button, and start.gg the secondary one.
  // Live: the bracket running now (this week's, for a season series); over: the biggest one's results.
  const bySize = [...t.events].sort((a, b) => (b.numEntrants ?? 0) - (a.numEntrants ?? 0));
  const biggest = bySize[0] ?? null;
  // start.gg says which events are being played right now (round 453): a weekend major's Singles is
  // still on Sunday though it started Saturday, so it wins over a smaller event that started today.
  const biggestActive = bySize.find((e) => e.state === "ACTIVE") ?? null;
  const followEvent = live ? (biggestActive ?? currentBracket(t) ?? biggest) : over ? biggest : null;
  // Finished tournaments name each event's winner (one start.gg request for all events; none if it fails).
  // Majors in Smash history also get each bracket's saved standings (top 64, step H3), folded under its winner.
  // Who's going loads alongside the results (round 669; it used to finish first), and only before the
  // event is over: the "Going" button isn't shown after that (round 670).
  const [going, results, standings] = await Promise.all([
    over ? null : getGoing("tournament", t.slug, userId),
    over ? getTournamentResults(t.slug).catch(() => null) : null,
    major && over ? getMajorStandings(t.slug).then(visibleStandings).catch(() => new Map<string, StandingRow[]>()) : new Map<string, StandingRow[]>(),
  ]);
  const winners: Record<string, EventWinners> = results?.winners ?? {};
  // Over, but start.gg hasn't marked it finished: scores not reported yet (some organizers enter them later).
  const pending = new Set(results?.pending ?? []);
  const resultsPending = over && !!followEvent && pending.has(followEvent.id);
  // Season series hold a bracket every week (some list 70+): show what's on and coming up, and fold
  // the finished weeks away. A bracket counts as done 12 hours after it starts (start.gg has no end time per bracket).
  const nowSec = unixNow();
  // start.gg's own state when it gives one (COMPLETED = done, ACTIVE = still on); otherwise the guess.
  const done = (e: { startAt: number | null; state?: string | null }) =>
    !over && (e.state === "COMPLETED" || (e.state !== "ACTIVE" && e.state !== "CREATED" && e.startAt !== null && e.startAt + 12 * 3600 <= nowSec));
  const ordered = byStart(t.events);
  const foldPast = !over && ordered.length > 8 && ordered.some((e) => !done(e));
  const shownEvents = foldPast ? ordered.filter((e) => !done(e)) : ordered;
  const earlierEvents = foldPast ? ordered.filter(done).reverse() : [];
  const multiDay = new Set(t.events.filter((e) => e.startAt).map((e) => formatEventDate(e.startAt!, t.timezone, lang))).size > 1;

  const mapsUrl = t.venueAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.venueAddress)}`
    : null;

  return (
    <LangProvider lang={lang}>
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: eventJsonLd({
            name: t.name,
            url: new URL(`/events/${t.slug}`, siteUrl()).toString(),
            startIso: new Date(t.startAt * 1000).toISOString(),
            endIso: t.endAt ? new Date(t.endAt * 1000).toISOString() : null,
            online: !t.venueAddress && !t.city,
            venueName: t.venueName,
            address: t.venueAddress ?? t.city,
            image: t.bannerUrl ?? t.imageUrl,
          }),
        }}
      />
      {t.bannerUrl && (
        <div className="relative aspect-[3/1] w-full bg-surface">
          <Image src={t.bannerUrl} alt="" fill loading="eager" className="object-cover" sizes="(min-width: 768px) 672px, 100vw" />
        </div>
      )}

      <div className="flex flex-col gap-5 p-4">
        <div className="flex items-start gap-3">
          {t.imageUrl && (
            <span className="glass-frame shrink-0">
              <Image src={t.imageUrl} alt="" width={56} height={56} loading="eager" className="rounded-xl" />
            </span>
          )}
          <div className="min-w-0">
            {(major || live) && (
              <div className="mb-1 flex items-center gap-1.5">
                {live && <LiveDot />}
                {major && <span className="badge bg-brand/10 text-brand">{tr("browse.event.major")}</span>}
              </div>
            )}
            <h1 className="text-2xl font-bold leading-tight">{t.name}</h1>
            <p className="text-muted">
              {formatEventDate(t.startAt, t.timezone, lang, { year: otherYear(t.startAt, nowSec) })} · {formatEventTime(t.startAt, t.timezone, lang)}
            </p>
          </div>
        </div>

        {t.streams.length > 0 && (
          <div id="watch" className="scroll-mt-4">
            <LiveStream streams={t.streams} live={live} over={over} eventName={t.name} eventPath={`/events/${t.slug}`} />
          </div>
        )}

        {followEvent && (
          <Link href={bracketPath("startgg", followEvent.id)} className="btn btn-lg btn-primary btn-hero h-auto min-h-12 flex-col gap-0 whitespace-normal py-2 text-center leading-tight">
            {live ? tr("browse.event.followLive") : resultsPending ? tr("event.seeBracket") : tr("browse.event.seeResults")}
            {t.events.length > 1 && <span className="text-sm font-normal opacity-80">{bracketName(followEvent.name, followEvent.game)}</span>}
          </Link>
        )}
        <a
          href={t.registerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`btn ${followEvent ? "btn-md btn-outline" : "btn-lg btn-primary btn-hero"}`}
        >
          {t.isRegistrationOpen ? tr("browse.event.signUpStartgg") : tr("browse.event.viewStartgg")}
        <NewTab /></a>

        <ShareButton path={`/events/${t.slug}`} title={t.name} label={tr("browse.event.share")} className="btn btn-sm btn-ghost -mt-2 self-center" />
        {/* Majors that are over: their Liquipedia page (Smash history; links only). */}
        {major && over && (
          <a href={liquipediaSearch(t.name)} target="_blank" rel="noopener noreferrer" className="-mt-2 self-center text-sm text-muted underline">
            {tr("history.liquipedia")} ↗︎<NewTab />
          </a>
        )}
        {going && (
          <GoingButton kind="tournament" eventRef={t.slug} {...going} signedIn={!!userId} calendarHref={`/events/${t.slug}/calendar.ics`} />
        )}

        <Suspense fallback={null}>
          <SeasonsCounting source="startgg" refs={t.events.map((e) => String(e.id))} />
        </Suspense>

        <section className="card p-4">
          <h2 className="mb-1 font-bold">{tr("browse.event.where")}</h2>
          <p>{t.venueName ?? t.city ?? (t.events.every((e) => e.online) ? tr("event.online") : tr("browse.locationTba"))}</p>
          {t.venueAddress && <p className="text-sm text-muted">{t.venueAddress}</p>}
          {mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-brand">
              {tr("browse.openMaps")}
            <NewTab /></a>
          )}
        </section>

        <section className="card p-4">
          <h2 className="font-bold">{tr("nav.events")}</h2>
          <p className="mb-2 text-meta text-muted">{tr("browse.event.timesLocal", { zone: zoneLabel(t.startAt, t.timezone) })}</p>
          <ul className="flex flex-col gap-2">
            {/* The game label sits under the name with the sign-ups (round 839): beside the name it squeezed names
                into a narrow column ("Ultimate" over "Singles") on phones. */}
            {shownEvents.map((e) => (
              <li key={e.id} className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="w-[4.5rem] shrink-0 text-sm font-bold tabular-nums">
                    {e.startAt ? formatEventTime(e.startAt, t.timezone, lang).replace(/\s(GMT[+-][\d:]+|[A-Z]{2,5})$/, "") : tr("browse.tba")}
                    {e.startAt && multiDay && <span className="block text-meta font-normal text-muted">{formatEventDate(e.startAt, t.timezone, lang).split(",")[0]}</span>}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="line-clamp-2 leading-tight">{bracketName(e.name, e.game)}</span>
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-meta text-muted">
                      <GameBadge game={e.game} />
                      {e.online ? `${tr("event.online")} · ` : ""}{e.numEntrants ? (over || done(e) || e.state === "ACTIVE" ? tr("browse.entrants", { n: e.numEntrants }) : tr("browse.event.signedUp", { n: e.numEntrants })) : tr("browse.event.noSignups")}
                    </span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <Link href={bracketPath("startgg", e.id)} className="btn btn-sm btn-outline">{(over || done(e)) && !pending.has(e.id) ? tr("browse.results") : tr("browse.bracket")}</Link>
                </span>
                </div>
                {winners[e.id] && <EventWinner winners={winners[e.id]} t={tr} picture={`/brackets/startgg/${encodeURIComponent(e.id)}/top8.png${lang === "en" ? "" : `?lang=${lang}`}`} />}
                {over && pending.has(e.id) && <p className="text-meta text-muted">{tr("browse.event.pending")}</p>}
                <FullStandings rows={standings.get(String(e.id))} entrants={e.numEntrants ?? null} t={tr} className="pl-[4.5rem]" />
              </li>
            ))}
          </ul>
          {earlierEvents.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-semibold text-brand">{tr("browse.event.earlier", { n: earlierEvents.length })}</summary>
              <ul className="mt-2 flex flex-col gap-2">
                {earlierEvents.map((e) => (
                  <li key={e.id} className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="w-[4.5rem] shrink-0 text-sm font-bold tabular-nums">
                        {e.startAt ? formatEventTime(e.startAt, t.timezone, lang).replace(/\s(GMT[+-][\d:]+|[A-Z]{2,5})$/, "") : tr("browse.tba")}
                        {e.startAt && multiDay && <span className="block text-meta font-normal text-muted">{formatEventDate(e.startAt, t.timezone, lang).split(",")[0]}</span>}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="line-clamp-2 leading-tight">{bracketName(e.name, e.game)}</span>
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-meta text-muted">
                          <GameBadge game={e.game} />
                          {e.online ? `${tr("event.online")} · ` : ""}{e.numEntrants ? (over || done(e) || e.state === "ACTIVE" ? tr("browse.entrants", { n: e.numEntrants }) : tr("browse.event.signedUp", { n: e.numEntrants })) : tr("browse.event.noSignups")}
                        </span>
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <Link href={bracketPath("startgg", e.id)} className="btn btn-sm btn-outline">{(over || done(e)) && !pending.has(e.id) ? tr("browse.results") : tr("browse.bracket")}</Link>
                    </span>
                    </div>
                    {winners[e.id] && <EventWinner winners={winners[e.id]} t={tr} picture={`/brackets/startgg/${encodeURIComponent(e.id)}/top8.png${lang === "en" ? "" : `?lang=${lang}`}`} />}
                {over && pending.has(e.id) && <p className="text-meta text-muted">{tr("browse.event.pending")}</p>}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        <EventRulesets
          games={[...new Set(t.events.map((e) => e.game))]}
          tournamentSlug={t.slug}
          seriesId={seriesId}
          seriesName={seriesNameFor(t.name)}
          attached={rulesets}
          finished={over}
        />

        {t.region && (
          <Suspense fallback={null}>
            <NearbyEvents region={t.region} slug={t.slug} signedIn={!!userId} lang={lang} t={tr} />
          </Suspense>
        )}
      </div>
    </article>
    </LangProvider>
  );
}

export default function TournamentPage(props: PageProps<"/events/[slug]">) {
  return (
    <div>
      <Link href="/events" className="block px-4 pt-4 text-sm text-muted hover:text-foreground">
        <T k="browse.allEvents" />
      </Link>
      <Suspense fallback={<div className="p-4"><PageSkeleton label="Loading event…" /></div>}>
        <TournamentDetails params={props.params} />
      </Suspense>
    </div>
  );
}
