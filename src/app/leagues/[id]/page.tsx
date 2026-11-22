// One league (step L1): what it is, who runs it, sign up or leave, and who has signed up.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import GameBadge from "@/components/GameBadge";
import Avatar from "@/components/ui/Avatar";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { formatEventDate, unixNow } from "@/lib/format";
import { LangProvider } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";
import { currentWeek, getLeague, getLeaguePlayers, getLeagueSets, type LeagueSet } from "@/lib/leagues";
import { connection } from "next/server";
import { clip } from "@/lib/siteMeta";
import { getUserId } from "@/lib/supabase/server";
import { JoinLeagueButton, RemovePlayerButton } from "../parts";
import { MyLeagueSet } from "../weekly";
import { startDirect } from "@/app/messages/actions";
import { divisionStandings } from "@/lib/leagueStandings";

export async function generateMetadata({ params }: PageProps<"/leagues/[id]">): Promise<Metadata> {
  const league = await getLeague((await params).id).catch(() => null);
  if (!league || league.removed) return { title: "League" };
  return { title: league.name, description: clip(league.description ?? `A ${league.weeks}-week league on Smashy.`, 200) };
}

async function LeagueContent({ params }: { params: PageProps<"/leagues/[id]">["params"] }) {
  const { id } = await params;
  const [league, userId, t, lang] = await Promise.all([getLeague(id), getUserId(), getT(), getLang()]);
  if (!league) notFound();
  const [players, sets] = await Promise.all([getLeaguePlayers(league.id), league.status === "signups" ? Promise.resolve([] as LeagueSet[]) : getLeagueSets(league.id)]);
  if (sets.length) await connection(); // "this week" depends on today
  const nowMs = sets.length ? unixNow() * 1000 : 0;
  const isHost = userId === league.hostId;
  const joined = !!userId && players.some((p) => p.userId === userId);
  const start = formatEventDate(Date.parse(league.startsAt) / 1000, league.timezone, lang);
  return (
    <LangProvider lang={lang}>
      <header className="flex flex-col gap-2">
        <Link href="/leagues" className="text-sm text-muted hover:underline">← {t("league.title")}</Link>
        <div className="flex flex-wrap items-center gap-2">
          <GameBadge game={league.game} />
          <span className="text-meta text-muted">{t(`league.status.${league.status}`)}</span>
        </div>
        <h1 className="text-2xl font-bold">{league.name}</h1>
        <p className="text-sm text-muted">
          {t("league.startsWeeks", { date: start, n: league.weeks })} · {t("league.bestOf", { n: league.bestOf })}
          {" · "}
          {league.online ? t("league.field.online") : league.location}
        </p>
        <p className="text-sm text-muted">
          {league.playoffSize ? t("league.playoffsTop", { n: league.playoffSize }) : t("league.noPlayoffs")}
        </p>
        {league.host && (
          <Link href={`/u/${league.host.handle}`} className="flex items-center gap-2 self-start text-sm text-muted hover:text-foreground">
            <Avatar name={league.host.tag} src={league.host.avatarUrl} size="sm" />
            {t("league.organizer")} <b className="text-foreground">{league.host.tag}</b>
          </Link>
        )}
      </header>
      {league.description && <p className="whitespace-pre-wrap text-sm">{league.description}</p>}

      {league.status === "signups" && !league.removed && (
        <section className="card flex flex-col gap-2 p-4">
          <p className="font-semibold">{t("league.signupsOpen", { n: league.playerCount, cap: league.playerCap })}</p>
          {userId ? (
            !isHost && <JoinLeagueButton id={league.id} joined={joined} />
          ) : (
            <Link href={`/signin?next=${encodeURIComponent(`/leagues/${league.id}`)}`} className="btn btn-md btn-primary self-start">{t("league.signInToJoin")}</Link>
          )}
          <p className="text-meta text-muted">{t("league.howItWorks")}</p>
          {isHost && (
            <Link href={`/leagues/${league.id}/manage`} className="btn btn-md btn-outline self-start">{t("league.manage.open")}</Link>
          )}
        </section>
      )}
      {sets.length > 0 && userId && (() => {
        // Your set this week (step L3): the newest week up to now that has a set for you.
        const week = Math.max(1, currentWeek(league.startsAt, league.weeks, nowMs));
        const mine = sets.filter((s) => s.week <= week && (s.p1Id === userId || s.p2Id === userId)).sort((a, b) => b.week - a.week)[0];
        if (!mine) return null;
        const meFirst = mine.p1Id === userId;
        const opp = players.find((p) => p.userId === (meFirst ? mine.p2Id : mine.p1Id));
        const shown = mine.p1Score !== null && mine.p2Score !== null ? (meFirst ? { mine: mine.p1Score, theirs: mine.p2Score } : { mine: mine.p2Score, theirs: mine.p1Score }) : null;
        return (
          <section aria-labelledby="my-league-set" className="card flex flex-col gap-2 p-4">
            <h2 id="my-league-set" className="font-bold">{t(mine.week === week ? "league.my.title" : "league.my.titleWeek", { n: mine.week })}</h2>
            <p className="text-sm">
              {t("league.my.vs")} {opp ? <Link href={`/u/${opp.handle}`} className="font-semibold hover:underline">{opp.tag}</Link> : t("league.hiddenPlayer")}
              <span className="text-muted"> · {t("league.closes", { date: formatEventDate(Date.parse(mine.deadline) / 1000, league.timezone, lang) })}</span>
            </p>
            {opp && mine.state === "pending" && (
              <form action={async () => { "use server"; await startDirect(opp.userId); }}>
                <button className="btn btn-sm btn-outline">{t("league.my.message", { tag: opp.tag })}</button>
              </form>
            )}
            <MyLeagueSet leagueId={league.id} setId={mine.id} bestOf={league.bestOf} state={mine.state} reportedByMe={mine.reportedBy === userId} shownScore={shown} oppTag={opp?.tag ?? t("league.hiddenPlayer")} />
          </section>
        );
      })()}
      {sets.length > 0 && <Standings players={players} sets={sets} t={t} playoffSize={league.playoffSize} />}
      {sets.length > 0 && <Schedule league={league} players={players} sets={sets} t={t} lang={lang} nowMs={nowMs} />}

      <section aria-labelledby="league-players" className="flex flex-col gap-2">
        <h2 id="league-players" className="font-bold">{t("league.players", { n: players.length })}</h2>
        {players.length ? (
          <ul className="card divide-y divide-line">
            {players.map((p) => (
              <li key={p.userId} className="flex items-center gap-2 px-3 py-2">
                <Link href={`/u/${p.handle}`} className="flex min-w-0 items-center gap-2 hover:underline">
                  <Avatar name={p.tag} src={p.avatarUrl} size="sm" />
                  <span className="truncate">{p.tag}</span>
                </Link>
                {isHost && league.status === "signups" && <span className="ml-auto"><RemovePlayerButton id={league.id} person={p.userId} tag={p.tag} /></span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="card p-4 text-sm text-muted">{t("league.noPlayers")}</p>
        )}
      </section>
    </LangProvider>
  );
}

/** Each division's standings (step L4): wins, then head to head, then game difference. */
function Standings({ players, sets, t, playoffSize }: { players: { userId: string; tag: string; handle: string; division: number | null }[]; sets: LeagueSet[]; t: Awaited<ReturnType<typeof getT>>; playoffSize: number | null }) {
  const divisions = [...new Set(sets.map((s) => s.division))].sort((a, b) => a - b);
  const byId = new Map(players.map((p) => [p.userId, p]));
  return (
    <section aria-labelledby="league-standings" className="flex flex-col gap-3">
      <h2 id="league-standings" className="font-bold">{t("league.standings")}</h2>
      {divisions.map((d) => {
        const ids = [...new Set(sets.filter((s) => s.division === d).flatMap((s) => [s.p1Id, s.p2Id]))];
        const rows = divisionStandings(ids, sets.filter((s) => s.division === d), (id) => byId.get(id)?.tag ?? "");
        return (
          <div key={d} className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold">{t("league.division", { n: d })}</h3>
            <table className="card w-full text-sm">
              <thead className="text-meta text-muted">
                <tr><th className="px-3 py-1 text-left">#</th><th className="px-1 py-1 text-left">{t("league.col.player")}</th><th className="px-1 py-1">{t("league.col.record")}</th><th className="px-3 py-1">{t("league.col.games")}</th></tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const p = byId.get(r.userId);
                  const inPlayoffs = !!playoffSize && i < playoffSize;
                  return (
                    <tr key={r.userId} className="border-t border-line">
                      <td className={`px-3 py-1.5 ${inPlayoffs ? "font-bold text-brand" : "text-muted"}`}>{i + 1}</td>
                      <td className="px-1 py-1.5">{p ? <Link href={`/u/${p.handle}`} className="hover:underline">{p.tag}</Link> : t("league.hiddenPlayer")}</td>
                      <td className="px-1 py-1.5 text-center font-mono">{r.wins}–{r.losses}</td>
                      <td className="px-3 py-1.5 text-center font-mono text-muted">{r.gamesFor - r.gamesAgainst > 0 ? "+" : ""}{r.gamesFor - r.gamesAgainst}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
      {playoffSize && <p className="text-meta text-muted">{t("league.playoffLine", { n: playoffSize })}</p>}
    </section>
  );
}

/** Divisions and their weekly pairings (step L2): this week first, the whole schedule folded below. */
function Schedule({ league, players, sets, t, lang, nowMs }: { league: { startsAt: string; weeks: number; timezone: string }; players: { userId: string; tag: string; handle: string }[]; sets: LeagueSet[]; t: Awaited<ReturnType<typeof getT>>; lang: string; nowMs: number }) {
  const week = Math.max(1, currentWeek(league.startsAt, league.weeks, nowMs));
  const name = new Map(players.map((p) => [p.userId, p]));
  const who = (id: string) => {
    const p = name.get(id);
    return p ? <Link href={`/u/${p.handle}`} className="font-semibold hover:underline">{p.tag}</Link> : <span className="text-muted">{t("league.hiddenPlayer")}</span>;
  };
  const divisions = [...new Set(sets.map((s) => s.division))].sort((a, b) => a - b);
  const row = (s: LeagueSet) => (
    <li key={s.id} className="flex items-center gap-2 px-3 py-2 text-sm">
      {who(s.p1Id)}
      <span className="text-muted">{s.p1Score !== null && s.p2Score !== null ? `${s.p1Score}–${s.p2Score}` : "vs"}</span>
      {who(s.p2Id)}
    </li>
  );
  const deadline = sets.find((s) => s.week === week)?.deadline;
  return (
    <section aria-labelledby="league-week" className="flex flex-col gap-3">
      <h2 id="league-week" className="font-bold">
        {t("league.week", { n: week, total: league.weeks })}
        {deadline && <span className="ml-2 text-meta font-normal text-muted">{t("league.closes", { date: formatEventDate(Date.parse(deadline) / 1000, league.timezone, lang) })}</span>}
      </h2>
      {divisions.map((d) => {
        const thisWeek = sets.filter((s) => s.division === d && s.week === week);
        return (
          <div key={d} className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold">{t("league.division", { n: d })}</h3>
            <ul className="card divide-y divide-line">{thisWeek.length ? thisWeek.map(row) : <li className="px-3 py-2 text-sm text-muted">{t("league.noSetsThisWeek")}</li>}</ul>
          </div>
        );
      })}
      <details className="card p-3">
        <summary className="cursor-pointer text-sm font-semibold">{t("league.fullSchedule")}</summary>
        {Array.from({ length: league.weeks }, (_, i) => i + 1).map((w) => (
          <div key={w} className="mt-3 flex flex-col gap-1">
            <h3 className="text-sm font-semibold">{t("league.week", { n: w, total: league.weeks })}</h3>
            {divisions.map((d) => (
              <ul key={d} className="divide-y divide-line">
                <li className="px-3 pt-1 text-meta text-muted">{t("league.division", { n: d })}</li>
                {sets.filter((s) => s.week === w && s.division === d).map(row)}
              </ul>
            ))}
          </div>
        ))}
      </details>
    </section>
  );
}

export default function LeaguePage(props: PageProps<"/leagues/[id]">) {
  return (
    <section className="mx-auto flex max-w-xl flex-col gap-4 p-4">
      <Suspense fallback={<CardListSkeleton count={3} label="Loading league…" />}>
        <LeagueContent params={props.params} />
      </Suspense>
    </section>
  );
}
