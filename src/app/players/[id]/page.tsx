// A start.gg player's page, whether or not they're on Smashy: their record, characters, most
// played opponents and recent sets, from their public start.gg results. Reached from player search,
// set pages, and the names in other players' stats.
//
// Open to everyone, signed in or not. Search engines are told about players with a top 8 at a major
// (round 791); everyone else's page is marked "don't index". A player's history is up to 7 start.gg
// requests and start.gg allows the whole site 80 a minute, so visitors who aren't signed in see
// Smashy's saved copy where there is one, and otherwise have limits members don't (guestBudget.ts). Players who asked not to be listed, and
// Smashy members who don't show their stats (the default for teens), have no page here.
import { startggKey } from "@/lib/seasonsMath";
import { SeasonRanks } from "@/components/seasons/SeasonParts";
import type { Metadata } from "next";
import Link from "next/link";
import BackLink from "@/components/ui/BackLink";
import { notFound } from "next/navigation";
import { after, connection } from "next/server";
import { cache, Suspense } from "react";
import PlayerMajors from "@/components/history/PlayerMajors";
import ImportHistory from "@/components/stats/ImportHistory";
import PlayerResultsCard from "@/components/stats/PlayerResultsCard";
import PlayerLiveCard from "@/components/stats/PlayerLiveCard";
import PlayerUpcoming from "@/components/stats/PlayerUpcoming";
import FollowPlayerButton from "@/components/stats/FollowPlayerButton";
import { followsPlayer } from "@/lib/playerFollows";
import SearchableSets from "@/components/stats/SearchableSets";
import { HeadToHeadCard, PlayerStatsCard } from "@/components/stats/StatsCards";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { getClaim, getImportState, getSavedResults, saveResults } from "@/lib/claimedHistory";
import { mergeResults } from "@/lib/playerResults";
import { arrivedFromSearch, type GuestLookup } from "@/lib/guestBudget";
import { guestLookup } from "@/lib/guestLookup";
import { computeStats, getLinkedPlayer, getRecentSets, getVisibleRecentSets, headToHead, hideHiddenOpponents, playerOnSmashy, portraitCharacters } from "@/lib/playerStats";
import { getPlayerResults, getStartggPlayer } from "@/lib/startggPlayers";
import { getSavedPlayer } from "@/lib/playerIndex";
import { getPlayerSnapshot, savePlayerSnapshot, snapshotStale, type PlayerSnapshot } from "@/lib/playerSnapshots";
import { isCrawler } from "@/lib/guestPages";
import { playerSearchFacts } from "@/lib/playerSearchable";
import { CONTACT_EMAIL } from "@/lib/contact";
import { headers } from "next/headers";
import TimeAgo from "@/components/ui/TimeAgo";
import { unixNow } from "@/lib/format";
import { getUserId } from "@/lib/supabase/server";
import { LangProvider } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";
import type { MessageKey, Values } from "@/lib/i18n/core";
import NewTab from "@/components/ui/NewTab";
import { characterKey } from "@/lib/characters";
import { pixelArtIcon, stockIconUrl } from "@/lib/mainBadge";
import type { PlayerSet } from "@/lib/playerStats";

/** One start.gg fetch per page view: the header's character icons and the sets below share it. */
const recentSets = cache((playerId: string): Promise<PlayerSet[] | null> => getVisibleRecentSets(playerId).catch(() => null));

/** Who may be shown, asked once per page view (the title and the page both need it). */
const onSmashyOnce = cache((playerId: string) => playerOnSmashy(playerId));

/**
 * The page's title and whether search engines may list it: only a player Smashy may show who has a top 8 at
 * a major. Read from Smashy's own tables; start.gg isn't asked. Anyone else: a plain title and "don't index".
 */
