import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import BracketView from "@/components/brackets/BracketView";
import GameBadge from "@/components/GameBadge";
import BracketLive from "@/components/host/BracketLive";
import OnNow from "@/components/host/OnNow";
import Results from "@/components/host/Results";
import Icon from "@/components/ui/Icon";
import ShareButton from "@/components/ui/ShareButton";
import MySetButton from "@/components/host/MySetButton";
import NextUpCard from "@/components/host/NextUpCard";
import OutNote from "@/components/host/OutNote";
import { currentSetFor, knockedOut } from "@/lib/bracketEngine";
import { feederStatus } from "@/lib/feederStatus";
import type { LiveState } from "@/lib/liveSet";
import { createClient } from "@/lib/supabase/server";
import { GAMES } from "@/lib/games";
import { RememberBracket } from "@/components/brackets/RecentBrackets";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { bracketParts, bracketPlayers, bracketResults, connectCodeFor, firstPartResults, liveGameScores, loadEngineSets, pickPart, reportedSetIds, setStations, toBracket } from "@/lib/hostedBracket";
import { getHostedEvent, formatSummary } from "@/lib/hostedEvents";
import { ownPictureMeta } from "@/lib/siteMeta";
import { getUserId } from "@/lib/supabase/server";
import { entryIdFor } from "@/lib/hostedTeams";
import { LangProvider } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";
import { localRound } from "@/lib/i18n/rounds";
import NewTab from "@/components/ui/NewTab";

async function myFinalReported(setId: string, slot: "1" | "2"): Promise<boolean> {
  const { data } = await (await createClient()).from("hosted_sets").select("live").eq("id", setId).maybeSingle();
  return !!(data?.live as LiveState | null)?.finals?.[slot];
}

export async function generateMetadata({ params }: PageProps<"/host/[id]/bracket">): Promise<Metadata> {
  const { id } = await params;
  const e = await getHostedEvent(id).catch(() => null);
  if (!e || e.removed) return { title: "Bracket not found" };
  // The preview picture: the results picture once the event is over, else the event's own card
  // (named here: this page's preview text would otherwise drop the card it inherits).
  const picture = e.status === "completed" ? `/host/${e.id}/top8.png` : `/host/${e.id}/opengraph-image`;
  return ownPictureMeta(`${e.name} bracket`, `${formatSummary(e)} bracket for ${e.name} on Smashy.`, {
    openGraph: { title: `${e.name} bracket`, siteName: "Smashy", type: "website", images: [{ url: picture, width: 1200, height: 630, alt: e.name }] },
    twitter: { card: "summary_large_image", images: [picture] },
  });
}

