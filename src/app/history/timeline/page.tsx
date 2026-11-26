// The Smash timeline (docs/archive-plan.md, step A6): every approved moment, oldest first, by year, each
// linking to its VOD or source. Filter by game; moments without a game always show.
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import Documentaries from "@/components/history/Documentaries";
import MomentList from "@/components/history/MomentList";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { GAME_KEYS, GAMES, isGameKey } from "@/lib/games";
import { byYear, getMoments, type Moment } from "@/lib/historyMoments";
import { T } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";
import { pageMeta } from "@/lib/siteMeta";

export const metadata: Metadata = pageMeta("Smash timeline", "Moments in Super Smash Bros. history, from the first games to now, each with a link to a VOD or source.");

async function Timeline({ searchParams }: { searchParams: PageProps<"/history/timeline">["searchParams"] }) {
  const sp = await searchParams;
  await connection();
  const game = isGameKey(sp.game) ? sp.game : null;
  const [t, lang, all] = await Promise.all([getT(), getLang(), getMoments().catch((): Moment[] => [])]);
  const moments = game ? all.filter((m) => !m.game || m.game === game) : all;
  return (
    <>
      <nav aria-label={t("history.games")} className="flex flex-wrap gap-2">
        <Link href="/history/timeline" aria-current={!game ? "page" : undefined} className="chip py-1">{t("history.allGames")}</Link>
        {GAME_KEYS.map((g) => (
          <Link key={g} href={`/history/timeline?game=${g}`} aria-current={game === g ? "page" : undefined} className="chip py-1">{GAMES[g].short}</Link>
        ))}
      </nav>
      {moments.length === 0 ? (
        <p className="card p-4 text-sm text-muted">{t("history.timeline.none")}</p>
      ) : (
        byYear(moments).map(({ year, moments: ms }) => (
          <section key={year} aria-labelledby={`year-${year}`} className="flex flex-col gap-2">
            <h2 id={`year-${year}`} className="font-bold">
              <Link href={`/history?year=${year}`} className="hover:underline">{year}</Link>
            </h2>
            <MomentList moments={ms} lang={lang} t={t} />
          </section>
        ))
      )}
    </>
  );
}

export default function TimelinePage(props: PageProps<"/history/timeline">) {
  return (
    <section className="flex flex-col gap-4 p-4">
      <Link href="/history" className="text-sm text-muted hover:text-foreground"><T k="history.major.back" /></Link>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold"><T k="history.timeline.title" /></h1>
        <p className="text-sm text-muted"><T k="history.timeline.intro" /></p>
        <Link href="/history/suggest?kind=moment" className="self-start text-sm font-semibold text-brand"><T k="history.timeline.suggest" /></Link>
      </header>
      <Suspense fallback={<CardListSkeleton count={4} />}>
        <Timeline searchParams={props.searchParams} />
      </Suspense>
      <Documentaries />
    </section>
  );
}
