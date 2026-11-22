// The organizer's page (league step L2): seeds and divisions, then starting the league.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { LangProvider } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";
import { getLeague, getLeaguePlayers, getLeagueSets } from "@/lib/leagues";
import { DeleteLeague, SettleSet } from "../../weekly";
import { getUserId } from "@/lib/supabase/server";
import Setup from "./Setup";

export const metadata: Metadata = { title: "Set up the league", robots: { index: false } };

async function Manage({ params }: { params: PageProps<"/leagues/[id]/manage">["params"] }) {
  const { id } = await params;
  const [league, userId, t, lang] = await Promise.all([getLeague(id), getUserId(), getT(), getLang()]);
  if (!league) notFound();
  if (!userId) redirect(`/signin?next=${encodeURIComponent(`/leagues/${id}/manage`)}`);
  if (userId !== league.hostId) redirect(`/leagues/${id}`);
  const players = await getLeaguePlayers(league.id);
  return (
    <LangProvider lang={lang}>
      <header className="flex flex-col gap-1">
        <Link href={`/leagues/${league.id}`} className="text-sm text-muted hover:underline">← {league.name}</Link>
        <h1 className="text-2xl font-bold">{t(league.status === "signups" ? "league.manage.title" : "league.manage.titleRunning")}</h1>
        <p className="text-sm text-muted">{t("league.manage.intro")}</p>
      </header>
      {league.status === "signups" ? (
        <Setup id={league.id} players={players.map((p) => ({ userId: p.userId, tag: p.tag, seed: p.seed, division: p.division }))} />
      ) : league.status === "running" ? (
        <Settle leagueId={league.id} bestOf={league.bestOf} players={players} />
      ) : (
        <p className="card p-4 text-sm">{t("league.manage.alreadyStarted")}</p>
      )}
      <DeleteLeague id={league.id} name={league.name} />
    </LangProvider>
  );
}

/** Running league (step L3): every set, disputed ones first, each with the organizer's settle controls. */
async function Settle({ leagueId, bestOf, players }: { leagueId: string; bestOf: number; players: { userId: string; tag: string }[] }) {
  const [sets, t] = await Promise.all([getLeagueSets(leagueId), getT()]);
  const tag = (id: string) => players.find((p) => p.userId === id)?.tag ?? t("league.hiddenPlayer");
  const order = (s: { state: string }) => (s.state === "disputed" ? 0 : s.state === "pending" || s.state === "reported" ? 1 : 2);
  const list = [...sets].sort((a, b) => order(a) - order(b) || a.week - b.week || a.division - b.division);
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-bold">{t("league.settle.title")}</h2>
      <p className="text-meta text-muted">{t("league.settle.intro")}</p>
      <ul className="card divide-y divide-line">
        {list.map((s) => (
          <li key={s.id} className="flex flex-col gap-1 px-3 py-2">
            <span className="text-sm">
              <span className="text-meta text-muted">{t("league.weekShort", { n: s.week })} · {t("league.division", { n: s.division })} · </span>
              <b>{tag(s.p1Id)}</b> {s.p1Score !== null && s.p2Score !== null ? `${s.p1Score}–${s.p2Score}` : "vs"} <b>{tag(s.p2Id)}</b>
              <span className={`ml-2 text-meta ${s.state === "disputed" ? "text-danger" : "text-muted"}`}>{t(`league.state.${s.state}`)}</span>
            </span>
            <SettleSet leagueId={leagueId} setId={s.id} bestOf={bestOf} p1={tag(s.p1Id)} p2={tag(s.p2Id)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function ManageLeaguePage(props: PageProps<"/leagues/[id]/manage">) {
  return (
    <section className="mx-auto flex max-w-xl flex-col gap-4 p-4">
      <Suspense fallback={null}>
        <Manage params={props.params} />
      </Suspense>
    </section>
  );
}