async function HostedBracket({ params, searchParams }: PageProps<"/host/[id]/bracket">) {
  const [{ id }, { group }] = await Promise.all([params, searchParams]);
  const event = await getHostedEvent(id);
  if (!event) notFound();
  const [sets, userId, t, lang] = await Promise.all([loadEngineSets(event.id), getUserId(), getT(), getLang()]);
  // The id you play under: your own in singles, your team's in doubles.
  const myId = await entryIdFor(event, userId);
  const mySet = myId ? currentSetFor(sets, myId) : undefined;
  if (!sets.length) {
    return (
      <LangProvider lang={lang}>
        <div className="flex flex-col gap-2 p-4">
          <Link href={`/host/${event.id}`} className="text-sm text-muted hover:text-foreground">← {event.name}</Link>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold">
            {event.name} <GameBadge game={event.game} />
          </h1>
          <p className="text-muted">{t("hostbracket.page.notStarted")}</p>
        </div>
      </LangProvider>
    );
  }
  const players = await bracketPlayers(event.id);
  // The parts to pick between: several pools, or pools/Swiss and the final bracket (shown by default once it exists).
  const parts = bracketParts(event, sets);
  const pool = pickPart(parts, typeof group === "string" ? group : null);
  const bracket = toBracket(event, sets, players, pool);
  let stations: Record<string, string> = {};
  if (event.status === "in_progress") {
    const [reported, stationOf] = await Promise.all([reportedSetIds(event.id).catch(() => new Set<string>()), setStations(event.id).catch(() => ({}) as Record<string, string>)]);
    for (const r of bracket.rounds)
      for (const x of r.sets) {
        if (reported.has(x.id)) x.reported = true;
        if (stationOf[x.id]) x.setup = stationOf[x.id];
      }
    stations = stationOf;
  }
  // What goes under "Standings": the pools' or Swiss rounds' table while that part is on screen (also
  // after the final bracket has started), and everyone's placement once the event is over.
  const onFirstPart = pool !== null || !sets.some((s) => s.bracket !== "RR" && s.bracket !== "SW");
  const results = (!bracket.finished && onFirstPart ? firstPartResults(event, sets) : null) ?? bracketResults(event, sets);
  // Waiting for my next opponent (no set called for me right now): who, and the set that decides it.
  const pending = myId && !mySet && event.status === "in_progress" ? sets.find((s) => s.state === "waiting" && (s.p[0].id === myId || s.p[1].id === myId)) : undefined;
  const iAmOut = !!myId && event.status === "in_progress" && !mySet && !pending && sets.some((x) => knockedOut(sets, x) === myId);
  const pendingLabel = pending ? (toBracket(event, sets, players, pending.pool).rounds.flatMap((r) => r.sets).find((x) => x.id === pending.key)?.waitingOn.find((w) => w) ?? null) : null;
  const myOpponent = mySet ? (players.get((mySet.p[0].id === myId ? mySet.p[1].id : mySet.p[0].id) ?? "")?.tag ?? t("event.yourOpponent")) : null;
  // Did I already report my set's final score? (The set's "📝 reported" mark is only for the set as a whole.)
  const opponentId = mySet ? (mySet.p[0].id === myId ? mySet.p[1].id : mySet.p[0].id) : null;
  // My report, and (online, opponent with an account) their connect code, read together.
  const [myReported, opponentCode, liveScores] = await Promise.all([
    mySet ? myFinalReported(mySet.key, mySet.p[0].id === myId ? "1" : "2") : Promise.resolve(false),
    mySet && event.online && opponentId && players.get(opponentId)?.handle
      ? connectCodeFor(event.id, opponentId).catch(() => undefined)
      : Promise.resolve(undefined),
    !bracket.finished ? liveGameScores(event.id).catch(() => ({}) as Record<string, [number, number]>) : Promise.resolve({} as Record<string, [number, number]>),
  ]);

  // A set being played shows its games so far in its bracket box (the final score is only saved at the end).
  for (const r of bracket.rounds)
    for (const x of r.sets) {
      const games = x.state === "live" ? liveScores[x.id] : undefined;
      if (games) x.players.forEach((p, i) => p && (p.score = games[i]));
    }

  const tagOf = (pid: string | null) => (pid ? (players.get(pid)?.tag ?? t("event.player")) : t("event.tbd"));

  return (
    <LangProvider lang={lang}>
      {!bracket.finished && event.status === "in_progress" && <BracketLive eventId={event.id} />}
      <RememberBracket path={`/host/${event.id}/bracket`} title={event.name} sub={`On Smashy · ${GAMES[event.game].short}`} />
      <header className="flex flex-col gap-1 px-4 pt-4">
        <Link href={`/host/${event.id}`} className="text-sm text-muted hover:text-foreground">← {event.name}</Link>
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold">
          {event.name} <GameBadge game={event.game} />
        </h1>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted">{formatSummary(event, t)} · {t("hostbracket.page.players", { n: new Set(sets.flatMap((s) => s.p.map((x) => x.id).filter(Boolean))).size })}{bracket.finished ? ` · ${t("event.status.completed")}` : ""}</p>
          <ShareButton path={`/host/${event.id}/bracket`} title={t("hostbracket.page.title", { name: event.name })} label={t("hostbracket.page.share")} className="btn btn-sm btn-ghost" />
        </div>
        {iAmOut && <OutNote eventId={event.id} game={event.game} online={event.online} onBracket className="mt-2" />}
        {pending && pendingLabel && (
          <NextUpCard
            setId={pending.key}
            identifier={pending.identifier}
            waitingOn={pendingLabel}
            feeder={feederStatus(sets, pending.key, { tag: tagOf, scores: liveScores, setups: stations })}
            className="mt-2"
          />
        )}
        {mySet && <MySetButton setId={mySet.key} opponent={myOpponent ?? t("event.yourOpponent")} setup={stations[mySet.key] ?? null} reported={myReported} opponentCode={opponentCode} className="mt-2" />}
        {parts.length > 1 && (
          <nav aria-label={t("hostbracket.page.parts")} className="mt-2 flex flex-wrap gap-2">
            {parts.map((p) => (
              <Link key={p.id} href={`/host/${event.id}/bracket?group=${p.id}`} aria-current={p.pool === pool ? "page" : undefined} className="chip">{localRound(p.label, t)}</Link>
            ))}
          </nav>
        )}
      </header>
      {(bracket.finished || results.kind !== "elimination") && (
        <section className="flex flex-col gap-2 px-4 pt-4" aria-labelledby="results">
          <h2 id="results" className="font-bold">
            {bracket.finished ? t("hostbracket.page.results") : t("hostbracket.page.standings")}
            {!bracket.finished && results.kind === "swiss" && <span className="font-normal text-muted">{t("hostbracket.page.roundOf", { round: results.round, rounds: results.rounds })}</span>}
          </h2>
          {!bracket.finished && results.kind === "swiss" && results.roundDone && (
            <p className="text-sm text-muted">{t("hostbracket.page.roundDone", { round: results.round, next: results.round + 1 })}</p>
          )}
          {!bracket.finished && results.kind === "swiss" && !results.roundDone && !!myId && sets.some((s) => s.bracket === "SW" && s.round === results.round && s.state === "bye" && s.p[0].id === myId) && (
            <p className="text-sm">{t("hostbracket.page.bye")}</p>
          )}
          <Results results={results} players={players} />
          {bracket.finished && (
            <p className="text-sm text-muted">
              <Icon name="file" /> {t("hostbracket.page.forRanking")}{" "}
              <a href={`/host/${event.id}/results.json`} target="_blank" rel="noopener" className="link">results.json<NewTab /></a>
              {" · "}
              <Link href="/host/results-file" className="link">{t("hostbracket.page.aboutFile")}</Link>
            </p>
          )}
        </section>
      )}
      {!bracket.finished && <OnNow sets={sets} scores={liveScores} stations={stations} tagOf={tagOf} className="mx-4 mt-4" />}
      <div className="pt-4">
        <BracketView bracket={bracket} myName={myId && sets.some((s) => s.p[0].id === myId || s.p[1].id === myId) ? (players.get(myId)?.tag ?? null) : null} />
      </div>
    </LangProvider>
  );
}

export default function HostedBracketPage(props: PageProps<"/host/[id]/bracket">) {
  return (
    <section>
      <Suspense fallback={<CardListSkeleton label="Loading bracket…" className="p-4" />}>
        <HostedBracket params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
