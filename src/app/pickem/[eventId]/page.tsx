// Pick'em for one singles event at a major: make your picks before it starts; after that, everyone's
// picks on a leaderboard, scored from start.gg's final standings once it's over.
import Icon from "@/components/ui/Icon";
import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import GameBadge from "@/components/GameBadge";
import PickForm from "@/components/pickem/PickForm";
import Avatar from "@/components/ui/Avatar";
import LocalTime from "@/components/ui/LocalTime";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { unixNow } from "@/lib/format";
import { CHAMPION_POINTS, crowdPicks, MAX_POINTS, scorePicks, TOP8_POINTS } from "@/lib/pickem";
import { countPicks, getBoard, getMyPick } from "@/lib/pickemPicks";
import { getPickemEvent, getPickemStandings } from "@/lib/pickemStartgg";
import { pageMeta } from "@/lib/siteMeta";
import { getUserId } from "@/lib/supabase/server";
import { LangProvider, T } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";

export async function generateMetadata({ params }: PageProps<"/pickem/[eventId]">): Promise<Metadata> {
  const { eventId } = await params;
  const e = await getPickemEvent(eventId).catch(() => null);
  if (!e) return { title: "Pick'em" };
  return pageMeta(`Pick'em: ${e.tournament} ${e.name}`, `Pick the champion and the top 8 of ${e.tournament}'s ${e.name} on Smashy, and see how your picks stack up.`);
}

// A sentence with one bold part: the phrase is filled with MARK where the bold goes.
const MARK = "\u0001";
function withBold(text: string, bold: ReactNode) {
  return <>{text.split(/(\u0001)/).map((part, i) => (part === MARK ? <b key={i}>{bold}</b> : part))}</>;
}

