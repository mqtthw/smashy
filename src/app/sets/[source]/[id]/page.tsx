import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment, Suspense, type ReactNode } from "react";
import PostCard from "@/components/feed/PostCard";
import TalkComposer from "@/components/feed/TalkComposer";
import GameBadge from "@/components/GameBadge";
import { LiveDot } from "@/components/majors/MajorParts";
import { getSet, isSource } from "@/lib/brackets";
import { bracketPath, setWatchMoment, SOURCE_NAMES, type SetDetail, type SetPlayer } from "@/lib/brackets/types";
import VodPlayer from "@/components/brackets/VodPlayer";
import ShareButton from "@/components/ui/ShareButton";
import { HeadToHeadCard } from "@/components/stats/StatsCards";
import { getRecentSets, headToHead, statsAllowedForPlayer } from "@/lib/playerStats";
import { findVodMoment, twitchTime } from "@/lib/twitch";
import { unixNow } from "@/lib/format";
import { getSetComments, getSetQuotes, getSetRefId } from "@/lib/posts";
import { ownPictureMeta } from "@/lib/siteMeta";
import { getUserId } from "@/lib/supabase/server";
import { postAboutSet } from "../../actions";
import { SetSkeleton } from "@/components/ui/Skeleton";
import SetVods from "@/components/vods/SetVods";
import { scoreLine, scoreText } from "@/lib/brackets/score";
import { LangProvider } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";
import type { MessageKey, Values } from "@/lib/i18n/core";
import { localRound } from "@/lib/i18n/rounds";
import { signInPath } from "@/lib/returnTo";
import NewTab from "@/components/ui/NewTab";

type Tr = (key: MessageKey, values?: Values) => string;

/** A phrase with one {placeholder} filled by a React node (a link): pass MARK as its value. */
const MARK = "\u0001";
function withNode(text: string, node: ReactNode) {
  return <>{text.split(/(\u0001)/).map((part, i) => (part === MARK ? <Fragment key={i}>{node}</Fragment> : part))}</>;
}

async function load(props: PageProps<"/sets/[source]/[id]">) {
  const { source, id } = await props.params;
  if (!isSource(source)) notFound();
  const set = await getSet(source, decodeURIComponent(id)).catch((e) => {
    // Next.js stopping a background page build isn't a real failure; don't log it as one.
    if ((e as { digest?: string })?.digest !== "HANGING_PROMISE_REJECTION") console.error("Set load failed", e);
    return undefined;
  });
  return { source, set };
}

const title = (s: SetDetail) =>
  `${s.players[0]?.name ?? "TBD"} vs ${s.players[1]?.name ?? "TBD"} · ${s.roundLabel}`;

/** The same title in the visitor's language (link previews keep the English one). */
const localTitle = (s: SetDetail, t: Tr) =>
  t("browse.set.title", { a: s.players[0]?.name ?? t("event.tbd"), b: s.players[1]?.name ?? t("event.tbd"), round: localRound(s.roundLabel, t) });

export async function generateMetadata(props: PageProps<"/sets/[source]/[id]">): Promise<Metadata> {
  const { set } = await load(props);
  if (!set) return { title: "Set" };
  const score = set.state === "done" ? ` (${scoreLine(set.players[0]?.score, set.players[1]?.score)})` : "";
  return ownPictureMeta(title(set), `${set.event.tournamentName} · ${set.event.eventName}${score}`);
}

/** `href` = their player page (start.gg players). */
function Side({ p, waiting, done, align, href, t }: { p: SetPlayer | null; waiting: string | null; done: boolean; align: "left" | "right"; href?: string | null; t: Tr }) {
  return (
    <div className={`flex min-w-0 flex-1 flex-col ${align === "right" ? "items-end text-right" : ""}`}>
      {p ? (
        <>
          {p.prefix && <span className="truncate text-meta text-muted">{p.prefix}</span>}
          {href ? (
            <Link href={href} className={`max-w-full truncate text-title hover:underline ${p.won ? "font-bold" : done ? "text-muted" : "font-semibold"}`}>{p.name}</Link>
          ) : (
            <span className={`truncate text-title ${p.won ? "font-bold" : done ? "text-muted" : "font-semibold"}`}>{p.name}</span>
          )}
          {p.seed !== null && <span className="text-meta text-muted">{t("browse.set.seed", { n: p.seed })}</span>}
        </>
      ) : (
        <span className="text-muted italic">{waiting ? localRound(waiting, t) : t("event.tbd")}</span>
      )}
    </div>
  );
}

