import type { Metadata } from "next";
import { RegionSeasons } from "@/components/seasons/SeasonParts";
import OverflowRow from "@/components/ui/OverflowRow";
import Link from "next/link";
import { after, connection } from "next/server";
import { Suspense } from "react";
import { MajorsRow } from "@/components/majors/MajorParts";
import { getMajors, majorsFor, refreshMajorsIfStale } from "@/lib/majors";
import { getUserId } from "@/lib/supabase/server";
import { getMyGames } from "@/lib/viewer";
import EventsBrowser from "@/components/EventsBrowser";
import { eventRows } from "@/lib/eventRows";
import { dropFinished, getRegionEvents, refreshEventsIfStale, refreshRegionIfStale } from "@/lib/events";
import { getOnlineTournaments, type SmashyTournament } from "@/lib/startgg";
import RecentWinners from "@/components/events/RecentWinners";
import FollowedPlayers from "@/components/events/FollowedPlayers";
import { bracketPath } from "@/lib/brackets/types";
import { upcomingRecurring } from "@/lib/recurringOnline";
import OnlineEventsList, { type OnlineRow } from "@/components/events/OnlineEventsList";
import GameBadge from "@/components/GameBadge";
import LocalTime from "@/components/ui/LocalTime";
import { bigOnline } from "@/lib/bigOnline";
import TabBar from "@/components/ui/TabBar";
import { bracketStart, currentBracket, formatEventDate, isRunning, unixNow } from "@/lib/format";
import { regionName } from "@/lib/regions";
import { getViewerRegion } from "@/lib/viewerRegion";
import RegionPicker from "@/components/RegionPicker";
import CalendarSubscribe from "@/components/events/CalendarSubscribe";
import HostedEventsRow from "@/components/host/HostedEventsRow";
import MyEventsRow from "@/components/host/MyEventsRow";
import { getMyStartggEvents } from "@/lib/myStartgg";
import { followedLabel, getFollowedEntrants, getMyHostedEvents, getUpcomingHostedEvents } from "@/lib/hostedEvents";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { LangProvider, T } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Smash tournaments near you and majors worldwide",
  description: "Find Super Smash Bros. tournaments and weeklies near you, majors worldwide and online brackets, with live results for Melee, Ultimate and more.",
};

/** Tournaments in the viewer's region (their profile setting, their rough location, or a region they picked). */
async function RegionEvents({ searchParams }: { searchParams: PageProps<"/events">["searchParams"] }) {
  const { region: picked } = await searchParams;
  const region = await getViewerRegion(await getUserId(), typeof picked === "string" ? picked : null);
  const t = await getT();
  const events = await getRegionEvents(region).catch((error) => {
    console.error(error);
    return null;
  });
  after(() => refreshRegionIfStale(region)); // keep this region's saved list fresh (at most every 3 hours)
  const heading = (
    <div className="flex flex-wrap items-center gap-2 px-4 pt-4">
      {/* The picker shows the region already; a heading beside it said it twice (round 867). */}
      <h2 className="sr-only">{regionName(region)}</h2>
      <RegionPicker current={region} path="/events" label={t("browse.events.showIn")} />
      <Suspense fallback={null}>
        <RegionSeasons region={region} label={regionName(region)} className="w-full" />
      </Suspense>
    </div>
  );

  if (!events) {
    return (
      <>
        {heading}
        <p className="p-6 text-muted">{t("browse.events.loadFailed")}</p>
      </>
    );
  }
  return (
    <>
      {heading}
      <EventsBrowser key={region} rows={eventRows(events.tournaments, events.expected, unixNow())} region={region} regionLabel={regionName(region)} />
      {/* A one-time setup, so it sits under the list rather than above it (round 867). */}
      <CalendarSubscribe region={region} regionLabel={regionName(region)} />
      {events.recent.length > 0 && <RecentResults tournaments={events.recent.slice(0, 10)} />}
    </>
  );
}

