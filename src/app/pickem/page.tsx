// Pick'em for majors: the majors coming up (and being played), each with its singles events to
// pick, and your own picks. No money, no prizes.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import GameBadge from "@/components/GameBadge";
import LocalTime from "@/components/ui/LocalTime";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { unixNow } from "@/lib/format";
import { getMajors, isParryggMajor } from "@/lib/majors";
import { getMyPicks } from "@/lib/pickemPicks";
import { getMajorSinglesEvents } from "@/lib/pickemStartgg";
import { pageMeta } from "@/lib/siteMeta";
import { getUserId } from "@/lib/supabase/server";
import { T } from "@/lib/i18n/client";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = pageMeta("Pick'em", "Pick the champion and the top 8 at the next majors, and see how you stack up against your friends and your scene.");

async function Majors() {
  const { live, upcoming } = await getMajors().catch(() => ({ live: [], upcoming: [] }));
  // Pick'em reads start.gg's seeds and standings, so majors found on parry.gg aren't offered.
  const majors = [...live, ...upcoming].filter((m) => !isParryggMajor(m.slug)).slice(0, 6);
  const withEvents = await Promise.all(majors.map(async (m) => ({ m, events: await getMajorSinglesEvents(m.slug).catch(() => []) })));
  const now = unixNow();
  const shown = withEvents.filter((x) => x.events.length);
  if (!shown.length) return <p className="card p-4 text-sm text-muted"><T k="play.pickem.noMajors" /></p>;
  return (
    <ul className="flex flex-col gap-3">
      {shown.map(({ m, events }) => (
        <li key={m.slug} className="card flex flex-col gap-2 p-4">
          <div>
            <Link href={`/events/${m.slug}`} className="font-bold hover:underline">{m.name}</Link>
            <p className="text-meta text-muted">
              <LocalTime iso={m.startAt} style="eventDate" />
              {m.city ? ` · ${m.city}` : ""}
              {m.live ? <T k="play.pickem.liveNow" /> : ""}
            </p>
          </div>
          <ul className="divide-y divide-line">
            {events.map((e) => {
              const open = e.state === "CREATED" && !!e.startAt && e.startAt > now;
              return (
                <li key={e.id}>
                  <Link href={`/pickem/${e.id}`} className="flex items-center gap-2 py-2 text-sm hover:underline">
                    <GameBadge game={e.game} />
                    <span className="min-w-0 flex-1 truncate">
                      {e.name} <span className="text-meta text-muted"><T k="play.pickem.entrants" values={{ n: e.entrants }} /></span>
                    </span>
                    <span className={`shrink-0 text-meta ${open ? "font-semibold text-brand" : "text-muted"}`}><T k={open ? "play.pickem.pickNow" : e.state === "COMPLETED" ? "play.pickem.final" : "play.pickem.locked"} /></span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
}

async function MyPicks() {
  const userId = await getUserId();
  const mine = await getMyPicks(userId);
  if (!mine.length) return null;
  const t = await getT();
  return (
    <section className="flex flex-col gap-2" aria-labelledby="my-picks">
      <h2 id="my-picks" className="font-bold">{t("play.pickem.yourPicks")}</h2>
      <ul className="card divide-y divide-line">
        {mine.map((p) => (
          <li key={p.eventId}>
            <Link href={`/pickem/${p.eventId}`} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-surface">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">
                  {p.tournament}: {p.eventName}
                </span>
                <span className="block text-meta text-muted">🏆 {p.tags[p.champion] ?? t("play.pickem.player")}</span>
              </span>
              <span className="shrink-0 text-meta text-muted">
                <LocalTime iso={p.locksAt} style="shortDate" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function PickemPage() {
  return (
    <section className="mx-auto flex max-w-xl flex-col gap-4 p-4">
      <header>
        <h1 className="text-2xl font-bold"><T k="play.pickem.title" /></h1>
        <p className="text-sm text-muted">
          <T k="play.pickem.intro" />
        </p>
      </header>
      <Suspense fallback={null}>
        <MyPicks />
      </Suspense>
      <Suspense fallback={<CardListSkeleton count={3} />}>
        <Majors />
      </Suspense>
    </section>
  );
}
