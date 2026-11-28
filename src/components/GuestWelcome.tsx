import Link from "next/link";
import IntentLink from "@/components/ui/IntentLink";
import GetTheApp from "@/components/GetTheApp";
import { Suspense } from "react";
import OnlineToday from "@/app/brackets/OnlineToday";
import RecentWinners from "@/components/events/RecentWinners";
import TopClips from "@/components/feed/TopClips";
import GameBadge from "@/components/GameBadge";
import { MajorCard } from "@/components/majors/MajorParts";
import { STOCK_ICON_KEYS } from "@/lib/stockIconKeys";
import { getRegionEvents } from "@/lib/events";
import { dateBadgeParts, formatEventDate, isRunning, whenLabel } from "@/lib/format";
import type { MessageKey } from "@/lib/i18n/core";
import { getLang, getT } from "@/lib/i18n/server";
import { isInviteOnly } from "@/lib/invites";
import { majorsFor, type Major } from "@/lib/majors";
import { HOME_REGION, regionName } from "@/lib/regions";
import { detectedRegion } from "@/lib/viewerRegion";
import Fold from "@/components/ui/Fold";
import OverflowRow from "@/components/ui/OverflowRow";
import RotatingCharacterIcon from "@/components/RotatingCharacterIcon";
import LiveTicker, { tickerItems } from "@/components/LiveTicker";

// The "start here" links at the top (round 654, for visitors from the Reddit posts): Smashy's
// strongest parts, none of which need an account. A row of short links since round 845: as six cards
// with a sales line each, the first screen read like a generic landing page (Reddit: "looks vibe coded").
// No stock line icons on them or the headings below (round 848, Matthew: they give the site away as
// template-made). Round 890: Characters left this row; the header's Characters button (with its rotating stock
// icon and, since round 887, its word on phones) is the one way in, so it isn't said twice. Character pages come first (round 824, Matthew: more
// people will be interested in them than in Smash history, which swapped places with them).
const START: { title: MessageKey; href: string }[] = [
  { title: "ui.guest.t.events", href: "/events" },
  { title: "ui.guest.t.history", href: "/history" },
  { title: "ui.guest.t.newPlayers", href: "/new" },
  { title: "ui.guest.t.reels", href: "/reels" },
  { title: "ui.guest.t.players", href: "/search?tab=players" },
];

// The menu skin's first steps for someone new to Smash (round 908), in the order people take them.
const STEPS: { title: MessageKey; text: MessageKey; href: string }[] = [
  { title: "ui.guest.new.s.start", text: "ui.guest.new.s.startText", href: "/new" },
  { title: "ui.guest.new.s.character", text: "ui.guest.new.s.characterText", href: "/games" },
  { title: "ui.guest.new.s.local", text: "ui.guest.new.s.localText", href: "/events" },
  { title: "ui.guest.new.s.watch", text: "ui.guest.new.s.watchText", href: "/reels" },
  { title: "ui.guest.new.s.history", text: "ui.guest.new.s.historyText", href: "/history" },
];

// Further down: the parts that come alive with an account.
const ALSO: { title: MessageKey; text: MessageKey; href: string }[] = [
  // My sets first (round 914, Matthew: it will be used more).
  { title: "ui.guest.f.mySets", text: "ui.guest.f.mySetsText", href: "/my-sets" },
  { title: "ui.guest.f.host", text: "ui.guest.f.hostText", href: "/host/about" },
];


// The fighters on the "Pick a character" entry: four icons that each keep changing (round 914, Matthew:
// "it would be cool for them to rotate"). Every Melee and Ultimate stock icon, dealt into four piles so
// the same fighter is never shown twice at once.
const ALL_FIGHTERS = (["melee", "ultimate"] as const).flatMap((g) => [...(STOCK_ICON_KEYS[g] ?? [])].map((k) => `/stock/${g}/${k}.webp`));
const MENU_FIGHTERS = [0, 1, 2, 3].map((pile) => ALL_FIGHTERS.filter((_, i) => i % 4 === pile));

function notOver<T extends { startAt: number; endAt: number | null }>(list: T[]): T[] {
  const now = Date.now() / 1000;
  return list.filter((t) => (t.endAt ?? t.startAt + 86400) > now);
}


/**
 * What a visitor who isn't signed in sees first: what Smashy is and how to join, then what's
 * happening right now (majors, events near them, online brackets, clips), so the page shows a
 * living scene before it lists features. Everything here is read from data other pages already
 * keep: `majors` are the ones the feed loaded for its live banner.
 */
