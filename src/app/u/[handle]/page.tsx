import { isRegion, regionName } from "@/lib/regions";
import { profileSocials } from "@/lib/socials";
import { meleeUnlockedChallengeUrl } from "@/lib/meleeUnlocked";
import NewTab from "@/components/ui/NewTab";
import ReplayStatsCard from "@/components/slippi/ReplayStatsCard";
import { memberKey, startggKey } from "@/lib/seasonsMath";
import { SeasonRanks } from "@/components/seasons/SeasonParts";
import LocalTime from "@/components/ui/LocalTime";
import MainBadge from "@/components/MainBadge";
import { badgeMain } from "@/lib/mainBadge";
import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { notFound } from "next/navigation";
import { Suspense, cache } from "react";
import PostCard from "@/components/feed/PostCard";
import GameBadge from "@/components/GameBadge";
import { unixNow } from "@/lib/format";
import { GAME_KEYS, type GameKey } from "@/lib/games";
import HighlightCard from "@/components/highlights/HighlightCard";
import FollowButton from "@/components/social/FollowButton";
import AskToPlayButton from "@/components/play/AskToPlayButton";
import { isPlayGame } from "@/lib/playGames";
import ProfileMessageActions from "@/components/messages/ProfileMessageActions";
import { avatarUrl } from "@/lib/avatarLinks";
import { GAMES } from "@/lib/games";
import { characterName, parseMains } from "@/lib/characters";
import { getMessagingRelation } from "@/lib/messages";
import { getFollowCounts, getFollowState } from "@/lib/follows";
import { getAuthorHighlights } from "@/lib/highlights";
import { getProfileTimeline, getPostsByIds, getProfilePosts, type TimelineEntry } from "@/lib/posts";
import { clip, ownPictureMeta } from "@/lib/siteMeta";
import { createClient, getUserId } from "@/lib/supabase/server";
import Avatar from "@/components/ui/Avatar";
import TabBar from "@/components/ui/TabBar";
import ImportHistory from "@/components/stats/ImportHistory";
import PlayerResultsCard from "@/components/stats/PlayerResultsCard";
import { HeadToHeadCard, PlayerStatsCard, RecentSetsCard } from "@/components/stats/StatsCards";
import { getClaim, getImportState, getSavedResults, saveResults } from "@/lib/claimedHistory";
import { mergeResults } from "@/lib/playerResults";
import { getPlayerResults } from "@/lib/startggPlayers";
import { computeStats, getLinkedPlayer, getRecentSets, getVisibleRecentSets, headToHead } from "@/lib/playerStats";
import { CardListSkeleton, ProfileSkeleton } from "@/components/ui/Skeleton";
import ProfileEvents from "@/components/host/ProfileEvents";
import Icon from "@/components/ui/Icon";
import { LangProvider } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";

/** Puts a link (or other node) where "\u0001" sits in a translated sentence. */
function withNode(text: string, node: React.ReactNode) {
  const [before, after = ""] = text.split("\u0001");
  return <>{before}{node}{after}</>;
}

type PublicProfile = { id: string; tag: string; handle: string; home_city: string | null; games: string[]; bio: string | null; created_at: string; protected: boolean; avatar_path: string | null; pinned_post_id: string | null; mains: unknown; crew: string | null; lfg_doubles: boolean; region: string | null; social_twitch: string | null; social_youtube: string | null; social_x: string | null; social_instagram: string | null; social_bluesky: string | null; social_reddit: string | null; social_slippi: string | null };