/** The region's tournaments that finished this week: each opens its page (winners, results graphic). */
async function RecentResults({ tournaments }: { tournaments: SmashyTournament[] }) {
  const [t, lang] = await Promise.all([getT(), getLang()]);
  return (
    <section aria-labelledby="recent-results" className="px-4 pb-4">
      <h2 id="recent-results" className="text-lg font-bold">{t("browse.recent.title")}</h2>
      <p className="mb-2 text-meta text-muted">{t("browse.recent.hint")}</p>
      <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
        {tournaments.map((x) => (
          <li key={x.id}>
            <Link href={`/events/${x.slug}`} className="flex items-baseline gap-3 px-3 py-2 hover:bg-surface">
              <span className="w-20 shrink-0 text-meta text-muted">{formatEventDate(x.startAt, x.timezone, lang)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{x.name}</span>
                <Suspense fallback={null}>
                  <RecentWinners slug={x.slug} />
                </Suspense>
              </span>
              <span className="shrink-0 text-meta text-muted">{[x.city, x.numAttendees ? t("browse.recent.players", { n: x.numAttendees }) : null].filter(Boolean).join(" · ")}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Events hosted on Smashy itself (any game the viewer plays, online or in person), around `children`
 * (the region's list). With none to show, the "Run your local on Smashy" card goes after the region's
 * tournaments instead of before them (round 839): it pushed the real list half a screen down.
 */
async function Hosted({ children }: { children: React.ReactNode }) {
  const userId = await getUserId();
  const [events, myGames] = await Promise.all([getUpcomingHostedEvents({ limit: 30, viewerId: userId }).catch(() => []), getMyGames(userId)]);
  const games = new Set<string>(myGames.length ? myGames : ["melee", "ultimate", "pplus"]);
  // Online events from Smashy hosts are on the Online tab; this row is for in-person ones.
  const shown = events.filter((e) => games.has(e.game) && !e.online);
  const friendsIn = await getFollowedEntrants(userId, shown.map((e) => e.id)).catch(() => ({} as Record<string, string[]>));
  const row = <HostedEventsRow events={shown} friends={Object.fromEntries(shown.map((e) => [e.id, followedLabel(friendsIn[e.id])]))} />;
  return shown.length ? <>{row}{children}</> : <>{children}{row}</>;
}

/** Past its end time (the Online tab keeps finished brackets a couple of hours, for results). */
function ended(t: SmashyTournament, nowSec: number) {
  return (t.endAt ?? t.startAt + 12 * 3600) <= nowSec;
}

/** The event most people follow: the one with the most entrants. */
function biggestEvent(t: SmashyTournament) {
  return [...t.events].sort((a, b) => (b.numEntrants ?? 0) - (a.numEntrants ?? 0))[0];
}

/**
 * The Online tab: online brackets anyone can enter, from start.gg (anywhere) and hosted on Smashy,
 * soonest first. Hard to find unless you already know about them, so they get their own tab.
 */
async function OnlineEvents() {
  await connection(); // per visit: finished brackets drop off by the current time
  const nowSec = unixNow();
  const [userId, t] = await Promise.all([getUserId(), getT()]);
  const [startgg, hosted] = await Promise.all([
    getOnlineTournaments().catch((e) => (console.error("Online tournaments failed", e), null)),
    getUpcomingHostedEvents({ limit: 60, viewerId: userId }).catch(() => []),
  ]);
  const friendsIn = await getFollowedEntrants(userId, hosted.filter((e) => e.online).map((e) => e.id)).catch(() => ({} as Record<string, string[]>));
  const rows: OnlineRow[] = [
    ...hosted
      .filter((e) => e.online && (e.status === "open" || e.status === "closed" || e.status === "in_progress"))
      .map((e) => ({
        key: `smashy-${e.id}`,
        href: `/host/${e.id}`,
        name: e.name,
        startAt: Math.floor(Date.parse(e.startsAt) / 1000),
        games: [{ game: e.game, entrants: e.entrantCount || null }],
        signupsOpen: e.status === "open" && Date.parse(e.startsAt) / 1000 > nowSec,
        onSmashy: true,
        live: e.status === "in_progress",
        friends: followedLabel(friendsIn[e.id]),
        brackets: [],
      })),
    ...dropFinished(startgg ?? [], nowSec).map((t) => ({
      key: `startgg-${t.id}`,
      // Started: straight to the biggest event's bracket on Smashy; otherwise the tournament page.
      // Started (or just finished: these stay listed a couple of hours): straight to the bracket.
      href: (isRunning(t, nowSec) || ended(t, nowSec)) && t.events.length ? bracketPath("startgg", (isRunning(t, nowSec) ? currentBracket(t, nowSec) : undefined)?.id ?? biggestEvent(t).id) : `/events/${t.slug}`,
      live: isRunning(t, nowSec),
      finished: ended(t, nowSec),
      name: t.name,
      startAt: bracketStart(t, nowSec), // when brackets start (start.gg's tournament start can be days earlier)
      games: [...new Set(t.events.map((e) => e.game))].map((game) => ({
        game,
        entrants: Math.max(0, ...t.events.filter((e) => e.game === game).map((e) => e.numEntrants ?? 0)) || null,
      })),
      signupsOpen: t.isRegistrationOpen && bracketStart(t, nowSec) > nowSec,
      onSmashy: false,
      brackets: t.events.map((e) => ({ name: e.name, startAt: e.startAt })),
    })),
    // Series on their own sites, listed by hand (round 772): the fixed weekly times, linking out.
    ...upcomingRecurring(nowSec).map(({ series, startAt }) => ({
      key: `${series.id}-${startAt}`,
      href: series.href,
      name: series.name,
      startAt,
      games: [{ game: series.game, entrants: null }],
      signupsOpen: false, // not known: the site says
      onSmashy: false,
      elsewhere: series.site,
      brackets: [],
    })),
  ].sort((a, b) => a.startAt - b.startAt);
  return (
    <>
      {/* For everyone: /host/new sends signed-out visitors to sign in and back. */}
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3 text-sm">
        <span className="text-muted">{t("browse.events.runningOnline")}</span>
        <Link href="/host/new" className="btn btn-sm btn-outline">{t("browse.events.hostIt")}</Link>
      </div>
      {startgg === null && (
        <p role="status" className="border-b border-line bg-surface px-4 py-3 text-sm">
          {t("browse.events.startggDown")}
        </p>
      )}
      {/* The biggest online brackets this week, above the full list (round 844). */}
      <BigOnline rows={bigOnline(rows, nowSec)} t={t} />
      <OnlineEventsList rows={rows} />
    </>
  );
}

/** "Big online brackets" (round 844): 100+ players, this week, biggest first, as a sideways row of cards above the list. */
function BigOnline({ rows, t }: { rows: OnlineRow[]; t: Awaited<ReturnType<typeof getT>> }) {
  if (!rows.length) return null;
  return (
    <section aria-labelledby="big-online" className="border-b border-line py-3">
      <h2 id="big-online" className="px-4 text-title font-bold">{t("browse.online.big")}</h2>
      <ul className="scroll-fade flex gap-3 overflow-x-auto px-4 pt-2 pb-1">
        {rows.map((r) => (
          <li key={r.key} className="w-60 shrink-0">
            <Link href={r.href} className="card flex h-full flex-col gap-1.5 p-3 hover:bg-surface">
              <span className="text-meta font-semibold text-brand">
                {r.live ? t("browse.live") : <LocalTime iso={new Date(r.startAt * 1000).toISOString()} style="dayDateTime" />}
              </span>
              <span className="line-clamp-2 font-bold">{r.name}</span>
              <span className="mt-auto flex flex-wrap items-center gap-1.5">
                {r.games.map((g) => <GameBadge key={g.game} game={g.game} entrants={g.entrants} />)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The events you host or signed up for, above both tabs (signed in only; nothing when there are none). */
async function MyEvents() {
  const userId = await getUserId();
  const [events, startgg] = await Promise.all([getMyHostedEvents(userId).catch(() => []), getMyStartggEvents(userId)]);
  // start.gg sign-ups too (linked accounts): upcoming and live, and ones that finished in the last 12 hours.
  const nowSec = unixNow();
  const mine = startgg.filter((e) => e.state !== "done" || nowSec - e.startAt < 36 * 3600).filter((e) => e.state !== "done" || e.placement !== null);
  return <MyEventsRow events={events} startgg={mine} now={nowSec} />;
}

/** "Near you" (majors, local events, weeklies) or "Online". */
async function EventsTabs({ searchParams }: { searchParams: PageProps<"/events">["searchParams"] }) {
  const sp = await searchParams;
  const online = sp.view === "online";
  const region = typeof sp.region === "string" ? sp.region : null;
  const [t, lang] = await Promise.all([getT(), getLang()]);
  return (
    <LangProvider lang={lang}>
      <TabBar
        label={t("browse.events.viewLabel")}
        active={online ? "online" : "near"}
        tabs={[
          { key: "near", label: t("browse.events.nearYou"), href: region ? `/events?region=${encodeURIComponent(region)}` : "/events" },
          { key: "online", label: t("event.online"), href: "/events?view=online" },
        ]}
      />
      <Suspense fallback={null}>
        <MyEvents />
      </Suspense>
      {/* Players the member follows and where they compete next (round 797). */}
      <Suspense fallback={null}>
        <FollowedPlayers />
      </Suspense>
      {online ? (
        <Suspense fallback={<CardListSkeleton count={5} label={t("browse.events.loadingOnline")} className="p-4" />}>
          <OnlineEvents />
        </Suspense>
      ) : (
        // One placeholder for all three, revealed together (round 584): Majors and Hosted used to pop in
        // on their own above the region's list, pushing it down as each arrived. All three read kept,
        // shared lists now (rounds 563-564), so waiting for the slowest costs little.
        <Suspense fallback={<CardListSkeleton count={5} label={t("browse.events.loading")} className="p-4" />}>
          <Majors />
          <Hosted>
            <RegionEvents searchParams={searchParams} />
          </Hosted>
        </Suspense>
      )}
    </LangProvider>
  );
}

async function Majors() {
  const [majors, myGames] = await Promise.all([getMajors().catch(() => null), getUserId().then(getMyGames)]);
  after(refreshMajorsIfStale);
  // Also keeps the saved Texas events copy fresh (at most every 3 hours). Called here because this part
  // is already per-visit; in the Texas list it would stop that list from being pre-built.
  after(refreshEventsIfStale);
  if (!majors) return null;
  return <MajorsRow majors={majorsFor([...majors.live, ...majors.upcoming], myGames)} />;
}

export default function EventsPage(props: PageProps<"/events">) {
  return (
    <section>
      <header className="px-4 pt-6 pb-3">
        <h1 className="text-2xl font-bold"><T k="nav.events" /></h1>
        {/* For someone who has never entered one (the menu skin, round 910). */}
        <Link href="/new#first-local" className="skin-new link mt-1 block w-fit text-sm font-semibold"><T k="browse.events.firstTime" /></Link>
        {/* Side doors, kept quiet: the page's red is for events that are live and for actions. */}
        <span id="events-more" className="sr-only"><T k="browse.events.moreNav" /></span>
        <OverflowRow labelledBy="events-more" className="mt-2 text-meta">
          <Link href="/brackets" className="chip py-1"><T k="browse.events.openAnyBracket" /></Link>
          <Link href="/my-sets" className="chip py-1"><T k="browse.events.mySets" /></Link>
          {/* Leagues, Seasons and Smash history up front (Matthew, round 536): the Feed's More menu no longer lists them. */}
          <Link href="/leagues" className="chip py-1"><T k="league.title" /></Link>
          <Link href="/seasons" className="chip py-1"><T k="season.navLink" /></Link>
          <Link href="/history" className="chip py-1"><T k="history.navLink" /></Link>
          <Link href="/scenes" className="chip py-1"><T k="browse.events.scenesRulesets" /></Link>
          <Link href="/strike" className="chip py-1"><T k="browse.events.strikeStages" /></Link>
        </OverflowRow>
      </header>
      <Suspense fallback={<CardListSkeleton count={5} label="Loading events…" className="p-4" />}>
        <EventsTabs searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
