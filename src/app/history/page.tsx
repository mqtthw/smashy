// Smash history: past majors, year by year (docs/archive-plan.md, step A1). Each major opens its
// tournament page, which already has the top 8, the bracket and set VODs. Facts only (names, dates,
// places, entrant counts) from start.gg and parry.gg, credited on the page.
import type { Metadata } from "next";
import SwipeRow from "@/components/ui/SwipeRow";
import Link from "next/link";
import { after, connection } from "next/server";
import { Suspense } from "react";
import GameBadge from "@/components/GameBadge";
import { MajorDates, MajorPlace } from "@/components/majors/MajorText";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { GAME_KEYS, GAMES, isGameKey, type GameKey } from "@/lib/games";
import { T } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";
import MomentList from "@/components/history/MomentList";
import VodLinks from "@/components/history/VodLinks";
import { getMajorVods, type MajorVod } from "@/lib/majorVods";
import Breakthroughs from "@/components/history/Breakthroughs";
import Documentaries from "@/components/history/Documentaries";
import OfficialRanking from "@/components/history/OfficialRanking";
import YearCharacters from "@/components/history/YearCharacters";
import YearTally from "@/components/history/YearTally";
import { getMoments, type Moment } from "@/lib/historyMoments";
import { isManualMajor, majorHref } from "@/lib/handMajors";
import { saveMajorStandings } from "@/lib/majorStandings";
import { gameEntrants, getMajorEvents, saveMajorResults, winnersByGame, type MajorEvent } from "@/lib/majorEvents";
import { majorPlace } from "@/lib/majorText";
import CharacterStocks from "@/components/history/CharacterStocks";
import { fillMajorSets, getMajorCharacters, winnerCharacters, winnerIds, type MajorCharacters } from "@/lib/majorSets";
import { playersHidingStats } from "@/lib/playerStats";
import { getNameLinks } from "@/lib/playerLinks";
import { ARCHIVE_FIRST_YEAR, archiveYears, getPastMajors } from "@/lib/majors";
import { pageMeta } from "@/lib/siteMeta";

export const metadata: Metadata = pageMeta("Smash Bros. tournament history: every major since 2003", "Past Super Smash Bros. majors, year by year, with their top 8s, brackets and VODs: Melee, Ultimate, Brawl, Smash 4, 64 and Project+.");

function href(year: number, game: GameKey | null) {
  const q = new URLSearchParams({ year: String(year) });
  if (game) q.set("game", game);
  return `/history?${q}`;
}

