// A start.gg player's page, whether or not they're on Smashy: their record, characters, most
// played opponents and recent sets, from their public start.gg results. Reached from player search,
// set pages, and the names in other players' stats.
//
// Open to everyone, signed in or not, and kept out of search engines. A player's history is up to
// 7 start.gg requests and start.gg allows the whole site 80 a minute, so visitors who aren't
// signed in have limits members don't (guestBudget.ts). Players who asked not to be listed, and
// Smashy members who don't show their stats (the default for teens), have no page here.
import { startggKey } from "@/lib/seasonsMath";
import { SeasonRanks } from "@/components/seasons/SeasonParts";
import type { Metadata } from "next";
import Link from "next/link";
import BackLink from "@/components/ui/BackLink";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { cache, Suspense } from "react";
import PlayerMajors from "@/components/history/PlayerMajors";
import ImportHistory from "@/components/stats/ImportHistory";
import PlayerResultsCard from "@/components/stats/PlayerResultsCard";
import PlayerLiveCard from "@/components/stats/PlayerLiveCard";
import SearchableSets from "@/components/stats/SearchableSets";
import { HeadToHeadCard, PlayerStatsCard } from "@/components/stats/StatsCards";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { getClaim, getImportState, getSavedResults, saveResults } from "@/lib/claimedHistory";
import { mergeResults } from "@/lib/playerResults";
import type { GuestLookup } from "@/lib/guestBudget";
import { guestLookup } from "@/lib/guestLookup";
import { computeStats, getLinkedPlayer, getRecentSets, getVisibleRecentSets, headToHead, playerOnSmashy } from "@/lib/playerStats";
import { getPlayerResults, getStartggPlayer } from "@/lib/startggPlayers";
import { getUserId } from "@/lib/supabase/server";
import { LangProvider } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";
import type { MessageKey, Values } from "@/lib/i18n/core";
import NewTab from "@/components/ui/NewTab";
import { characterKey } from "@/lib/characters";
import { stockIconUrl } from "@/lib/mainBadge";
import type { PlayerSet } from "@/lib/playerStats";

/** One start.gg fetch per page view: the header's character icons and the sets below share it. */
const recentSets = cache((playerId: string): Promise<PlayerSet[] | null> => getVisibleRecentSets(playerId).catch(() => null));

export const metadata: Metadata = { title: "Player", robots: { index: false } };

type Translate = (key: MessageKey, values?: Values) => string;

/** Puts a link (or other node) where "\u0001" sits in a translated sentence. */
function withNode(text: string, node: React.ReactNode) {
  const [before, after = ""] = text.split("\u0001");
  return <>{before}{node}{after}</>;
}

/** A visitor who isn't signed in has reached a guest limit: say why, and how to carry on. */
function GuestLimit({ gate, next, t }: { gate: Exclude<GuestLookup, "ok">; next: string; t: Translate }) {
  return (
    <div className="m-4 card flex flex-col gap-2 p-4">
      <h1 className="font-bold">{gate === "busy" ? t("people.player.busyTitle") : t("people.player.manyTitle")}</h1>
      <p className="text-sm text-muted">{gate === "busy" ? t("people.player.busy") : t("people.player.many")}</p>
      <Link href={`/signin?next=${encodeURIComponent(next)}`} className="btn btn-md btn-primary self-start">
        {t("people.player.signInOrJoin")}
      </Link>
    </div>
  );
}

async function PlayerContent({ params }: { params: PageProps<"/players/[id]">["params"] }) {
  const { id } = await params;
  if (!/^\d{1,12}$/.test(id)) notFound();
  const userId = await getUserId();
  const [lang, t] = await Promise.all([getLang(), getT()]);
  if (!userId) {
    const gate = await guestLookup();
    if (gate !== "ok") return <GuestLimit gate={gate} next={`/players/${id}`} t={t} />;
  }

  const [player, onSmashy] = await Promise.all([getStartggPlayer(id).catch(() => undefined), playerOnSmashy(id)]);
  if (!onSmashy.allowed) {
    // They asked not to be listed, or they're a member who keeps their stats to themselves.
    // Nothing about them is shown, not even the tag.
    return <p className="p-6 text-muted">{t("people.player.hidden")}</p>;
  }
  if (player === null) notFound();
  if (!player) return <p className="p-6 text-muted">{t("people.startggDown")}</p>;

  return (
    <LangProvider lang={lang}>
      <header className="flex flex-col items-center gap-1 px-4 pt-4 text-center">
        {/* Their most played character in a big glossy bubble (rounds 486 and 494), from the same sets as the stats below. */}
        <Suspense fallback={<span className="portrait-bubble h-32 w-32" aria-hidden />}>
          <PlayerMainIcon playerId={player.playerId} tag={player.tag} />
        </Suspense>
        <p className="mt-2 text-meta text-muted">{t("people.player.via")}</p>
        <h1 className="flex max-w-full flex-col items-center text-3xl leading-tight break-words">
          {player.prefix && <span className="font-sans text-body font-semibold tracking-wide text-muted">{player.prefix}</span>}
          {player.tag}
        </h1>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-meta">
          {onSmashy.handle ? (
            <Link href={`/u/${onSmashy.handle}`} className="link">{t("people.player.claimedBy", { handle: onSmashy.handle })}</Link>
          ) : (
            <span className="text-muted">
              {withNode(t("people.player.notOnSmashy", { link: "\u0001" }), <Link href="/link/startgg" className="link">{t("people.linkStartgg")}</Link>)}
            </span>
          )}
          {player.profileUrl && (
            <a href={player.profileUrl} target="_blank" rel="noopener noreferrer" className="link">{t("people.player.openStartgg")}<NewTab /></a>
          )}
          <Link href={`/players/compare?a=${player.playerId}`} className="link">{t("people.player.compare")}</Link>
          <Link href={`/vods?q=${encodeURIComponent(player.tag)}`} className="link">{t("people.player.videosOf", { tag: player.tag })}</Link>
        </div>
        <Suspense fallback={null}>
          <SeasonRanks keys={[startggKey(player.playerId)]} viewerId={userId} className="mt-1" />
        </Suspense>
      </header>
      {/* In a bracket right now (round 455): still in or out, who they lost to, who's next. */}
      <Suspense fallback={null}>
        <PlayerLiveCard playerId={player.playerId} tag={player.tag} />
      </Suspense>
      {/* Top 8s at the majors in Smash history (docs/archive-plan.md, step A5). */}
      <Suspense fallback={null}>
        <PlayerMajors playerId={player.playerId} />
      </Suspense>
      <Suspense fallback={<CardListSkeleton count={3} label={t("people.player.loadingSets")} className="p-4" />}>
        <PlayerSets playerId={player.playerId} tag={player.tag} viewerId={userId} />
      </Suspense>
    </LangProvider>
  );
}