async function Pickem({ params, searchParams }: PageProps<"/pickem/[eventId]">) {
  const [{ eventId }, sp] = await Promise.all([params, searchParams]);
  const event = await getPickemEvent(eventId).catch(() => undefined);
  if (event === null) notFound();
  const [t, lang] = await Promise.all([getT(), getLang()]);
  if (!event) return <p className="card p-4 text-sm text-muted">{t("play.pickem.cantReach")}</p>;
  if (!event.game || !event.singles) notFound();
  await connection(); // whether picks are locked depends on the current time
  const now = unixNow() * 1000;
  const locked = event.state !== "CREATED" || !event.startAt || event.startAt * 1000 <= now;
  const userId = await getUserId();
  const tagOf = (id: string, tags: Record<string, string> = {}) => tags[id] ?? event.seeds.find((s) => s.playerId === id)?.tag ?? t("play.pickem.player");
  const header = (
    <header className="flex flex-col gap-1">
      <p className="flex flex-wrap items-center gap-2 text-meta text-muted">
        <GameBadge game={event.game} /> {t("play.pickem.headerEntrants", { n: event.entrants })}
      </p>
      <h1 className="text-2xl font-bold">
        {event.tournament}: {event.name}
      </h1>
      <p className="text-sm text-muted">
        {event.state === "COMPLETED" ? (
          t("play.pickem.finalPoints")
        ) : locked ? (
          t("play.pickem.lockedStarted")
        ) : event.startAt ? (
          <>
            {t("play.pickem.locksWhen")} <b className="text-foreground"><LocalTime iso={new Date(event.startAt * 1000).toISOString()} style="dayDateTime" zone /></b>
          </>
        ) : null}
      </p>
    </header>
  );

  if (!locked) {
    const [mine, count] = await Promise.all([getMyPick(event.id, userId), countPicks(event.id)]);
    return (
      <LangProvider lang={lang}>
        {header}
        <p className="text-sm">
          {count === 0 ? t("play.pickem.nobodyYet") : t("play.pickem.count", { n: count })}
        </p>
        {event.seeds.length < 8 ? (
          <p className="card p-4 text-sm text-muted">{t("play.pickem.notSeeded")}</p>
        ) : userId ? (
          <PickForm eventId={event.id} seeds={event.seeds} saved={mine ? { champion: mine.champion, top8: mine.top8 } : null} />
        ) : (
          <div className="card flex flex-col gap-2 p-4">
            <p className="text-sm">{t("play.pickem.guestPitch", { n: event.seeds.length })}</p>
            <Link href={`/signin?next=${encodeURIComponent(`/pickem/${event.id}`)}`} className="btn btn-md btn-primary self-start">{t("play.pickem.signIn")}</Link>
          </div>
        )}
      </LangProvider>
    );
  }

  const placements = event.state === "COMPLETED" ? await getPickemStandings(event.id).catch(() => null) : null;
  const { rows, all } = await getBoard(event.id, userId, placements);
  const following = sp.who === "following" && !!userId;
  const shown = following ? rows.filter((r) => r.followed || r.me) : rows;
  const me = rows.find((r) => r.me);
  const crowd = crowdPicks(all).slice(0, 5);
  return (
    <LangProvider lang={lang}>
      {header}
      {me && (
        <section className="card flex flex-col gap-1 p-4" aria-label={t("play.pickem.yourPicks")}>
          <p className="text-sm">
            {placements ? (
              withBold(
                me.rank === 1
                  ? t("play.pickem.youScoredBest", { points: MARK, max: MAX_POINTS })
                  : t("play.pickem.youScored", { points: MARK, max: MAX_POINTS, rank: me.rank, total: rows.length }),
                me.points,
              )
            ) : (
              t("play.pickem.picksIn")
            )}
          </p>
          <p className="text-sm text-muted">
            {t("play.pickem.champion")} <b className={placements ? (me.championRight ? "text-success" : "text-foreground") : "text-foreground"}>{tagOf(me.champion, me.tags)}</b> · {t("play.pickem.top8")} {me.top8.map((id) => tagOf(id, me.tags)).join(", ")}
          </p>
        </section>
      )}
      {crowd.length > 0 && (
        <section className="card flex flex-col gap-1 p-4" aria-labelledby="crowd">
          <h2 id="crowd" className="font-bold">{t("play.pickem.crowd")}</h2>
          <ul className="flex flex-col gap-0.5 text-sm">
            {crowd.map((c) => (
              <li key={c.playerId} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate">{tagOf(c.playerId, all.find((p) => p.tags[c.playerId])?.tags)}</span>
                <span className="shrink-0 text-meta text-muted">
                  {t("play.pickem.crowdLine", { champion: c.champion, top8: c.top8 })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="flex flex-col gap-2" aria-labelledby="board">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="board" className="font-bold">{placements ? t("play.pickem.leaderboard") : t("play.pickem.everyonesPicks")}</h2>
          {userId && (
            <nav aria-label={t("play.pickem.whose")} className="flex gap-2 text-sm">
              <Link href={`/pickem/${event.id}`} aria-current={!following ? "page" : undefined} className="chip">{t("play.pickem.everyone")}</Link>
              <Link href={`/pickem/${event.id}?who=following`} aria-current={following ? "page" : undefined} className="chip">{t("play.pickem.following")}</Link>
            </nav>
          )}
        </div>
        {shown.length ? (
          <ol className="card divide-y divide-line">
            {shown.slice(0, 100).map((r) => (
              <li key={r.userId} className={`flex items-center gap-3 px-4 py-2 text-sm ${r.me ? "bg-brand/5" : ""}`}>
                {placements && <span className="w-6 shrink-0 text-right font-mono tabular-nums text-muted">{r.rank}</span>}
                <Avatar name={r.tag} src={r.avatarUrl} size="sm" />
                <span className="min-w-0 flex-1">
                  <Link href={`/u/${r.handle}`} className="block truncate font-semibold hover:underline">{r.tag}</Link>
                  <span className="block truncate text-meta text-muted"><Icon name="trophy" /> {tagOf(r.champion, r.tags)}</span>
                </span>
                {placements && (
                  <span className="shrink-0 font-mono font-bold tabular-nums">
                    {scorePicks(r, placements).points}
                    <span className="font-normal text-muted">{t("play.pickem.pts")}</span>
                  </span>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="card p-4 text-sm text-muted">{following ? t("play.pickem.noneFollowing") : t("play.pickem.none")}</p>
        )}
      </section>
      <p className="text-meta text-muted">
        {t("play.pickem.scoring", { champion: CHAMPION_POINTS, top8: TOP8_POINTS })}
      </p>
    </LangProvider>
  );
}

export default function PickemEventPage(props: PageProps<"/pickem/[eventId]">) {
  return (
    <section className="flex flex-col gap-4 p-4">
      <Link href="/pickem" className="text-sm text-muted hover:text-foreground"><T k="play.pickem.back" /></Link>
      <Suspense fallback={<PageSkeleton />}>
        <Pickem params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