async function Archive({ searchParams }: { searchParams: PageProps<"/history">["searchParams"] }) {
  const sp = await searchParams;
  await connection(); // the year list ends at this year
  const years = archiveYears(); // from Smash 64's release (1999)
  const asked = Number(sp.year);
  const year = years.includes(asked) ? asked : years[0];
  const game = isGameKey(sp.game) ? sp.game : null;
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const [all, yearMoments] = await Promise.all([getPastMajors(year).catch(() => []), getMoments(year).catch((): Moment[] => [])]);
  const moments = game ? yearMoments.filter((m) => !m.game || m.game === game) : yearMoments;
  const majors = game ? all.filter((m) => m.games.includes(game)) : all;
  // Saved results (winners, each game's own entrant count). Majors without them yet get them in the
  // background, a few per visit (step A2).
  const [events, vods, chars, links] = await Promise.all([
    getMajorEvents(all.map((m) => m.slug)).catch(() => new Map<string, MajorEvent[]>()),
    getMajorVods(all.map((m) => m.slug)).catch(() => new Map<string, MajorVod[]>()),
    // The characters winners used (step H5), from the sets saved in the background.
    getMajorCharacters(all.map((m) => m.slug)).catch((): MajorCharacters => new Map()),
    getNameLinks().catch(() => new Map<string, string>()),
  ]);
  // Players who asked not to be listed get no characters (null: couldn't check, so none are shown).
  const hidden = chars.size || [...events.values()].flat().some((e) => e.top8.some((r) => r.characters?.length)) ? await playersHidingStats(winnerIds([...events.values()].flat(), links)).catch(() => null) : new Set<string>();
  const missing = all.filter((m) => !events.has(m.slug) && !isManualMajor(m.slug)).map((m) => m.slug);
  // Then full standings (step H3) of this year's majors whose top 8s are saved (the claim skips the rest).
  after(async () => {
    if (missing.length) await saveMajorResults(missing);
    await saveMajorStandings(all.map((m) => m.slug));
  });
  // ...and the sets played at this year's majors (head-to-head, characters): a few requests per visit.
  after(() => fillMajorSets({ slugs: all.map((m) => m.slug), maxRequests: 12 }).catch(() => {}));

  return (
    <>
      <SwipeRow label={t("history.years")}>
        {years.map((y) => (
          <Link key={y} href={href(y, game)} aria-current={y === year ? "page" : undefined} className="chip py-1">{y}</Link>
        ))}
      </SwipeRow>
      <SwipeRow label={t("history.games")}>
        <Link href={href(year, null)} aria-current={!game ? "page" : undefined} className="chip py-1">{t("history.allGames")}</Link>
        {GAME_KEYS.map((g) => (
          <Link key={g} href={href(year, g)} aria-current={game === g ? "page" : undefined} className="chip py-1">{GAMES[g].short}</Link>
        ))}
      </SwipeRow>

      {moments.length > 0 && (
        <section aria-labelledby="history-moments" className="flex flex-col gap-2">
          <h2 id="history-moments" className="font-bold">{t("history.moments.inYear", { year })}</h2>
          <MomentList moments={moments} lang={lang} t={t} />
        </section>
      )}

      <section aria-labelledby="history-year" className="flex flex-col gap-2">
        <h2 id="history-year" className="font-bold">
          {majors.length ? t("history.count", { n: majors.length, year }) : year}
        </h2>
        {majors.length === 0 ? (
          <p className="card p-4 text-sm text-muted">
            {game ? t("history.noneGame", { game: GAMES[game].short, year }) : t("history.none", { year })}
          </p>
        ) : (
          <ul className="card divide-y divide-line">
            {majors.map((m) => {
              const saved = events.get(m.slug) ?? [];
              const winners = winnersByGame(saved).filter((w) => !game || w.game === game);
              const entrants = (game && gameEntrants(saved, game)) || m.entrants;
              return (
              <li key={m.slug}>
                <Link href={majorHref(m.slug)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface">
                  <span className="flex shrink-0 flex-col gap-1">
                    {m.games.map((g) => <GameBadge key={g} game={g} />)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{m.name}</span>
                    <span className="block truncate text-meta text-muted">
                      <MajorDates m={m} />
                      {majorPlace(m) ? " · " : null}
                      <MajorPlace m={m} />
                      {entrants ? " · " : null}
                      {entrants ? <T k="browse.entrants" values={{ n: entrants }} /> : null}
                    </span>
                    {winners.length > 0 && (
                      <span className="block truncate text-meta">
                        <span aria-hidden>🏆 </span>
                        <span className="sr-only">{t("history.winners")} </span>
                        {winners.map((w, i) => (
                          <span key={w.game}>
                            {i > 0 && " · "}
                            {w.name}
                            <CharacterStocks game={w.game} names={winnerCharacters(saved, w.game, chars, links, hidden)} size={14} />
                            {!game && <span className="text-muted"> ({GAMES[w.game].short})</span>}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                </Link>
                <VodLinks vods={(vods.get(m.slug) ?? []).filter((v) => !game || v.game === game)} t={t} className="-mt-1 pb-2.5 pl-4 pr-4" />
              </li>
              );
            })}
          </ul>
        )}
      </section>
      {year === years.at(-1) && year >= ARCHIVE_FIRST_YEAR && <p className="text-sm text-muted">{t("history.before", { year: ARCHIVE_FIRST_YEAR })}</p>}
      {year < ARCHIVE_FIRST_YEAR && <p className="text-sm text-muted">{t("history.handYears", { year: ARCHIVE_FIRST_YEAR })}</p>}
      <Suspense fallback={null}>
        <OfficialRanking year={year} game={game} byMajor={all.map((m) => events.get(m.slug) ?? [])} t={t} />
      </Suspense>
      <Suspense fallback={null}>
        <Breakthroughs year={year} game={game} t={t} />
      </Suspense>
      <Suspense fallback={null}>
        <YearTally year={year} game={game} byMajor={all.map((m) => events.get(m.slug) ?? [])} t={t} />
      </Suspense>
      <Suspense fallback={null}>
        <YearCharacters year={year} game={game} t={t} />
      </Suspense>
      <Link href={`/history/vod?year=${year}`} className="self-start text-sm text-muted underline">{t("history.vod.link.year", { year })}</Link>
      <Link href={`/history/report?year=${year}`} className="self-start text-sm text-muted underline">{t("history.report.link.year", { year })}</Link>
    </>
  );
}

export default function HistoryPage(props: PageProps<"/history">) {
  return (
    <section className="mx-auto flex max-w-xl flex-col gap-4 p-4">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold"><T k="history.title" /></h1>
        <Link href="/history/timeline" className="self-start text-sm font-semibold text-brand"><T k="history.timeline.link" /> →</Link>
        <Link href="/history/records" className="self-start text-sm font-semibold text-brand"><T k="history.records.link" /> →</Link>
      </header>
      <Suspense fallback={<CardListSkeleton count={6} />}>
        <Archive searchParams={props.searchParams} />
      </Suspense>
      <Documentaries />
      <Link href="/history/suggest" className="text-sm font-semibold text-brand"><T k="history.suggest.link" /> →</Link>
      <p className="text-meta text-muted"><T k="history.source" /></p>
    </section>
  );
}