export default async function GuestWelcome({ majors = [] }: { majors?: Major[] }) {
  // Where the visitor is (roughly, from the request; nothing stored), else Texas, where Smashy started.
  const [detected, t, lang] = await Promise.all([detectedRegion(), getT(), getLang()]);
  const region = detected ?? HOME_REGION;
  // Whether new people need an invite follows the switch on Admin > Invites (if it can't be read, say
  // the careful thing).
  const [events, inviteOnly] = await Promise.all([getRegionEvents(region).catch(() => null), isInviteOnly().catch(() => true)]);
  const upcoming = notOver(events?.tournaments ?? []).slice(0, 4);
  // The first one running right now gets the big glossy card at the top (round 492); the rest are rows.
  // Only a sizable one (16+ players) gets it (round 881): a 3-player weekly as the biggest thing on the
  // page looked automatic rather than chosen. Smaller live ones are rows with the red date tile.
  const big = (ev: (typeof upcoming)[number]) => Math.max(ev.numAttendees ?? 0, ...ev.events.map((e) => e.numEntrants ?? 0)) >= 16;
  const live = upcoming.find((ev) => isRunning(ev) && big(ev));
  const rows = upcoming.filter((ev) => ev !== live);
  // The week's biggest finished tournaments (latest day first), with who won: real results from the scene, no account needed.
  const results = (events?.recent ?? []).slice(0, 3);
  const nextMajors = majorsFor(majors, []).slice(0, 6); // the main games' majors, soonest first
  // The menu skin (round 909): how many tournaments are coming up here, and the ticker's lines (what's on
  // near the visitor, then the majors, then the week's results).
  const comingUp = notOver(events?.tournaments ?? []).length;
  const ticker = tickerItems(events, majors, lang, t);

  return (
    <section aria-labelledby="guest-welcome" className="flex flex-col gap-6 border-b border-line px-4 py-6">
      {/* The menu skin's top part (round 908, a preview behind ?skin=melee): new players first. A numbered
          menu of first steps, each with one line saying what's behind it; the people who already compete
          get their links in a quiet row under it. */}
      <div className="skin-new flex flex-col gap-4">
        {/* What's on, running across the top (round 909; its own component since round 915). */}
        <LiveTicker items={ticker} className="-mx-4 -mt-2" />
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl leading-none">{t("ui.guest.new.headline")}</h2>
          <p className="text-muted">{t("ui.guest.new.pitch")}</p>
        </div>
        <ol className="menu-list flex flex-col gap-2">
          {STEPS.map((s, i) => (
            <li key={s.href}>
              <Link href={s.href} className="menu-bar">
                <span className="menu-bar-num" aria-hidden="true">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg leading-tight font-black tracking-wide uppercase italic">{t(s.title)}</span>
                  <span className="menu-bar-sub">{t(s.text)}</span>
                </span>
                {/* Something real on the entry: fighters to pick from, how many tournaments are coming up. */}
                {s.href === "/games" && (
                  <span aria-hidden="true" className="menu-icons mr-3 flex shrink-0 gap-1">
                    {MENU_FIGHTERS.map((icons, pile) => <RotatingCharacterIcon key={pile} icons={icons} size={24} />)}
                  </span>
                )}
                {s.href === "/events" && comingUp > 0 && (
                  <span className="mr-3 flex shrink-0 flex-col items-center leading-none">
                    <span className="text-2xl font-black italic">{comingUp}</span>
                    <span className="text-[0.625rem] font-bold tracking-wide uppercase">{t("ui.guest.new.s.localCount", { region: regionName(region) })}</span>
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ol>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="font-bold text-muted uppercase italic">{t("ui.guest.new.already")}</span>
          {START.filter((f) => f.href !== "/new" && f.href !== "/reels" && f.href !== "/history").map((f) => (
            <Link key={f.href} href={f.href} className="link font-semibold">{t(f.title)}</Link>
          ))}
          <Link href="/brackets" className="link font-semibold">{t("browse.events.openAnyBracket")}</Link>
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <IntentLink href="/signin" className="btn btn-md btn-primary btn-hero">{t("ui.guest.join")}</IntentLink>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <IntentLink href="/signin" className="font-semibold text-foreground hover:underline">{t("ui.guest.signIn")}</IntentLink>
            <Link href="/about" className="text-muted hover:text-foreground hover:underline">{t("ui.guest.whatIs")}</Link>
          </span>
        </div>
        {inviteOnly && <p className="text-meta text-muted">{t("ui.guest.inviteOnly")}</p>}
      </div>

      <div className="skin-old flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="guest-welcome" className="text-2xl leading-tight font-bold">{t("ui.guest.headline")}</h2>
          <p className="text-muted">{t("ui.guest.pitch")}</p>
        </div>
        {/* One line; what doesn't fit goes under More (round 852). */}
        <OverflowRow label={t("ui.guest.startHere")}>
          {START.map((f) => (
            <Link key={f.href} href={f.href} className="chip font-semibold hover:bg-surface">
              {t(f.title)}
            </Link>
          ))}
        </OverflowRow>
        {/* One button; the rest are quiet links beside it (round 871: two buttons over a third row of links
            read as a wall of equal-weight buttons). */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <IntentLink href="/signin" className="btn btn-md btn-primary btn-hero">{t("ui.guest.join")}</IntentLink>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <IntentLink href="/signin" className="font-semibold text-foreground hover:underline">{t("ui.guest.signIn")}</IntentLink>
            <Link href="/about" className="text-muted hover:text-foreground hover:underline">{t("ui.guest.whatIs")}</Link>
            <Link href="/help" className="text-muted hover:text-foreground hover:underline">{t("ui.guest.helpBuild")}</Link>
          </span>
        </div>
        {inviteOnly && <p className="text-meta text-muted">{t("ui.guest.inviteOnly")}</p>}
      </div>

      {nextMajors.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <h3 className="font-bold">{t("ui.guest.majors")}</h3>
            <Link href="/events" className="text-sm font-semibold text-brand">{t("ui.guest.allEvents")}</Link>
          </div>
          <div className="scroll-fade -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {nextMajors.map((m) => <MajorCard key={m.slug} m={m} />)}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <Fold id="home-coming-up" heading={<h3 className="font-bold">{t("ui.guest.comingUp", { region: regionName(region) })}</h3>}>
          {live && (
            <Link href={`/events/${live.slug}`} className="hero-card flex flex-col gap-2 p-4">
              <span className="relative inline-flex w-fit items-center gap-1.5 rounded-full border border-white/35 bg-black/25 px-2.5 py-0.5 text-meta font-bold">
                {whenLabel(live, undefined, lang)}{live.city ? ` · ${live.city}` : ""}
              </span>
              <span className="relative text-2xl leading-tight font-bold">{live.name}</span>
              {/* With how many are playing (round 894): the card was a big red block with little in it. */}
              <span className="relative flex flex-wrap items-center gap-2 text-sm [&_.badge]:bg-white/90 [&_.badge]:text-[#2a0b0a]">
                {[...new Set(live.events.map((e) => e.game))].slice(0, 3).map((g) => <GameBadge key={g} game={g} />)}
                <span className="text-white/85">{t("browse.players", { n: Math.max(live.numAttendees ?? 0, ...live.events.map((e) => e.numEntrants ?? 0)) })}</span>
              </span>
            </Link>
          )}
          {rows.length > 0 && (
            <ul className="card flex flex-col divide-y divide-line">
              {rows.map((ev) => {
                const d = dateBadgeParts(ev.startAt, ev.timezone, lang);
                return (
                  <li key={ev.id}>
                    <Link href={`/events/${ev.slug}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface">
                      <span className="date-bubble" aria-hidden="true">
                        <span className="text-[0.625rem] font-bold text-brand">{d.month}</span>
                        <span className="text-lg font-bold">{d.day}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{ev.name}</span>
                        <span className={`block truncate text-sm ${isRunning(ev) ? "font-semibold text-brand" : "text-muted"}`}>{whenLabel(ev, undefined, lang)}{ev.city ? ` · ${ev.city}` : ""}</span>
                      </span>
                      <span className="flex shrink-0 gap-1">{[...new Set(ev.events.map((e) => e.game))].slice(0, 2).map((g) => <GameBadge key={g} game={g} />)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <Link href="/events" className="link self-start text-sm">{detected ? t("ui.guest.allEvents") : t("ui.guest.pickRegion")}</Link>
        </Fold>
      )}

      {results.length > 0 && (
        <Fold id="home-results" heading={<h3 className="font-bold">{t("ui.guest.results")}</h3>}>
          <ul className="card flex flex-col divide-y divide-line">
            {results.map((ev) => (
              <li key={ev.id}>
                <Link href={`/events/${ev.slug}`} className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-surface">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{ev.name}</span>
                    <Suspense fallback={null}>
                      <RecentWinners slug={ev.slug} />
                    </Suspense>
                  </span>
                  {/* Date over player count (round 828): on one line they took half a phone's width and cut the
                      winners' names short. */}
                  <span className="shrink-0 text-right text-sm leading-snug text-muted">
                    <span className="block">{formatEventDate(ev.startAt, ev.timezone, lang)}</span>
                    {ev.numAttendees ? <span className="block">{t("browse.recent.players", { n: ev.numAttendees })}</span> : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Fold>
      )}

      {/* Online brackets running now or starting within a day; live ones open their bracket. Nothing shows when there are none. */}
      {/* Wide screens show it in the side column instead (round 813). */}
      <div className="xl:hidden">
        <Suspense fallback={null}>
          <OnlineToday as="h3" fold />
        </Suspense>
      </div>

      <Suspense fallback={null}>
        <TopClips headingId="guest-clips" bleed as="h3" />
      </Suspense>

      <div className="flex flex-col gap-2">
        <h3 className="font-bold">{t("ui.guest.also")}</h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {ALSO.map((f) => (
            <li key={f.title}>
              <Link href={f.href} className="card flex h-full gap-3 p-3 hover:bg-surface">
                <span className="min-w-0">
                  <span className="block font-semibold">{t(f.title)}</span>
                  <span className="block text-sm text-muted">{t(f.text)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      {/* The store buttons sit at the end (round 851): at the top they made a fourth row of buttons under
          Join and Sign in, and phones already get the "Get the Smashy app" banner. */}
      <GetTheApp />
    </section>
  );
}