/** Load a profile as the current viewer: teen profiles only come back for signed-in users. */
async function loadProfile(handle: string): Promise<PublicProfile | null> {
  if (!/^[a-z0-9_]{3,20}$/.test(handle)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, tag, handle, home_city, games, bio, created_at, protected, avatar_path, pinned_post_id, mains, crew, lfg_doubles, region, social_twitch, social_youtube, social_x, social_instagram, social_bluesky, social_reddit, social_slippi")
    .eq("handle", handle)
    .maybeSingle();
  return data as PublicProfile | null;
}

// One read per page view (round 732): the page's title and the page itself ask for the same data, and
// Smashy's time-limited database calls aren't de-duplicated by Next, so each used to run twice.
const profileOnce = cache(loadProfile);

export async function generateMetadata({ params }: PageProps<"/u/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  const p = await profileOnce(handle.toLowerCase()).catch(() => null);
  if (!p) return { title: "Profile not found", robots: { index: false } };
  // Teen profiles only load for signed-in viewers, so this never reaches a crawler.
  return ownPictureMeta(`${p.tag} (@${p.handle})`, p.bio ? clip(p.bio, 200) : `${p.tag} on Smashy${p.home_city ? ` · ${p.home_city}` : ""}`);
}

async function ProfileView({ params, searchParams }: Pick<PageProps<"/u/[handle]">, "params" | "searchParams">) {
  const [{ handle }, { before, tab }] = await Promise.all([params, searchParams]);
  const wantedTab = tab === "highlights" || tab === "stats" || tab === "replies" || tab === "media" || tab === "events" ? tab : "posts";
  const userId = await getUserId();
  const profile = await profileOnce(handle.toLowerCase());
  // Same message whether the profile doesn't exist or is a teen's (hidden from guests),
  // so guests can't learn who's under 18.
  if (!profile) notFound();

  const cursor = typeof before === "string" && !Number.isNaN(Date.parse(before)) ? before : undefined;
  // One tab's posts. Started as soon as the profile is known (round 672): only the Stats tab has to wait
  // for the start.gg link and replay stats to know whether it can be shown; the rest used to wait too.
  const tabPosts = (tab: typeof wantedTab) =>
    tab === "posts"
      ? getProfileTimeline({ authorId: profile.id, before: cursor, userId })
      : tab === "replies" || tab === "media"
        ? getProfilePosts({ authorId: profile.id, kind: tab, before: cursor, userId }).then((r) => ({
            entries: r.posts.map((post) => ({ key: `p-${post.id}`, at: post.createdAt, post, repostedBy: null })),
            hasMore: r.hasMore,
            cursor: r.cursor,
          }))
        : Promise.resolve({ entries: [] as TimelineEntry[], hasMore: false, cursor: null as string | null });
  // The pinned post shows first on the Posts tab (first page only).
  const tabPinned = (tab: typeof wantedTab) =>
    tab === "posts" && !cursor && profile.pinned_post_id ? getPostsByIds([profile.pinned_post_id], userId).then((r) => r[0] ?? null) : Promise.resolve(null);
  const early = wantedTab !== "stats";
  const earlyPosts = early ? tabPosts(wantedTab) : null;
  const earlyPinned = early ? tabPinned(wantedTab) : null;
  earlyPosts?.catch(() => {}); // awaited below; this only keeps an early failure from going unhandled
  earlyPinned?.catch(() => {});
  const others = Promise.all([
    wantedTab === "highlights" ? getAuthorHighlights(profile.id, userId) : Promise.resolve(null),
    getFollowState(userId, profile.id),
    getFollowCounts(profile.id),
    userId && profile.id !== userId ? getMessagingRelation(userId, profile.id) : Promise.resolve(null),
  ]);
  others.catch(() => {});

  // start.gg stats: shown when they linked start.gg and allow it (adults by default, teens opt in).
  // Slippi replay stats they saved: the database only returns them to viewers allowed to see them.
  const [linked, replay] = await Promise.all([
    getLinkedPlayer(profile.id).catch(() => null),
    createClient().then((c) => c.from("replay_stats").select("summary, shown").eq("user_id", profile.id).maybeSingle()).then((r) => r.data as { summary: unknown; shown: boolean } | null, () => null),
  ]);
  const startggVisible = !!linked && (linked.showStats || profile.id === userId);
  const statsVisible = startggVisible || !!replay;
  const activeTab = wantedTab === "stats" && !statsVisible ? "posts" : wantedTab;

  const [{ entries, hasMore, cursor: nextCursor }, pinned, [highlights, followState, counts, relation]] = await Promise.all([
    earlyPosts ?? tabPosts(activeTab),
    earlyPinned ?? tabPinned(activeTab),
    others,
  ]);
  const games = profile.games.filter((g): g is GameKey => GAME_KEYS.includes(g as GameKey));
  const isMe = profile.id === userId;
  const now = unixNow();
  const [lang, t] = await Promise.all([getLang(), getT()]);

  return (
    <LangProvider lang={lang}>
      <header className="flex flex-col gap-3 border-b border-line p-4">
        <div className="flex items-start gap-4">
          <Avatar name={profile.tag} src={avatarUrl(profile.avatar_path)} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 text-2xl font-bold"><span className="truncate">{profile.tag}</span><MainBadge main={badgeMain(profile.mains)} size="md" /></h1>
            <p className="text-muted">@{profile.handle}{profile.protected && <span title={t("people.u.protectedTitle")}> <Icon name="lock" label={t("people.u.protected")} /></span>}</p>
          </div>
          {relation && <ProfileMessageActions profileId={profile.id} tag={profile.tag} canMessage={relation.canMessage} blocked={relation.blocked} muted={relation.muted} />}
          {!isMe && !relation?.blocked && <FollowButton profileId={profile.id} state={followState} isProtected={profile.protected} signedIn={!!userId} />}
          {isMe && (
            <Link href="/profile/edit" className="shrink-0 btn btn-sm btn-outline">
              {t("people.profile.edit")}
            </Link>
          )}
        </div>
        {relation && !relation.blocked && games.some(isPlayGame) && (
          <div><AskToPlayButton to={profile.id} games={games.filter(isPlayGame)} className="btn btn-sm btn-outline" /></div>
        )}
        {profile.bio && <p className="whitespace-pre-wrap break-words">{profile.bio}</p>}
        {profileSocials(profile).length > 0 && (
          <ul className="flex flex-wrap gap-2 text-sm" aria-label={t("people.u.socials")}>
            {profileSocials(profile).map((s) => (
              <li key={s.key}>
                {/* The person's own channel: nofollow + ugc, as for any link a member adds. */}
                <a href={s.url} target="_blank" rel="noopener noreferrer nofollow ugc" className="badge flex items-center gap-1.5 border border-line font-normal hover:bg-surface" aria-label={t("people.u.socialOn", { handle: s.handle, site: s.label })}>
                  <span className="font-semibold">{s.label}</span> <span className="text-muted">{s.key === "youtube" && /^UC[A-Za-z0-9_-]{22}$/.test(s.handle) ? t("people.u.channel") : s.key === "bluesky" || s.key === "slippi" ? s.handle : s.key === "reddit" ? `u/${s.handle}` : `@${s.handle}`}</span><NewTab />
                </a>
              </li>
            ))}
          </ul>
        )}
        {/* Challenge in Melee Unlocked (round 690): shows once the launcher's link format is agreed. */}
        {profile.social_slippi && meleeUnlockedChallengeUrl(profile.social_slippi) && (
          <div>
            <a href={meleeUnlockedChallengeUrl(profile.social_slippi)!} className="btn btn-sm btn-outline">{t("people.u.challengeMU")}</a>
          </div>
        )}
        {(profile.crew || profile.lfg_doubles) && (
          <p className="flex flex-wrap items-center gap-2 text-sm">
            {profile.crew && (
              <Link href={`/search?crew=${encodeURIComponent(profile.crew)}`} className="badge border border-line font-normal hover:bg-surface">
                <Icon name="users" /> {profile.crew}
              </Link>
            )}
            {profile.lfg_doubles && (
              <Link href="/search?doubles=1" className="badge bg-brand/10 font-semibold text-brand hover:bg-brand/20">
                <Icon name="users" /> {t("people.edit.lfg")}
              </Link>
            )}
          </p>
        )}
        {parseMains(profile.mains).length > 0 && (
          <p className="flex flex-wrap items-center gap-1.5 text-sm">
            <span className="text-muted">{t("people.u.mains")}</span>
            {parseMains(profile.mains).map((m) => (
              <Link key={`${m.game}-${m.character}`} href={`/games/${m.game}/${m.character}`} className="badge flex items-center gap-1 border border-line font-normal hover:bg-surface">
                <MainBadge main={m} /> {characterName(m.game, m.character)} <span className="text-muted">({GAMES[m.game].short})</span>
              </Link>
            ))}
          </p>
        )}
        <Suspense fallback={null}>
          <SeasonRanks keys={[memberKey(profile.id), ...(linked ? [startggKey(linked.playerId)] : [])]} viewerId={userId} />
        </Suspense>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          {games.map((g) => <GameBadge key={g} game={g} />)}
          {(profile.home_city || isRegion(profile.region)) && (
            <span><Icon name="pin" /> {[profile.home_city, isRegion(profile.region) ? regionName(profile.region) : null].filter(Boolean).join(", ")}</span>
          )}
          <span>{t("people.u.joined")} <LocalTime iso={profile.created_at} style="monthYear" /></span>
        </div>
        <div className="flex gap-4 text-sm">
          {profile.protected && !isMe ? (
            <span className="text-muted"><Icon name="lock" /> {t("people.u.privateLists")}</span>
          ) : (
            <>
              <Link href={`/u/${profile.handle}/following`} className="hover:underline"><b>{counts.following}</b> <span className="text-muted">{t("people.u.following")}</span></Link>
              <Link href={`/u/${profile.handle}/followers`} className="hover:underline"><b>{counts.followers}</b> <span className="text-muted">{t("people.u.followers", { n: counts.followers })}</span></Link>
            </>
          )}
        </div>
      </header>

      <TabBar
        scroll
        label={t("people.u.sections")}
        active={activeTab}
        tabs={[
          { key: "posts", label: t("people.u.tab.posts"), href: `/u/${profile.handle}` },
          { key: "replies", label: t("people.u.tab.replies"), href: `/u/${profile.handle}?tab=replies` },
          { key: "media", label: t("people.u.tab.media"), href: `/u/${profile.handle}?tab=media` },
          { key: "highlights", label: t("people.u.tab.highlights"), href: `/u/${profile.handle}?tab=highlights` },
          { key: "events", label: t("people.u.tab.events"), href: `/u/${profile.handle}?tab=events` },
          ...(statsVisible ? [{ key: "stats", label: t("people.u.tab.stats"), href: `/u/${profile.handle}?tab=stats` }] : []),
        ]}
      />

      {activeTab === "events" ? (
        <Suspense fallback={<CardListSkeleton count={2} label={t("people.u.loadingEvents")} className="p-4" />}>
          <ProfileEvents userId={profile.id} isMe={isMe} />
        </Suspense>
      ) : activeTab === "stats" ? (
        <>
          {replay && (
            <div className="p-4 pb-0">
              <ReplayStatsCard summary={replay.summary} shown={replay.shown} isMe={isMe} />
            </div>
          )}
          {startggVisible && linked && (
            <Suspense fallback={<CardListSkeleton count={2} label={t("people.u.loadingStats")} className="p-4" />}>
              <ProfileStats playerId={linked.playerId} tag={profile.tag} viewerId={userId} isMe={isMe} />
            </Suspense>
          )}
        </>
      ) : activeTab === "highlights" ? (
        <section className="flex flex-col gap-3 p-4">
          {!isMe && <FollowButton profileId={profile.id} state={followState} isProtected={profile.protected} signedIn={!!userId} />}
          {isMe && (
            <Link href="/highlights/new" className="self-start btn btn-md btn-primary">
              {t("people.u.addHighlight")}
            </Link>
          )}
          {highlights!.length === 0 ? (
            <p className="text-muted">
              {isMe ? t("people.u.highlightsMine") : t("people.u.noHighlights")}
            </p>
          ) : (
            highlights!.map((h) => <HighlightCard key={h.id} h={h} viewerId={userId} />)
          )}
        </section>
      ) : entries.length === 0 ? (
        <p className="p-6 text-muted">
          {cursor
            ? t("people.u.noOlder")
            : activeTab === "replies"
              ? isMe ? t("people.u.repliesMine") : t("people.u.noReplies")
              : activeTab === "media"
                ? isMe ? t("people.u.mediaMine") : t("people.u.noPhotos")
                : isMe ? t("people.u.postsMine") : t("people.u.noPosts")}
        </p>
      ) : (
        <div className="divide-y divide-line">
          {pinned && (
            <div className="border-b border-line">
              <p className="px-4 pt-2 text-meta font-semibold text-muted"><Icon name="pin" /> {t("people.u.pinned")}</p>
              <PostCard post={pinned} now={now} viewerId={userId} />
            </div>
          )}
          {entries.filter((e) => !(pinned && e.post.id === pinned.id && !e.repostedBy)).map((e) => <PostCard key={e.key} post={e.post} repostedBy={e.repostedBy} now={now} viewerId={userId} />)}
        </div>
      )}
      {(activeTab === "posts" || activeTab === "replies" || activeTab === "media") && hasMore && (
        <div className="p-4 text-center">
          <Link href={`/u/${profile.handle}?${activeTab === "posts" ? "" : `tab=${activeTab}&`}before=${encodeURIComponent(nextCursor ?? "")}`} className="btn btn-md btn-outline">
            {t("people.u.olderPosts")}
          </Link>
        </div>
      )}
    </LangProvider>
  );
}

/** Stats tab: their record, characters and rivals, plus your head-to-head against them. */
async function ProfileStats({ playerId, tag, viewerId, isMe }: { playerId: string; tag: string; viewerId: string | null; isMe: boolean }) {
  const t = await getT();
  const viewer = viewerId && !isMe ? await getLinkedPlayer(viewerId).catch(() => null) : null;
  const claim = await getClaim(playerId).catch(() => null);
  const [sets, mySets, fresh, saved, imported] = await Promise.all([
    getVisibleRecentSets(playerId).catch(() => null),
    viewer ? getRecentSets(viewer.playerId).catch(() => null) : Promise.resolve(null),
    getPlayerResults(playerId).catch(() => []),
    claim?.showStats ? getSavedResults(claim.userId).catch(() => []) : Promise.resolve([]),
    claim?.showStats && isMe ? getImportState(claim.userId).catch(() => null) : Promise.resolve(null),
  ]);
  if (claim?.showStats && fresh.length) after(() => saveResults(claim.userId, fresh));
  const results = claim?.showStats ? mergeResults(saved, fresh) : fresh;
  if (!sets) return <p className="p-6 text-muted">{t("people.startggDown")}</p>;
  const stats = computeStats(sets);
  return (
    <section className="flex flex-col gap-3 p-4">
      {!isMe && viewer && mySets && <HeadToHeadCard left={t("people.you")} right={tag} h2h={headToHead(mySets, playerId)} title={t("people.youVs", { tag })} />}
      {!isMe && !viewer && viewerId && (
        <p className="text-meta text-muted">
          {withNode(t("people.u.h2hLink", { link: "\u0001", tag }), <Link href="/link/startgg" className="link">{t("people.linkStartgg")}</Link>)}
        </p>
      )}
      {stats.sets ? <PlayerStatsCard stats={stats} /> : <p className="text-muted">{t("people.noSets")}</p>}
      {isMe && claim?.showStats && <ImportHistory initial={imported} />}
      <PlayerResultsCard results={results} career={saved.length > 0} />
      <RecentSetsCard sets={sets} />
    </section>
  );
}

export default function PublicProfilePage(props: PageProps<"/u/[handle]">) {
  return (
    <section>
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileView params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
