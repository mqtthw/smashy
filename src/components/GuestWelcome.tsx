import Logo from "@/components/Logo";
import Link from "next/link";
import GetTheApp from "@/components/GetTheApp";
import { Suspense } from "react";
import OnlineToday from "@/app/brackets/OnlineToday";
import RecentWinners from "@/components/events/RecentWinners";
import TopClips from "@/components/feed/TopClips";
import GameBadge from "@/components/GameBadge";
import { MajorCard } from "@/components/majors/MajorParts";
import { getRegionEvents } from "@/lib/events";
import { dateBadgeParts, formatEventDate, isRunning, whenLabel } from "@/lib/format";
import type { MessageKey } from "@/lib/i18n/core";
import { getLang, getT } from "@/lib/i18n/server";
import { isInviteOnly } from "@/lib/invites";
import { majorsFor, type Major } from "@/lib/majors";
import { HOME_REGION, regionName } from "@/lib/regions";
import { detectedRegion } from "@/lib/viewerRegion";
import Fold from "@/components/ui/Fold";
import RotatingCharacterIcon from "@/components/RotatingCharacterIcon";
import { STOCK_ICON_KEYS } from "@/lib/stockIconKeys";

// The "start here" links at the top (round 654, for visitors from the Reddit posts): Smashy's
// strongest parts, none of which need an account. A row of short links since round 845: as six cards
// with a sales line each, the first screen read like a generic landing page (Reddit: "looks vibe coded").
// No stock line icons on them or the headings below (round 848, Matthew: they give the site away as
// template-made); only the character link keeps its real stock icon. Character pages come first (round 824, Matthew: more
// people will be interested in them than in Smash history, which swapped places with them).
const START: { title: MessageKey; href: string }[] = [
  { title: "ui.guest.t.characters", href: "/games" },
  { title: "ui.guest.t.events", href: "/events" },
  { title: "ui.guest.t.history", href: "/history" },
  { title: "ui.guest.t.newPlayers", href: "/new" },
  { title: "ui.guest.t.reels", href: "/reels" },
  { title: "ui.guest.t.players", href: "/search?tab=players" },
];

/** 20 random Melee and Ultimate stock icons for the Character pages button to rotate through. */
function characterIcons(): string[] {
  const all = (["melee", "ultimate"] as const).flatMap((g) => [...(STOCK_ICON_KEYS[g] ?? [])].map((k) => `/stock/${g}/${k}.webp`));
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, 20);
}

// Further down: the parts that come alive with an account.
const ALSO: { title: MessageKey; text: MessageKey; href: string }[] = [
  { title: "ui.guest.f.host", text: "ui.guest.f.hostText", href: "/host/about" },
  { title: "ui.guest.f.mySets", text: "ui.guest.f.mySetsText", href: "/my-sets" },
];


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
  const live = upcoming.find((ev) => isRunning(ev));
  const rows = upcoming.filter((ev) => ev !== live);
  // The week's biggest finished tournaments (latest day first), with who won: real results from the scene, no account needed.
  const results = (events?.recent ?? []).slice(0, 3);
  const nextMajors = majorsFor(majors, []).slice(0, 6); // the main games' majors, soonest first
  const icons = characterIcons();

  return (
    <section aria-labelledby="guest-welcome" className="flex flex-col gap-6 border-b border-line px-4 py-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          {/* Phones have no sidebar, so by day the logo and its sun open the page there (round 774). */}
          <span className="day-only logo-sun mx-auto mt-6 mb-8 inline-block text-5xl md:hidden"><Logo className="" /></span>
          <h2 id="guest-welcome" className="text-2xl leading-tight font-bold">{t("ui.guest.headline")}</h2>
          <p className="text-muted">{t("ui.guest.pitch")}</p>
        </div>
        <ul className="flex flex-wrap gap-2">
          {START.map((f) => (
            <li key={f.href}>
              <Link href={f.href} className="chip font-semibold hover:bg-surface">
                {f.href === "/games" && <RotatingCharacterIcon icons={icons} />}
                {t(f.title)}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/signin" className="btn btn-md btn-primary btn-hero">{t("ui.guest.join")}</Link>
          <Link href="/signin" className="btn btn-md btn-outline">{t("ui.guest.signIn")}</Link>
        </div>
        <p className="text-meta text-muted">
          {inviteOnly && <>{t("ui.guest.inviteOnly")}{" "}</>}
          <Link href="/about" className="link">{t("ui.guest.whatIs")}</Link>
          {" · "}
          <Link href="/help" className="link">{t("ui.guest.helpBuild")}</Link>
        </p>
        <GetTheApp />
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
            <Link href={`/events/${live.slug}`} className="hero-card flex min-h-36 flex-col justify-between gap-3 p-4">
              <span className="relative inline-flex w-fit items-center gap-1.5 rounded-full border border-white/35 bg-black/25 px-2.5 py-0.5 text-meta font-bold">
                {whenLabel(live, undefined, lang)}{live.city ? ` · ${live.city}` : ""}
              </span>
              <span className="relative text-2xl leading-tight font-bold [text-shadow:0_2px_6px_rgb(60_0_0/0.45)]">{live.name}</span>
              <span className="relative flex gap-1 [&_.badge]:bg-white/90 [&_.badge]:text-[#2a0b0a]">{[...new Set(live.events.map((e) => e.game))].slice(0, 3).map((g) => <GameBadge key={g} game={g} />)}</span>
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
        <Fold id="home-results" heading={<h3 className="font-bold">{t("media.scene.results", { name: regionName(region) })}</h3>}>
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
    </section>
  );
}