async function SetContent(props: PageProps<"/sets/[source]/[id]">) {
  const { source, set } = await load(props);
  if (set === null) notFound();
  const [t, lang] = await Promise.all([getT(), getLang()]);
  if (!set) return <p className="p-6 text-muted">{t("browse.set.loadFailed", { source: SOURCE_NAMES[source] })}</p>;

  const userId = await getUserId();
  const moment = set.stream?.source === "TWITCH" ? setWatchMoment(set) : null;
  const [refId, vod] = await Promise.all([
    getSetRefId(source, set.id),
    moment && set.stream ? findVodMoment(set.stream.name, moment.at).catch(() => null) : Promise.resolve(null),
  ]);
  const [comments, quotes] = refId ? await Promise.all([getSetComments(refId, userId), getSetQuotes(refId, userId)]) : [[], []];
  const now = unixNow();
  const [a, b] = set.players;
  const done = set.state === "done";
  const name = (entrantId: string | null) => (entrantId === a?.entrantId ? a?.name : entrantId === b?.entrantId ? b?.name : null);
  // Names open the player's page: their record and recent sets.
  const playerHref = (p: SetPlayer | null) => (source === "startgg" && p?.playerId ? `/players/${p.playerId}` : null);

  return (
    <LangProvider lang={lang}>
    <article className="flex flex-col">
      <header className="flex flex-col gap-1 px-4 pt-4">
        <h1 className="sr-only">{localTitle(set, t)}</h1>
        <div className="flex flex-wrap items-center gap-1.5">
          {set.state === "live" && <LiveDot />}
          {set.event.game && <GameBadge game={set.event.game} />}
          <span className="text-meta text-muted">{set.identifier ? `${t("browse.set.setId", { id: set.identifier })} · ` : ""}{localRound(set.roundLabel, t)}</span>
        </div>
        <p className="text-meta text-muted">
          {set.event.tournamentSlug ? (
            <Link href={`/events/${set.event.tournamentSlug}`} className="hover:underline">{set.event.tournamentName}</Link>
          ) : (
            set.event.tournamentName
          )}{" "}
          · {set.event.eventName}
        </p>
      </header>

      <section aria-label={t("browse.set.score")} className="mx-4 mt-3 flex items-center gap-3 card p-4">
        <Side p={a} waiting={set.waitingOn[0]} done={done} align="left" href={playerHref(a)} t={t} />
        <div className="shrink-0 text-center font-mono text-display font-bold tabular-nums">
          {scoreText(a?.score, b?.score, "–")}
          <span className="mx-1 text-muted">:</span>
          {scoreText(b?.score, a?.score, "–")}
        </div>
        <Side p={b} waiting={set.waitingOn[1]} done={done} align="right" href={playerHref(b)} t={t} />
      </section>

      {set.games.length > 0 && (
        <section aria-label={t("browse.set.games")} className="mx-4 mt-3 flex flex-col overflow-hidden card">
          {set.games.map((g) => (
            <div key={g.number} className="flex items-center gap-3 border-b border-line px-3 py-2 text-body last:border-b-0">
              <span className="w-14 shrink-0 text-meta text-muted">{t("setroom.game", { n: g.number })}</span>
              <span className={`min-w-0 flex-1 truncate ${g.winnerEntrantId === a?.entrantId ? "font-bold" : "text-muted"}`}>
                {(a && g.characters[a.entrantId]?.join(", ")) || "—"}
              </span>
              <span className="text-meta text-muted">{t("browse.set.vs")}</span>
              <span className={`min-w-0 flex-1 truncate text-right ${g.winnerEntrantId === b?.entrantId ? "font-bold" : "text-muted"}`}>
                {(b && g.characters[b.entrantId]?.join(", ")) || "—"}
              </span>
              <span className="hidden w-32 shrink-0 truncate text-right text-meta text-muted sm:block">{g.stage ?? ""}</span>
              <span className="sr-only">{t("browse.set.winner", { name: name(g.winnerEntrantId) ?? t("browse.set.unknown") })}</span>
            </div>
          ))}
        </section>
      )}

      {set.stream?.source === "TWITCH" && (
        <section aria-labelledby="watch" className="mx-4 mt-3 flex flex-col gap-2">
          <h2 id="watch" className="font-bold">{t("browse.set.watch")}</h2>
          {vod ? (
            <>
              <VodPlayer videoId={vod.videoId} time={twitchTime(vod.offset)} title={t("browse.set.onChannel", { title: localTitle(set, t), channel: vod.channel })} />
              <p className="text-meta text-muted">
                {t(moment?.estimated ? "browse.set.fromStreamEstimated" : "browse.set.fromStream", { channel: vod.channel })}{" "}
                <a href={vod.url} target="_blank" rel="noopener noreferrer" className="link">{t("browse.set.openTwitch")}<NewTab /></a>
              </p>
            </>
          ) : (
            <p className="text-meta text-muted">
              {withNode(
                t(done ? "browse.set.streamedGone" : "browse.set.streamedOn", { link: MARK }),
                <a href={`https://www.twitch.tv/${encodeURIComponent(set.stream.name)}`} target="_blank" rel="noopener noreferrer" className="link">twitch.tv/{set.stream.name}<NewTab /></a>,
              )}
            </p>
          )}
        </section>
      )}

      {/* Videos members added (any set: streamed or not). */}
      {source !== "smashy" && (
        <Suspense fallback={null}>
          <SetVods source={source} setId={set.id} userId={userId} className="mx-4 mt-3" />
        </Suspense>
      )}

      {userId && source === "startgg" && a?.playerId && b?.playerId && (
        <div className="mx-4 mt-3">
          <Suspense fallback={null}>
            <SetHeadToHead a={{ id: a.playerId, name: a.name }} b={{ id: b.playerId, name: b.name }} setId={set.id} t={t} />
          </Suspense>
        </div>
      )}

      <div className="flex flex-wrap gap-2 px-4 py-3">
        <Link href={bracketPath(source, set.event.eventId, set.groupId)} className="btn btn-sm btn-outline">{t("browse.set.viewInBracket")}</Link>
        <ShareButton path={`/sets/${source}/${encodeURIComponent(set.id)}`} title={title(set)} label={t("browse.set.share")} className="btn btn-sm btn-ghost" />
        <a href={set.sourceUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost">{t("browse.openOn", { source: SOURCE_NAMES[source] })}<NewTab /></a>
      </div>

      <section aria-labelledby="talk" className="flex flex-col gap-3 border-t border-line px-4 py-4">
        <h2 id="talk" className="font-bold">{t("browse.set.talk")}</h2>
        {userId ? (
          <TalkComposer action={postAboutSet} hidden={{ source, set_id: set.id }} placeholder={t("browse.set.placeholder")} thing="set" />
        ) : (
          <p className="text-muted">{withNode(t("browse.set.joinToComment", { link: MARK }), <Link href={signInPath(`/sets/${source}/${(await props.params).id}`)} className="link">{t("browse.joinSmashy")}</Link>)}</p>
        )}
      </section>

      <section aria-label={t("browse.set.comments")} className="border-t border-line">
        {comments.length === 0 ? (
          <p className="p-4 text-muted">{t("browse.set.noComments")}</p>
        ) : (
          <div className="divide-y divide-line">
            {comments.map((p) => <PostCard key={p.id} post={p} now={now} viewerId={userId} />)}
          </div>
        )}
      </section>

      {quotes.length > 0 && (
        <section aria-labelledby="shared" className="border-t border-line">
          <h2 id="shared" className="px-4 pt-4 font-bold">{t("browse.set.shared")}</h2>
          <div className="divide-y divide-line">
            {quotes.map((p) => <PostCard key={p.id} post={p} now={now} viewerId={userId} />)}
          </div>
        </section>
      )}
    </article>
    </LangProvider>
  );
}

/** The two players' history against each other (only if both allow their stats to be shown). */
async function SetHeadToHead({ a, b, setId, t }: { a: { id: string; name: string }; b: { id: string; name: string }; setId: string; t: Tr }) {
  const [allowA, allowB] = await Promise.all([statsAllowedForPlayer(a.id), statsAllowedForPlayer(b.id)]);
  if (!allowA || !allowB) return null;
  const sets = await getRecentSets(a.id).catch(() => null);
  if (!sets) return null;
  const h2h = headToHead(sets, b.id, setId);
  if (!h2h.sets.length) return null; // first meeting (as far as we can see): nothing to show
  return <HeadToHeadCard left={a.name} right={b.name} h2h={h2h} title={t("browse.set.before")} />;
}

export default function SetPage(props: PageProps<"/sets/[source]/[id]">) {
  return (
    <Suspense fallback={<SetSkeleton />}>
      <SetContent {...props} />
    </Suspense>
  );
}
