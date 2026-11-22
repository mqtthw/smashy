// Smash history: a year's head-to-head grid among the top players at majors (Matthew, 2026-11-19: the
// kind of thing ranking voters keep in spreadsheets). Counted from the sets saved at that year's majors;
// each score opens the two players' comparison, with every set. Facts only, not a ranking.
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { GAME_KEYS, GAMES, isGameKey, type GameKey } from "@/lib/games";
import { T } from "@/lib/i18n/client";
import { getT } from "@/lib/i18n/server";
import { majorHref } from "@/lib/handMajors";
import { archiveYears } from "@/lib/majors";
import { getYearGrid } from "@/lib/yearHeadToHead";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("history.grid.metaTitle"), robots: { index: false } };
}

/** Sets are saved from start.gg (2014 on, when majors' brackets are there). */
const FIRST_GRID_YEAR = 2014;

const href = (year: number, game: GameKey, player?: string) => `/history/head-to-head?year=${year}&game=${game}${player ? `&player=${player}#record` : ""}`;
/** A short column heading: the tag without a sponsor, cut to fit. */
const short = (name: string) => {
  const tag = name.split(" | ").at(-1)!.trim();
  return tag.length > 8 ? `${tag.slice(0, 7)}…` : tag;
};

async function YearGrid({ searchParams }: { searchParams: PageProps<"/history/head-to-head">["searchParams"] }) {
  const sp = await searchParams;
  await connection(); // the year list ends at this year
  const years = archiveYears().filter((y) => y >= FIRST_GRID_YEAR);
  const asked = Number(sp.year);
  const year = years.includes(asked) ? asked : years[0];
  const game: GameKey = isGameKey(sp.game) ? sp.game : "melee";
  const player = typeof sp.player === "string" && /^\d{1,12}$/.test(sp.player) ? sp.player : null;
  const [t, grid] = await Promise.all([getT(), getYearGrid(year, game, player).catch(() => null)]);
  const record = grid?.record ?? null;
  const g = GAMES[game].short;

  return (
    <>
      <Link href={`/history?year=${year}&game=${game}`} className="text-sm text-muted hover:text-foreground">← {t("history.title")}</Link>
      <h1 className="text-2xl font-bold">{t("history.grid.title", { game: g, year })}</h1>
      <nav aria-label={t("history.years")} className="flex flex-wrap gap-2">
        {years.map((y) => (
          <Link key={y} href={href(y, game)} aria-current={y === year ? "page" : undefined} className="chip py-1">{y}</Link>
        ))}
      </nav>
      <nav aria-label={t("history.games")} className="flex flex-wrap gap-2">
        {GAME_KEYS.map((k) => (
          <Link key={k} href={href(year, k)} aria-current={k === game ? "page" : undefined} className="chip py-1">{GAMES[k].short}</Link>
        ))}
      </nav>
      <p className="text-sm text-muted">{t("history.grid.intro", { game: g })}</p>

      {!grid || grid.players.length < 2 ? (
        <p className="card p-4 text-sm text-muted">{t("history.grid.few", { game: g, year })}</p>
      ) : (
        <>
          <p className="text-meta text-muted">{t("history.grid.coverage", { n: grid.withSets, total: grid.majors })}</p>
          {grid.sets === 0 ? (
            <p className="card p-4 text-sm text-muted">{t("history.grid.none")}</p>
          ) : (
            <p className="text-meta text-muted">{t("history.grid.tap")} {t("history.grid.pick")}</p>
          )}
          <div className="card overflow-x-auto">
            <table className="text-sm">
              <thead>
                <tr className="text-meta text-muted">
                  <th scope="col" className="sticky left-0 bg-background px-3 py-2 text-left font-normal">{t("history.grid.player")}</th>
                  {grid.players.map((p) => (
                    <th key={p.playerId} scope="col" title={p.name} className="px-1.5 py-2 text-center font-normal whitespace-nowrap">{short(p.name)}</th>
                  ))}
                  <th scope="col" className="px-3 py-2 text-right font-normal">{t("history.grid.total")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {grid.players.map((a) => (
                  <tr key={a.playerId}>
                    <th scope="row" className="sticky left-0 bg-background px-3 py-1.5 text-left font-semibold whitespace-nowrap">
                      <Link href={href(year, game, a.playerId)} aria-current={a.playerId === player ? "true" : undefined} className="hover:underline aria-[current]:text-brand">{a.name}</Link>
                    </th>
                    {grid.players.map((b) => {
                      if (a.playerId === b.playerId) return <td key={b.playerId} className="bg-surface px-1.5 py-1.5" aria-hidden />;
                      const c = grid.cells[a.playerId][b.playerId];
                      if (!c) return <td key={b.playerId} className="px-1.5 py-1.5 text-center text-muted"><span aria-hidden>·</span><span className="sr-only">{t("history.grid.never", { a: a.name, b: b.name })}</span></td>;
                      const tone = c.wins > c.losses ? "text-success" : c.wins < c.losses ? "text-danger" : "";
                      return (
                        <td key={b.playerId} className="px-1.5 py-1.5 text-center">
                          <Link
                            href={`/players/compare?a=${a.playerId}&b=${b.playerId}`}
                            title={t("history.grid.cell", { a: a.name, b: b.name, wins: c.wins, losses: c.losses })}
                            aria-label={t("history.grid.cell", { a: a.name, b: b.name, wins: c.wins, losses: c.losses })}
                            className={`tabular-nums font-semibold hover:underline ${tone}`}
                          >
                            {c.wins}–{c.losses}
                          </Link>
                        </td>
                      );
                    })}
                    <td className="px-3 py-1.5 text-right tabular-nums">{grid.totals[a.playerId].wins}–{grid.totals[a.playerId].losses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {record && (
            <section id="record" aria-labelledby="record-title" className="flex scroll-mt-4 flex-col gap-2">
              <h2 id="record-title" className="font-bold">{t("history.grid.record.title", { name: record.name, year, wins: record.wins, losses: record.losses })}</h2>
              <p className="text-meta text-muted">
                {t("history.grid.record.note", { year, game: g })}{" "}
                <Link href={`/players/${record.playerId}`} className="link">{t("history.grid.record.profile")}</Link>
                {" · "}
                <Link href={href(year, game)} className="link">{t("history.grid.record.close")}</Link>
              </p>
              {record.sets.length === 0 ? (
                <p className="card p-4 text-sm text-muted">{t("history.grid.record.none", { name: record.name, year })}</p>
              ) : (
                <ul className="card divide-y divide-line text-sm">
                  {record.sets.map((s, i) => (
                    <li key={s.setId} className="flex flex-col px-4 py-2">
                      {record.sets[i - 1]?.majorSlug !== s.majorSlug && (
                        <Link href={majorHref(s.majorSlug)} className="pb-1 text-meta font-semibold text-muted hover:underline">{grid.majorNames.get(s.majorSlug) ?? s.majorSlug}</Link>
                      )}
                      <span className="flex items-baseline gap-2">
                        <span className={`w-12 shrink-0 font-semibold ${s.won ? "text-success" : "text-danger"}`}>{s.won ? t("history.grid.record.won") : t("history.grid.record.lost")}</span>
                        <span className="tabular-nums">{s.myScore ?? "?"}–{s.oppScore ?? "?"}</span>
                        <span className="min-w-0 flex-1 truncate">
                          {s.opp.playerId ? <Link href={`/players/compare?a=${record.playerId}&b=${s.opp.playerId}`} className="hover:underline">{s.opp.name}</Link> : s.opp.name}
                        </span>
                        {s.round && <span className="shrink-0 text-meta text-muted">{s.round}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}
      <p className="text-meta text-muted"><T k="history.source" /></p>
    </>
  );
}

export default function YearHeadToHeadPage(props: PageProps<"/history/head-to-head">) {
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      <Suspense fallback={<CardListSkeleton count={6} />}>
        <YearGrid searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
