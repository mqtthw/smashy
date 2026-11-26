// A weekly series across all its editions: every winner, attendance over time, who has done best,
// and who keeps meeting whom. Opened from any edition; the address settles on the first edition's.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import { MedalCounts } from "@/components/ui/PlaceMark";
import LocalTime from "@/components/ui/LocalTime";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { GAMES } from "@/lib/games";
import { getSeriesPage, seriesRootOf } from "@/lib/hostedSeries";
import { editionLabel, seriesName } from "@/lib/seriesStats";
import { pageMeta } from "@/lib/siteMeta";
import { unixNow } from "@/lib/format";
import { getLang, getT } from "@/lib/i18n/server";
import { ordinalFor } from "@/lib/i18n/ordinal";
import { LangProvider, T } from "@/lib/i18n/client";

export async function generateMetadata({ params }: PageProps<"/host/[id]/series">): Promise<Metadata> {
  const { id } = await params;
  const found = await seriesRootOf(id).catch(() => null);
  if (!found || found.event.removed) return { title: "Series not found" };
  const name = seriesName(found.event.name);
  return pageMeta(`${name}: the series`, `Every edition of ${name} on Smashy: winners, attendance, the medal table and rivalries.`);
}


async function Series({ params }: { params: PageProps<"/host/[id]/series">["params"] }) {
  const { id } = await params;
  const found = await seriesRootOf(id);
  if (!found || found.event.removed) notFound();
  if (found.root !== id) redirect(`/host/${found.root}/series`);
  const [page, t, lang] = await Promise.all([getSeriesPage(found.root, found.event.hostId), getT(), getLang()]);
  if (!page) notFound();
  const ordinal = (n: number) => ordinalFor(lang, n);
  const { latest, editions, summary, players, rivalries: rivals, names, teams } = page;
  const name = seriesName(latest.name);
  const count = (n: number) => t(teams ? "event.pic.teams" : "event.pic.players", { n });
  const finished = editions.filter((e) => e.status === "completed");
  const next = editions.find((e) => (e.status === "open" || e.status === "closed") && Date.parse(e.startsAt) > unixNow() * 1000 - 6 * 3600_000);
  const live = editions.find((e) => e.status === "in_progress");
  // Attendance: the latest 12 finished editions, as bars scaled to the best of them.
  const recent = finished.slice(-12);
  const most = Math.max(1, ...recent.map((e) => e.entries));
  const streak = summary.streak && summary.streak.wins >= 2 ? names.get(summary.streak.key) : null;

  return (
    <LangProvider lang={lang}>
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 text-meta">
          <span className="badge border border-line font-normal">{GAMES[latest.game].short}</span>
          <span className="badge border border-line font-normal">
            <Icon name="repeat" /> {t("event.series.badge")}
          </span>
        </div>
        <h1 className="text-2xl font-bold">{name}</h1>
        <p className="text-sm text-muted">
          {t("event.series.editions", { n: editions.length })}
          {editions.length > 0 && (
            <>
              {` ${t("event.series.since")} `}
              <LocalTime iso={editions[0].startsAt} style="date" />
            </>
          )}
          {" · "}
          {latest.online ? (latest.region ?? t("event.series.online")) : (latest.location ?? t("event.series.inPerson"))}
        </p>
        {page.host && (
          <Link href={`/u/${page.host.handle}`} className="flex items-center gap-2 self-start text-sm text-muted hover:text-foreground">
            <Avatar name={page.host.tag} src={page.host.avatarUrl} size="sm" />
            {t("event.series.hostedBy")} <b className="text-foreground">{page.host.tag}</b>
          </Link>
        )}
      </header>

      {(live ?? next) && (
        <Link href={`/host/${(live ?? next)!.id}`} className="card flex items-center gap-3 p-4 hover:bg-surface">
          <Icon name={live ? "video" : "calendar"} className="text-2xl text-muted" />
          <span className="min-w-0 flex-1">
            <span className="block font-bold">{live ? t("event.series.liveNow", { name: live.name }) : t("event.series.nextUp", { name: next!.name })}</span>
            <span className="block text-meta text-muted">
              <LocalTime iso={(live ?? next)!.startsAt} style="dayDateTime" /> · {t(live ? "event.series.playingN" : "event.screen.signedUp", { n: (live ?? next)!.entries })}
            </span>
          </span>
          <b className="shrink-0 text-brand">{live ? t("event.series.watch") : t("event.series.signUp")}</b>
        </Link>
      )}

      {summary.held > 0 && (
        <section className="card grid grid-cols-2 gap-3 p-4 sm:grid-cols-4" aria-label={t("event.series.numbers")}>
          <div>
            <p className="text-2xl font-bold tabular-nums">{summary.held}</p>
            <p className="text-meta text-muted">{t("event.series.played", { n: summary.held })}</p>
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums">{summary.average}</p>
            <p className="text-meta text-muted">{t(teams ? "event.series.avgTeams" : "event.series.avgPlayers")}</p>
          </div>
          {summary.record && (
            <div>
              <p className="text-2xl font-bold tabular-nums">{summary.record.entries}</p>
              <p className="text-meta text-muted">{t("event.series.most", { label: summary.record.label })}</p>
            </div>
          )}
          <div>
            <p className="text-2xl font-bold tabular-nums">{summary.winners}</p>
            <p className="text-meta text-muted">{t("event.series.winners", { n: summary.winners })}</p>
          </div>
        </section>
      )}
      {streak && summary.streak && (
        <p className="text-sm">
          <b>{streak.name}</b> {t("event.series.streak", { n: summary.streak.wins })}
        </p>
      )}

      {recent.length > 1 && (
        <section className="card flex flex-col gap-2 p-4" aria-labelledby="attendance">
          <h2 id="attendance" className="font-bold">{t("event.series.attendance")}</h2>
          <ol className="flex flex-col gap-1">
            {recent.map((e) => (
              <li key={e.id} className="flex items-center gap-2 text-sm">
                <span className="w-12 shrink-0 font-mono text-meta text-muted">{editionLabel(e.name, editions.indexOf(e))}</span>
                <span className="h-4 rounded bg-brand/70" style={{ width: `${Math.max(4, (e.entries / most) * 75)}%` }} aria-hidden="true" />
                <span className="shrink-0 tabular-nums">
                  {e.entries}
                  <span className="sr-only"> {count(e.entries)}</span>
                </span>
              </li>
            ))}
          </ol>
          {finished.length > recent.length && <p className="text-meta text-muted">{t("event.series.latest", { n: recent.length })}</p>}
        </section>
      )}

      {players.length > 0 && (
        <section className="flex flex-col gap-2" aria-labelledby="leaderboard">
          <h2 id="leaderboard" className="font-bold">{t("event.series.best")}</h2>
          <p className="text-meta text-muted">
            {t(teams ? "event.series.bestHelpTeams" : "event.series.bestHelpPlayers")}
          </p>
          <ol className="card divide-y divide-line">
            {players.slice(0, 20).map((p, i) => (
              <li key={p.key} className="flex items-center gap-3 px-4 py-2 text-sm">
                <span className="w-6 text-right font-mono tabular-nums text-muted">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-semibold">
                  {p.handle ? <Link href={`/u/${p.handle}`} className="hover:underline">{p.name}</Link> : p.name}
                </span>
                <span className="shrink-0">
                  <MedalCounts gold={p.gold} silver={p.silver} bronze={p.bronze} />
                </span>
                <span className="w-28 shrink-0 text-right text-meta text-muted">
                  {p.best ? `${t("event.series.bestPlace", { place: ordinal(p.best) })} · ` : ""}
                  {t("event.series.times", { n: p.editions })}
                </span>
              </li>
            ))}
          </ol>
          {players.length > 20 && <p className="text-meta text-muted">{t(teams ? "event.series.allTeams" : "event.series.allPlayers", { n: players.length })}</p>}
        </section>
      )}

      {rivals.length > 0 && (
        <section className="card flex flex-col gap-1 p-4" aria-labelledby="rivalries">
          <h2 id="rivalries" className="font-bold">{t("event.series.rivalries")}</h2>
          <p className="text-meta text-muted">{t("event.series.rivalriesHelp")}</p>
          <ul className="divide-y divide-line">
            {rivals.map((r) => (
              <li key={`${r.a}|${r.b}`} className="flex items-center gap-2 py-1.5 text-sm">
                <span className={`min-w-0 flex-1 truncate ${r.aWins > r.bWins ? "font-semibold" : ""}`}>{r.aName}</span>
                <span className="shrink-0 font-mono tabular-nums">
                  {r.aWins}–{r.bWins}
                </span>
                <span className={`min-w-0 flex-1 truncate text-right ${r.bWins > r.aWins ? "font-semibold" : ""}`}>{r.bName}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2" aria-labelledby="editions">
        <h2 id="editions" className="font-bold">{t("event.series.every")}</h2>
        <ol className="card divide-y divide-line">
          {[...editions].reverse().map((e) => (
            <li key={e.id}>
              <Link href={`/host/${e.id}`} className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-surface">
                <span className="w-12 shrink-0 font-mono text-meta text-muted">{editionLabel(e.name, editions.indexOf(e))}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">
                    {e.winner ? (
                      <>
                        <Icon name="trophy" className="text-[var(--gold)]" /> <b>{e.winner.name}</b>
                      </>
                    ) : e.status === "canceled" ? (
                      <span className="text-muted">{t("event.series.canceled")}</span>
                    ) : e.status === "in_progress" ? (
                      <span className="text-brand">{t("event.series.live")}</span>
                    ) : e.status === "completed" ? (
                      <span className="text-muted">{t("event.series.finished")}</span>
                    ) : (
                      <span className="text-muted">{t(e.status === "open" ? "event.series.open" : "event.series.closed")}</span>
                    )}
                  </span>
                  <span className="block text-meta text-muted">
                    <LocalTime iso={e.startsAt} style="date" /> · {count(e.entries)}
                  </span>
                </span>
                <span aria-hidden="true" className="text-muted">›</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </LangProvider>
  );
}

export default function SeriesPage(props: PageProps<"/host/[id]/series">) {
  return (
    <section className="flex flex-col gap-4 p-4">
      <Link href="/events" className="text-sm text-muted hover:text-foreground"><T k="event.series.back" /></Link>
      <Suspense fallback={<PageSkeleton />}>
        <Series params={props.params} />
      </Suspense>
    </section>
  );
}
