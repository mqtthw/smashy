// Leagues (step L1): weeks of sets in divisions, then playoffs. The list, by game.
import type { Metadata } from "next";
import EmptyState from "@/components/ui/EmptyState";
import Link from "next/link";
import { Suspense } from "react";
import GameBadge from "@/components/GameBadge";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { formatEventDate } from "@/lib/format";
import { GAMES, isGameKey, MAIN_GAME_KEYS } from "@/lib/games";
import { T } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";
import { listLeagues } from "@/lib/leagues";
import { pageMeta } from "@/lib/siteMeta";

export const metadata: Metadata = pageMeta("Leagues", "Leagues on Smashy: weeks of sets in divisions, then playoffs.");

async function LeagueList({ searchParams }: { searchParams: PageProps<"/leagues">["searchParams"] }) {
  const sp = await searchParams;
  const game = isGameKey(sp.game) ? sp.game : null;
  const [leagues, t, lang] = await Promise.all([listLeagues(game), getT(), getLang()]);
  return (
    <>
      <nav aria-label={t("league.list.filter")} className="flex flex-wrap gap-2">
        <Link href="/leagues" aria-current={!game ? "page" : undefined} className="chip py-1">{t("league.list.allGames")}</Link>
        {MAIN_GAME_KEYS.map((g) => (
          <Link key={g} href={`/leagues?game=${g}`} aria-current={game === g ? "page" : undefined} className="chip py-1">{GAMES[g].short}</Link>
        ))}
      </nav>
      {leagues.length ? (
        <ul className="flex flex-col gap-2">
          {leagues.map((l) => (
            <li key={l.id}>
              <Link href={`/leagues/${l.id}`} className="card flex flex-col gap-1 p-4 hover:bg-surface">
                <span className="flex items-center gap-2">
                  <GameBadge game={l.game} />
                  <span className="min-w-0 truncate font-bold">{l.name}</span>
                </span>
                <span className="text-meta text-muted">
                  {t(`league.status.${l.status}`)} · {t("league.startsWeeks", { date: formatEventDate(Date.parse(l.startsAt) / 1000, l.timezone, lang), n: l.weeks })} · {t("league.players", { n: l.playerCount })}
                  {l.online ? ` · ${t("league.field.online")}` : l.location ? ` · ${l.location}` : ""}
                </span>
                {l.host && <span className="text-meta text-muted">{t("league.runBy", { handle: l.host.handle })}</span>}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState game={game} title={t("league.list.none")} />
      )}
    </>
  );
}

export default function LeaguesPage(props: PageProps<"/leagues">) {
  return (
    <section className="mx-auto flex max-w-xl flex-col gap-4 p-4">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold"><T k="league.title" /></h1>
        <p className="text-sm text-muted"><T k="league.intro" /></p>
        <Link href="/leagues/new" className="btn btn-md btn-primary self-start"><T k="league.start" /></Link>
      </header>
      <Suspense fallback={<CardListSkeleton count={3} />}>
        <LeagueList searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
