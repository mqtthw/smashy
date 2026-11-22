// The commentator page: for casters, the set on stream with what's worth saying about both players:
// their seed, their run through this bracket, their record on Smashy, their head-to-head, and how
// they did last time in this series. It follows the same set as the score overlay (the one on the
// "Stream" setup, else the deepest being played), or any set picked from the list. It updates
// itself as results come in. Only shows what the bracket and profiles already show to everyone.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import BracketLive from "@/components/host/BracketLive";
import Icon from "@/components/ui/Icon";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { scoreLine } from "@/lib/brackets/score";
import { pathRecord, playerPath } from "@/lib/commentary";
import { bracketPlayers, loadEngineSets, setStations, toBracket, type PlayerInfo } from "@/lib/hostedBracket";
import { getHeadToHead, getHostedEvent, getHostedRecords, getPlacementsFrom, getSeriesEditions } from "@/lib/hostedEvents";
import { liveScore, type LiveState } from "@/lib/liveSet";
import { pickStreamSet } from "@/lib/streamSet";
import { createClient } from "@/lib/supabase/server";
import { getLang, getT } from "@/lib/i18n/server";
import { localRound } from "@/lib/i18n/rounds";
import { ordinalFor } from "@/lib/i18n/ordinal";
import type { EngineSet } from "@/lib/bracketEngine";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("event.comm.title"), robots: { index: false, follow: false } };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function Commentary({ params, searchParams }: PageProps<"/host/[id]/commentary">) {
  const [{ id }, { set: picked }] = await Promise.all([params, searchParams]);
  const [event, t, lang] = await Promise.all([getHostedEvent(id), getT(), getLang()]);
  if (!event || event.removed) notFound();
  const [sets, players, setups] = await Promise.all([loadEngineSets(event.id), bracketPlayers(event.id), setStations(event.id)]);
  const chosen = typeof picked === "string" && UUID.test(picked) ? sets.find((s) => s.key === picked) : undefined;
  const set: EngineSet | null = chosen ?? pickStreamSet(sets, setups);
  const label = new Map<string, string>();
  for (const pool of new Set(sets.map((s) => s.pool))) for (const r of toBracket(event, sets, players, pool).rounds) for (const s of r.sets) label.set(s.id, localRound(s.roundLabel, t));
  const tag = (pid: string | null) => (pid ? (players.get(pid)?.tag ?? t("event.overlay.player")) : t("event.overlay.tbd"));
  const others = sets
    .filter((s) => (s.state === "ready" || s.state === "live") && s.p[0].id && s.p[1].id && s.key !== set?.key)
    .sort((a, b) => (label.get(a.key) ?? "").localeCompare(label.get(b.key) ?? "") || a.idx - b.idx);

  const head = (
    <header className="flex flex-col gap-1">
      {/* The page's heading (a small line: the set below is what a commentator looks at). */}
      <h1 className="text-meta font-normal text-muted">
        <Link href={`/host/${event.id}`} className="hover:underline">{event.name}</Link> · {t("event.comm.title")}
      </h1>
      <p className="text-meta text-muted">
        {chosen ? (
          <>
            {t("event.comm.picked")} <Link href={`/host/${event.id}/commentary`} className="link">{t("event.comm.follow")}</Link>
          </>
        ) : (
          t("event.comm.follows")
        )}
      </p>
    </header>
  );
  if (!set || !set.p[0].id || !set.p[1].id) {
    return (
      <>
        {head}
        <p className="card p-4 text-sm text-muted">{sets.length ? t("event.comm.noSet") : t("event.comm.notStarted")}</p>
        {sets.length > 0 && event.status === "in_progress" && <BracketLive eventId={event.id} />}
      </>
    );
  }

  const [a, b] = [set.p[0].id, set.p[1].id];
  const supabase = await createClient();
  const [{ data: liveRow }, records, h2h, editions] = await Promise.all([
    supabase.from("hosted_sets").select("live").eq("id", set.key).maybeSingle(),
    getHostedRecords([a, b]).catch(() => ({}) as Awaited<ReturnType<typeof getHostedRecords>>),
    getHeadToHead(a, b).catch(() => [0, 0] as [number, number]),
    event.seriesId ? getSeriesEditions(event).catch(() => []) : Promise.resolve([]),
  ]);
  const live = (liveRow?.live as LiveState | null) ?? null;
  // Last time in this series: the latest finished edition before this one.
  const last = [...editions].reverse().find((e) => e.status === "completed" && e.startsAt < event.startsAt) ?? null;
  const lastPlaces = last
    ? await getPlacementsFrom(last.id, [a, b].map((pid) => ({ userId: pid, tag: tag(pid), guest: !players.get(pid)?.handle }))).catch(() => ({}) as Record<string, number>)
    : {};
  // A finished set through the shared formatter, so a DQ reads "W–DQ" (it was "0–0").
  const score = set.state === "done" ? scoreLine(set.score[0], set.score[1]) : (live?.games ? liveScore(live) : [0, 0]).join("–");

  const side = (pid: string, info: PlayerInfo | undefined) => {
    const path = playerPath(sets, pid).filter((p) => p.key !== set.key);
    const run = pathRecord(path);
    const rec = records[pid];
    const walkIn = !info?.handle;
    return (
      <section className="card flex flex-col gap-2 p-4" aria-label={tag(pid)}>
        <h2 className="text-xl font-bold">
          {info?.handle ? <Link href={`/u/${info.handle}`} className="hover:underline">{tag(pid)}</Link> : tag(pid)}
        </h2>
        <p className="text-sm text-muted">
          {info?.seed ? t("event.comm.seed", { n: info.seed }) : t("event.comm.unseeded")}
          {walkIn ? ` · ${t("event.comm.walkIn")}` : ""}
          {last && lastPlaces[pid] ? ` · ${t("event.comm.lastTime", { place: ordinalFor(lang, lastPlaces[pid]), event: last.name })}` : ""}
        </p>
        <div>
          <p className="text-meta font-semibold uppercase text-muted">{t("event.comm.thisBracket")}</p>
          {path.length ? (
            <>
              <p className="text-sm">{t("event.comm.inSets", { w: run.wins, l: run.losses })}</p>
              <ul className="mt-1 flex flex-col gap-0.5 text-sm">
                {path.map((p) => (
                  <li key={p.key} className="flex items-baseline gap-2">
                    <span className={`w-5 shrink-0 font-bold ${p.won ? "text-success" : "text-danger"}`}>{p.won ? t("event.comm.won") : t("event.comm.lost")}</span>
                    <span className="min-w-0 flex-1 truncate">
                      {tag(p.opponent)} <span className="text-meta text-muted">· {label.get(p.key) ?? ""}</span>
                    </span>
                    <span className="shrink-0 font-mono tabular-nums">{scoreLine(p.score[0], p.score[1])}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted">{t("event.comm.firstSet")}</p>
          )}
        </div>
        {!walkIn && rec && rec.setWins + rec.setLosses > 0 && (
          <div>
            <p className="text-meta font-semibold uppercase text-muted">{t("event.comm.onSmashy")}</p>
            <p className="text-sm">{t("event.comm.record", { w: rec.setWins, l: rec.setLosses, n: rec.events, gw: rec.gameWins, gl: rec.gameLosses })}</p>
          </div>
        )}
      </section>
    );
  };

  return (
    <>
      {head}
      {event.status === "in_progress" && <BracketLive eventId={event.id} />}
      <section className="board flex flex-col gap-1 p-4" aria-label={t("event.comm.theSet")}>
        <p className="text-meta text-muted">
          {label.has(set.key) ? `${label.get(set.key)} · ` : ""}{t("event.comm.setId", { id: set.identifier ?? "" })} · {t("event.details.bestOf", { n: set.bestOf })}
          {setups[set.key] ? ` · ${setups[set.key]}` : ""}
          {set.state === "live" && live?.stage ? ` · ${t("event.comm.gameOn", { n: (live.games?.length ?? 0) + 1, stage: live.stage })}` : ""}
        </p>
        <p className="flex items-center gap-3 text-2xl font-bold">
          <span className={`min-w-0 flex-1 truncate ${set.winner === 1 ? "text-brand" : ""}`}>{tag(a)}</span>
          <span className="shrink-0 font-mono tabular-nums">
            {score}
          </span>
          <span className={`min-w-0 flex-1 truncate text-right ${set.winner === 2 ? "text-brand" : ""}`}>{tag(b)}</span>
        </p>
        <p className="text-sm">
          <Icon name="users" /> {t("event.comm.h2h")}{" "}
          {h2h[0] + h2h[1] > 0 ? (
            <b>
              {tag(a)} {h2h[0]}–{h2h[1]} {tag(b)}
            </b>
          ) : (
            t("event.comm.h2hFirst")
          )}
        </p>
      </section>
      <div className="grid gap-4 sm:grid-cols-2">
        {side(a, players.get(a))}
        {side(b, players.get(b))}
      </div>
      {others.length > 0 && (
        <nav aria-label={t("event.comm.others")} className="card flex flex-col gap-1 p-4">
          <h2 className="font-bold">{t("event.comm.others")}</h2>
          <ul className="divide-y divide-line">
            {others.slice(0, 12).map((s) => (
              <li key={s.key}>
                <Link href={`/host/${event.id}/commentary?set=${s.key}`} className="flex items-center gap-2 py-1.5 text-sm hover:underline">
                  <span className="w-8 font-mono text-muted">{s.identifier}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {tag(s.p[0].id)} vs {tag(s.p[1].id)}
                  </span>
                  <span className="shrink-0 text-meta text-muted">{label.get(s.key)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </>
  );
}

export default function CommentaryPage(props: PageProps<"/host/[id]/commentary">) {
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      <Suspense fallback={<PageSkeleton />}>
        <Commentary params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
