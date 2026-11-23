// A tournament hosted on parry.gg (another bracket site), for majors found there like Blitz Box:
// when and where, its events with sign-ups so far, the brackets once they start (Smashy shows
// parry.gg brackets), and a link to sign up on parry.gg. Read from parry.gg's API, cached a minute
// or so while it's upcoming and an hour once it's over.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import GameBadge from "@/components/GameBadge";
import NearbyEvents from "@/components/events/NearbyEvents";
import { REGIONS, regionFromGeo } from "@/lib/regions";
import { getUserId } from "@/lib/supabase/server";
import { LiveDot } from "@/components/majors/MajorParts";
import NewTab from "@/components/ui/NewTab";
import ShareButton from "@/components/ui/ShareButton";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { getParryggTournament } from "@/lib/brackets/parrygg";
import { bracketPath } from "@/lib/brackets/types";
import { formatEventDate, formatEventTime } from "@/lib/format";
import { LangProvider, T } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";
import { getMajor, PARRYGG_PREFIX } from "@/lib/majors";
import { pageMeta } from "@/lib/siteMeta";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const t = await getParryggTournament(slug).catch(() => null);
  if (!t) return { title: "Tournament not found" };
  const when = t.startAt ? formatEventDate(t.startAt, t.timezone) : null;
  return pageMeta(t.name, [when, t.city, "on parry.gg"].filter(Boolean).join(" · "));
}

/** "More smash in Florida": other upcoming tournaments in the same region, as on start.gg tournaments' pages. */
async function ParryNearby({ region, slug, lang }: { region: string; slug: string; lang: string }) {
  const [userId, tr] = await Promise.all([getUserId(), getT()]);
  return <NearbyEvents region={region} slug={slug} signedIn={!!userId} lang={lang} t={tr} />;
}

async function Details({ params }: Props) {
  const { slug } = await params;
  const [t, major, tr, lang] = await Promise.all([
    getParryggTournament(slug).catch(() => undefined),
    getMajor(PARRYGG_PREFIX + slug.toLowerCase()).catch(() => null),
    getT(),
    getLang(),
  ]);
  if (t === null) notFound();
  if (!t) return <p className="card m-4 p-4 text-sm text-muted">{tr("browse.parry.cantReach")}</p>;

  const live = !!major?.live;
  const mapsUrl = t.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.address)}` : null;
  // Smash events first, biggest first; other games after.
  const events = [...t.events].sort((a, b) => Number(!a.game) - Number(!b.game) || b.entrants - a.entrants);
  const firstStarted = events.find((e) => e.game && e.started);
  const hasPicture = !!(t.bannerUrl || t.avatarUrl);
  // parry.gg names the state ("Florida"); Smashy's regions go by code ("US-FL").
  const area = REGIONS.find((r) => r.code.startsWith(`${t.country}-`) && r.name === t.region)?.code.split("-")[1] ?? null;
  const region = t.online ? null : regionFromGeo(t.country, area);

  return (
    <LangProvider lang={lang}>
      <div className="flex flex-col gap-5 p-4">
        {/* The organizer's banner, as a small still Smashy makes from it (round 725). */}
        {hasPicture && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/parrygg-image/${t.slug}/banner`} alt="" width={960} height={540} className="aspect-video w-full rounded-xl border border-line bg-surface object-cover" />
        )}
        <div className="min-w-0">
          {(major || live) && (
            <div className="mb-1 flex items-center gap-1.5">
              {live && <LiveDot />}
              {major && <span className="badge bg-brand/10 text-brand">{tr("browse.event.major")}</span>}
            </div>
          )}
          <h1 className="text-2xl font-bold leading-tight">{t.name}</h1>
          {t.startAt && (
            <p className="text-muted">
              {formatEventDate(t.startAt, t.timezone, lang)} · {formatEventTime(t.startAt, t.timezone, lang)}
            </p>
          )}
          {t.attendees > 0 && <p className="text-sm text-muted">{tr(t.over ? "browse.entrants" : "browse.event.signedUp", { n: t.attendees })}</p>}
        </div>

        {firstStarted && (
          <Link href={bracketPath("parrygg", firstStarted.id)} className="btn btn-lg btn-primary">
            {t.over ? tr("browse.event.seeResults") : tr("browse.event.followLive")}
          </Link>
        )}
        <a href={t.url} target="_blank" rel="noopener noreferrer" className={`btn ${firstStarted ? "btn-outline" : "btn-lg btn-primary"}`}>
          {t.over || firstStarted ? tr("browse.parry.view") : tr("browse.parry.signUp")}
          <NewTab />
        </a>
        {!t.over && !firstStarted && <p className="-mt-3 text-center text-xs text-muted">{tr("browse.parry.hint")}</p>}

        <ShareButton path={`/events/parrygg/${t.slug}`} title={t.name} label={tr("browse.event.share")} className="btn btn-sm btn-ghost -mt-2 self-center" />

        <section className="card p-4">
          <h2 className="mb-1 font-bold">{tr("browse.event.where")}</h2>
          <p>{t.online ? tr("event.online") : [t.city, t.region].filter(Boolean).join(", ") || tr("browse.locationTba")}</p>
          {t.address && <p className="text-sm text-muted">{t.address}</p>}
          {mapsUrl && !t.online && (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-brand">
              {tr("browse.openMaps")}
              <NewTab />
            </a>
          )}
        </section>

        {events.length > 0 && (
          <section className="card p-4">
            <h2 className="mb-2 font-bold">{tr("nav.events")}</h2>
            <ul className="flex flex-col gap-2">
              {events.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    {e.game ? <GameBadge game={e.game} /> : null}
                    <span className="min-w-0">
                      <span className="block truncate leading-tight">{e.name}</span>
                      <span className="block text-meta text-muted">
                        {!e.game && e.gameName ? `${e.gameName} · ` : ""}
                        {e.online ? `${tr("event.online")} · ` : ""}
                        {e.entrants === 0
                          ? tr("browse.event.noSignups")
                          : t.over
                            ? tr("browse.entrants", { n: e.entrants })
                            : e.cap
                              ? tr("browse.parry.spots", { n: e.entrants, cap: e.cap })
                              : tr("browse.event.signedUp", { n: e.entrants })}
                      </span>
                    </span>
                  </span>
                  {e.started && (
                    <Link href={bracketPath("parrygg", e.id)} className="btn btn-sm btn-outline shrink-0">
                      {t.over ? tr("browse.results") : tr("browse.bracket")}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {region && (
          <Suspense fallback={null}>
            <ParryNearby region={region} slug={PARRYGG_PREFIX + t.slug} lang={lang} />
          </Suspense>
        )}
      </div>
    </LangProvider>
  );
}

export default function ParryggTournamentPage(props: Props) {
  return (
    <div>
      <Link href="/events" className="block px-4 pt-4 text-sm text-muted hover:text-foreground">
        <T k="browse.allEvents" />
      </Link>
      <Suspense fallback={<div className="p-4"><PageSkeleton /></div>}>
        <Details params={props.params} />
      </Suspense>
    </div>
  );
}