/**
 * The header's picture: their most played character's stock icon, big, with the next two smaller
 * beside it. A player with no character data (or none with an icon) gets the tag's first letter.
 */
async function PlayerMainIcon({ playerId, tag }: { playerId: string; tag: string }) {
  const sets = await recentSets(playerId);
  const icons = (sets ? computeStats(sets).characters : [])
    .map((c) => (c.game ? { name: c.name, src: stockIconUrl({ game: c.game, character: characterKey(c.name) }) } : null))
    .filter((c): c is { name: string; src: string } => !!c?.src)
    .slice(0, 3);
  const [main, ...others] = icons;
  return (
    <span className="portrait-bubble relative h-32 w-32" title={icons.map((c) => c.name).join(", ") || undefined}>
      {main ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={main.src} alt={main.name} width={84} height={84} className="h-[84px] w-[84px]" />
      ) : (
        <span className="text-5xl font-bold text-[#7a2a20]" aria-hidden>{[...tag][0]?.toUpperCase()}</span>
      )}
      {others.length > 0 && (
        <span className="absolute -right-3 bottom-0 flex gap-1">
          {others.map((c) => (
            <span key={c.src} className="portrait-bubble h-10 w-10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.src} alt={c.name} width={26} height={26} className="h-[26px] w-[26px]" />
            </span>
          ))}
        </span>
      )}
    </span>
  );
}

/** Their record, characters, most played opponents and sets, plus the viewer's own history against them. */
async function PlayerSets({ playerId, tag, viewerId }: { playerId: string; tag: string; viewerId: string | null }) {
  const t = await getT();
  const viewer = viewerId ? await getLinkedPlayer(viewerId).catch(() => null) : null;
  const isMe = viewer?.playerId === playerId;
  const claim = await getClaim(playerId).catch(() => null);
  const claimed = claim?.showStats ? claim : null; // a hidden claimed player never reaches here (see PlayerContent)
  const [sets, mySets, fresh, saved, imported] = await Promise.all([
    recentSets(playerId),
    viewer && !isMe ? getRecentSets(viewer.playerId).catch(() => null) : Promise.resolve(null),
    getPlayerResults(playerId).catch(() => []),
    claimed ? getSavedResults(claimed.userId).catch(() => []) : Promise.resolve([]),
    claimed && isMe ? getImportState(claimed.userId).catch(() => null) : Promise.resolve(null),
  ]);
  // A claimed page keeps its career: the latest results are saved once the page has been sent.
  if (claimed && fresh.length) after(() => saveResults(claimed.userId, fresh));
  const results = claimed ? mergeResults(saved, fresh) : fresh;
  if (!sets) return <p className="p-6 text-muted">{t("people.startggDown")}</p>;
  const stats = computeStats(sets);
  const h2h = mySets ? headToHead(mySets, playerId) : null;
  return (
    <section className="flex flex-col gap-3 p-4">
      {isMe && <p className="text-meta text-muted">{t("people.player.isYou")}</p>}
      {h2h && h2h.sets.length > 0 && <HeadToHeadCard left={t("people.you")} right={tag} h2h={h2h} title={t("people.youVs", { tag })} />}
      {!viewer && (
        <p className="text-meta text-muted">
          {withNode(
            t("people.player.ownSets", { link: "\u0001", tag }),
            viewerId ? (
              <Link href="/link/startgg" className="link">{t("people.linkStartgg")}</Link>
            ) : (
              <Link href={`/signin?next=${encodeURIComponent(`/players/${playerId}`)}`} className="link">{t("people.player.joinAndLink")}</Link>
            ),
          )}
        </p>
      )}
      {stats.sets > 0 && <PlayerStatsCard stats={stats} />}
      {claimed && isMe && <ImportHistory initial={imported} />}
      <PlayerResultsCard results={results} career={!!claimed && saved.length > 0} />
      {sets.length ? <SearchableSets sets={sets} /> : <p className="text-muted">{t("people.noSets")}</p>}
    </section>
  );
}

export default function PlayerPage(props: PageProps<"/players/[id]">) {
  return (
    <article>
      <div className="px-4 pt-4">
        <BackLink href="/search?tab=players" label="people.findPlayer" className="text-meta text-muted hover:text-foreground" />
      </div>
      <Suspense fallback={<CardListSkeleton count={3} label="Loading player…" className="p-4" />}>
        <PlayerContent params={props.params} />
      </Suspense>
    </article>
  );
}