export async function generateMetadata(props: PageProps<"/players/[id]">): Promise<Metadata> {
  const plain: Metadata = { title: "Player", robots: { index: false } };
  const { id } = await props.params;
  if (!/^\d{1,12}$/.test(id)) return plain;
  await connection(); // who may be shown is checked on every visit
  const [facts, onSmashy, t] = await Promise.all([playerSearchFacts(id).catch(() => null), onSmashyOnce(id).catch(() => null), getT()]);
  if (!facts || !onSmashy?.allowed) return plain;
  return {
    title: t("people.player.metaTitle", { tag: facts.tag }),
    description: t("people.player.metaDescription", { tag: facts.tag }),
    alternates: { canonical: `/players/${id}` },
    ...(facts.top8 ? {} : { robots: { index: false } }),
  };
}

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
  // A guest while start.gg is in heavy use (round 781): start.gg isn't asked, and the page shows what
  // Smashy has saved (the tag and their top 8s at majors) with a note, instead of a wall that says
  // "busy, sign in". On a busy day that wall was all most visitors would have seen of player lookup.
  let guestBusy = false;
  // A guest and a saved copy of this player (docs/searchable-player-pages-plan.md, step S2): the page is
  // built from the copy and start.gg isn't asked at all during the visit, so it costs the same whoever
  // opens it, person or bot. Members keep the live lookup. No copy: the lookup below, as before.
  let copy: PlayerSnapshot | null = userId ? null : await getPlayerSnapshot(id).catch(() => null);
  const copyPlayer = copy ? await getSavedPlayer(id).catch(() => null) : null;
  if (!copyPlayer) copy = null; // nothing to call them by: look them up as before
  if (copy && snapshotStale(copy.savedAt, unixNow() * 1000) && !isCrawler((await headers()).get("user-agent"))) {
    // Older than a day: refreshed after the page is sent, and only when this visitor is within the guest
    // limits and start.gg has room (the same two checks a live guest lookup passes). Crawlers never start one.
    if ((await guestLookup()) === "ok") {
      after(async () => {
        const [sets, results] = await Promise.all([getRecentSets(id).catch(() => []), getPlayerResults(id).catch(() => [])]);
        await savePlayerSnapshot({ playerId: id, sets, results, viewerSignedIn: false, hasCopy: true });
      });
    }
  }
  if (!userId && !copy) {
    // A visit that says it came from a search engine, to a player search engines aren't told about (no top 8
    // at a major): no live lookup, the saved page with "Try again" instead (round 798, see arrivedFromSearch).
    const lowPriority = arrivedFromSearch((await headers()).get("referer")) && !(await playerSearchFacts(id).catch(() => null))?.top8;
    const gate = lowPriority ? "busy" : await guestLookup();
    if (gate === "slow_down") return <GuestLimit gate={gate} next={`/players/${id}`} t={t} />;
    guestBusy = gate === "busy";
  }

  const [asked, onSmashy] = await Promise.all([guestBusy || copy ? Promise.resolve(undefined) : getStartggPlayer(id).catch(() => undefined), onSmashyOnce(id)]);
  // start.gg didn't answer (busy, or down): carry on with the tag Smashy saved the last time it saw
  // this player (round 733). Their majors and saved results don't need start.gg, so the page still has
  // something to show instead of only "try again in a minute".
  const saved = copyPlayer ?? (asked === undefined ? await getSavedPlayer(id).catch(() => null) : null);
  const player = asked === undefined && saved ? { ...saved, profileUrl: null } : asked;
  const busy = asked === undefined && !!saved && !copy;
  if (!onSmashy.allowed) {
    // They asked not to be listed, or they're a member who keeps their stats to themselves.
    // Nothing about them is shown, not even the tag.
    return <p className="p-6 text-muted">{t("people.player.hidden")}</p>;
  }
  if (player === null) notFound();
  // Busy and nothing saved about this player: the short "busy" card is all there is to show.
  if (!player && guestBusy) return <GuestLimit gate="busy" next={`/players/${id}`} t={t} />;
  if (!player) return <p className="p-6 text-muted">{t("people.startggDown")}</p>;

  return (
    <LangProvider lang={lang}>
      <header className="flex flex-col items-center gap-1 px-4 pt-4 text-center">
        {/* Their most played character in a big glossy bubble (rounds 486 and 494), from the same sets as the stats below. */}
        {copy ? (
          <Suspense fallback={<span className="portrait-bubble h-32 w-32" aria-hidden />}>
            <PlayerMainIcon playerId={player.playerId} tag={player.tag} saved={copy.sets} />
          </Suspense>
        ) : guestBusy ? (
          <span className="portrait-bubble relative h-32 w-32"><span className="text-5xl font-bold text-[#7a2a20]" aria-hidden>{[...player.tag][0]?.toUpperCase()}</span></span>
        ) : (
          <Suspense fallback={<span className="portrait-bubble h-32 w-32" aria-hidden />}>
            <PlayerMainIcon playerId={player.playerId} tag={player.tag} />
          </Suspense>
        )}
        <p className="mt-2 text-meta text-muted">{t("people.player.via")}</p>
        {busy && <p role="status" className="rounded-lg bg-surface px-3 py-1 text-meta text-muted">{t("people.player.busySaved")}</p>}
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
          {/* Their page can be found through search engines (round 791), so the way out is on the page itself. */}
          {!onSmashy.handle && (
            <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Please don't list start.gg player ${player.playerId} (${player.tag})`)}`} className="link">{t("people.player.askHide")}</a>
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
        {/* Follow any player (round 797): private; their upcoming tournaments show on Events. */}
        <div className="mt-2">
          <Suspense fallback={null}>
            <FollowButton playerId={player.playerId} tag={player.tag} userId={userId} />
          </Suspense>
        </div>
      </header>
      {/* In a bracket right now (round 455): still in or out, who they lost to, who's next. */}
      {!guestBusy && !copy && (
        <Suspense fallback={null}>
          <PlayerLiveCard playerId={player.playerId} tag={player.tag} />
        </Suspense>
      )}
      {/* Tournaments still to come on their start.gg account (round 797). */}
      {!guestBusy && !copy && (
        <Suspense fallback={null}>
          <PlayerUpcoming playerId={player.playerId} tag={player.tag} />
        </Suspense>
      )}
      {/* Top 8s at the majors in Smash history (docs/archive-plan.md, step A5). */}
      <Suspense fallback={null}>
        <PlayerMajors playerId={player.playerId} />
      </Suspense>
      {copy ? (
        <Suspense fallback={<CardListSkeleton count={3} label={t("people.player.loadingSets")} className="p-4" />}>
          <SavedPlayerSets playerId={player.playerId} copy={copy} />
        </Suspense>
      ) : guestBusy ? (
        <div className="m-4 card flex flex-col gap-2 p-4">
          <p className="text-sm text-muted">{t("people.player.busy")}</p>
          <div className="flex flex-wrap gap-2">
            {/* A plain link, so pressing it loads the page again and asks start.gg afresh. */}
            <a href={`/players/${id}`} className="btn btn-md btn-primary">{t("people.player.tryAgain")}</a>
            <Link href={`/signin?next=${encodeURIComponent(`/players/${id}`)}`} className="btn btn-md btn-outline">{t("people.player.signInOrJoin")}</Link>
          </div>
        </div>
      ) : (
        <Suspense fallback={<CardListSkeleton count={3} label={t("people.player.loadingSets")} className="p-4" />}>
          <PlayerSets playerId={player.playerId} tag={player.tag} viewerId={userId} />
        </Suspense>
      )}
    </LangProvider>
  );
}

/**
 * The header's picture: their most played character's stock icon, big, with the next two smaller
 * beside it when they're played often enough (see portraitCharacters). A player with no character data (or none with an icon) gets the tag's first letter.
 */
async function FollowButton({ playerId, tag, userId }: { playerId: string; tag: string; userId: string | null }) {
  const following = await followsPlayer(userId, playerId).catch(() => false);
  return <FollowPlayerButton playerId={playerId} tag={tag} following={following} signedIn={!!userId} />;
}

async function PlayerMainIcon({ playerId, tag, saved }: { playerId: string; tag: string; saved?: PlayerSet[] }) {
  const sets = saved ?? (await recentSets(playerId)); // only their own characters are read, so a saved copy needs no hiding
  const icons = portraitCharacters(
    (sets ? computeStats(sets).characters : [])
      .map((c) => (c.game ? { name: c.name, share: c.share, src: stockIconUrl({ game: c.game, character: characterKey(c.name) }) } : null))
      .filter((c): c is { name: string; share: number; src: string } => !!c?.src),
  );
  const [main, ...others] = icons;
  return (
    <span className="portrait-bubble relative h-32 w-32" title={icons.map((c) => c.name).join(", ") || undefined}>
      {main ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={main.src} alt={main.name} width={84} height={84} className="h-[84px] w-[84px]" style={{ imageRendering: pixelArtIcon(main.src, 84) ? "pixelated" : undefined }} />
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

/**
 * A guest's view from the saved copy (step S2): record, characters, opponents, results and sets as of when it
 * was saved, with a line saying so. Opponents who hide their stats are left out exactly as on a live lookup;
 * if that can't be checked, no sets are shown.
 */
async function SavedPlayerSets({ playerId, copy }: { playerId: string; copy: PlayerSnapshot }) {
  const t = await getT();
  const claim = await getClaim(playerId).catch(() => null);
  const claimed = claim?.showStats ? claim : null;
  const [sets, saved] = await Promise.all([hideHiddenOpponents(copy.sets).catch(() => null), claimed ? getSavedResults(claimed.userId).catch(() => []) : Promise.resolve([])]);
  const results = claimed ? mergeResults(saved, copy.results) : copy.results;
  const stats = sets ? computeStats(sets) : null;
  return (
    <section className="flex flex-col gap-3 p-4">
      <p role="status" className="text-meta text-muted">
        {t("people.player.savedCopy")} <TimeAgo at={copy.savedAt} serverNow={unixNow()} /> ·{" "}
        <Link href={`/signin?next=${encodeURIComponent(`/players/${playerId}`)}`} className="link">{t("people.player.savedLive")}</Link>
      </p>
      {stats && stats.sets > 0 && <PlayerStatsCard stats={stats} />}
      <PlayerResultsCard results={results} career={!!claimed && saved.length > 0} />
      {sets?.length ? <SearchableSets sets={sets} /> : <p className="text-muted">{t("people.noSets")}</p>}
    </section>
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
  // Keep this lookup's answer (docs/searchable-player-pages-plan.md, step S1): a later step shows guests the
  // saved copy instead of asking start.gg. The raw sets are saved (the same shared answer as above, so no
  // new start.gg request); who hides their stats is applied when a copy is shown.
  if (sets) after(async () => savePlayerSnapshot({ playerId, sets: await getRecentSets(playerId).catch(() => []), results: fresh, viewerSignedIn: !!viewerId }));
  const results = claimed ? mergeResults(saved, fresh) : fresh;
  // start.gg didn't answer: say so, and still show the results Smashy has saved (a claimed page's career).
  if (!sets) {
    return (
      <section className="flex flex-col gap-3 p-4">
        <p className="text-muted">{t("people.startggDown")}</p>
        {results.length > 0 && <PlayerResultsCard results={results} career={!!claimed && saved.length > 0} />}
      </section>
    );
  }
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
