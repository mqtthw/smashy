import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { Suspense } from "react";
import PostCard from "@/components/feed/PostCard";
import PostComposer from "@/components/feed/PostComposer";
import Logo from "@/components/Logo";
import NotificationBadge from "@/components/social/NotificationBadge";
import MessageBadge from "@/components/messages/MessageBadge";
import WhoToFollow from "@/components/discovery/WhoToFollow";
import NewPostsBanner from "@/components/feed/NewPostsBanner";
import { getWhoToFollow } from "@/lib/discovery";
import { unixNow } from "@/lib/format";
import { followsAtLeast } from "@/lib/follows";
import { FEED_GAMES, getFeed, getFollowingFeed, getForYouFeed, getGuestForYouFeed, type FeedGame, type TimelineEntry } from "@/lib/posts";
import { logError } from "@/lib/errorLog";
import { getPlayerHistory, getPlayerRecent } from "@/lib/startgg";
import { composerTemplates } from "@/lib/composerTemplates";
import { createClient, getUserId } from "@/lib/supabase/server";
import TabBar from "@/components/ui/TabBar";
import { LiveMajorsBanner } from "@/components/majors/MajorParts";
import MySetsTeaser from "@/components/mysets/MySetsTeaser";
import { getMajors, majorsFor, refreshMajorsIfStale } from "@/lib/majors";
import { GAMES, gamesFor } from "@/lib/games";
import { getMyGames, getMyHomeCity, needsProfile } from "@/lib/viewer";
import ClipsOfWeek from "@/components/feed/ClipsOfWeek";
import { FeedSkeleton } from "@/components/ui/Skeleton";
import GuestWelcome from "@/components/GuestWelcome";
import FeedStarter from "@/components/feed/FeedStarter";
import { detectedRegion, getViewerRegion } from "@/lib/viewerRegion";
import { TLink } from "@/components/feed/Translated";
import MoreMenu from "@/components/feed/MoreMenu";
import { FeedGameTabs } from "@/components/feed/FeedPanes";
import DrawerProfile from "@/components/feed/DrawerProfile";
import DrawerAdmin from "@/components/feed/DrawerAdmin";
import { LangProvider, T } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/core";
import { getLang, getT } from "@/lib/i18n/server";

/** Game tabs: main games, older games this player plays (or is viewing), and General. */
function feedTabs(myGames: string[], current?: FeedGame, t?: (key: MessageKey) => string): { key: FeedGame | "all"; label: string }[] {
  const games = gamesFor(current && current !== "general" ? [...myGames, current] : myGames);
  return [{ key: "all", label: t ? t("feed.tab.all") : "All" }, ...games.map((g) => ({ key: g, label: GAMES[g].short })), { key: "general", label: t ? t("feed.tab.general") : "General" }];
}

/** Recent results + upcoming sign-ups for the composer's templates (linked start.gg only). */
async function templateOptions(userId: string) {
  const supabase = await createClient();
  const { data: link } = await supabase.from("startgg_links").select("startgg_user_id, startgg_player_id").eq("user_id", userId).maybeSingle();
  if (!link) return { results: [], signups: [] };
  const [history, fresh] = await Promise.all([
    getPlayerHistory(link.startgg_user_id).catch(() => null),
    // New sign-ups and tonight's placements can take hours to reach the history, so also check their latest tournaments.
    getPlayerRecent(link.startgg_user_id, link.startgg_player_id).catch(() => []),
  ]);
  return composerTemplates(fresh, history?.entries ?? [], unixNow());
}

type FeedData = { entries: TimelineEntry[]; hasMore: boolean; cursor?: string | null };

/** Round icon buttons in the feed header (Resources, Search, Messages, Notifications). */
const headerBtn = "flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-full border border-line px-2 text-sm font-semibold text-foreground hover:bg-surface";

/** New players: a few people to follow until they follow 10. */
async function FeedSuggestions({ userId }: { userId: string }) {
  if (await followsAtLeast(userId, 10)) return null;
  return <WhoToFollow people={await getWhoToFollow(userId, 3)} />;
}

async function Feed({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const params = await searchParams;
  const game = (FEED_GAMES as readonly string[]).includes(String(params.game)) ? (params.game as FeedGame) : undefined;
  const before = typeof params.before === "string" && !Number.isNaN(Date.parse(params.before)) ? params.before : undefined;

  const pageNum = Math.min(50, Math.max(0, Number.parseInt(String(params.page ?? "0"), 10) || 0));
  // For You pages after the first are ranked as of when you started scrolling (?at=).
  const at = typeof params.at === "string" && !Number.isNaN(Date.parse(params.at)) ? params.at : undefined;

  const userId = await getUserId();
  const view = userId && params.view === "following" ? "following" : "for_you";
  // For You is ranked (best first, paged). Following, and "newest first" (?before=), are by time.
  const ranked = view === "for_you" && !before;
  const guestRegion = userId ? null : await detectedRegion();
  const loadFeed = (game: FeedGame | undefined): Promise<FeedData> =>
    ranked
      ? // A guest's first page is the same for every guest in their region: kept and shared (round 567).
        (!userId && pageNum === 0
          ? getGuestForYouFeed(game, guestRegion)
          : getForYouFeed({ game, page: pageNum, asOf: pageNum > 0 ? at : undefined, userId, region: guestRegion })
        ).catch(async (e: unknown) => {
          // The ranking query failed (it has timed out when the database was busy). The home page
          // must still open: show the newest posts instead, and keep the failure in the error log.
          const message = typeof e === "object" && e !== null && "message" in e ? String((e as { message: unknown }).message) : String(e);
          await logError("server", `For You feed fell back to newest posts: ${message}`, "/").catch(() => {});
          return getFeed({ game, userId });
        })
      : view === "following"
        ? getFollowingFeed({ game, before, userId: userId! })
        : getFeed({ game, before, userId });
  // The composer's "share a result" choices come from start.gg. The Feed doesn't wait for them at all
  // (round 554: waiting up to 2.5 s for them was most of every Feed load): the composer gets them as
  // they arrive. Given up after 8 seconds, when start.gg is slow or busy.
  const templates = userId
    ? Promise.race([templateOptions(userId), new Promise<{ results: never[]; signups: never[] }>((r) => setTimeout(() => r({ results: [], signups: [] }), 8000))]).catch(() => ({ results: [], signups: [] }))
    : null;
  const [{ entries, hasMore, cursor: nextCursor }, majors, myGames, t, lang] = await Promise.all([
    loadFeed(game),
    getMajors().catch(() => ({ live: [], upcoming: [] })),
    getMyGames(userId),
    getT(),
    getLang(),
  ]);
  const unfinished = await needsProfile(userId); // same read as getMyGames (cached per request)
  const TABS = feedTabs(myGames, game, t);
  after(refreshMajorsIfStale); // keeps the majors list fresh in the background (at most every few hours)
  const liveMajors = game ? majors.live.filter((m) => (m.games as string[]).includes(game)) : majorsFor(majors.live, myGames);
  const now = unixNow();
  // Guests on the plain first page get the welcome: what Smashy is, and what's happening right now.
  const guestWelcome = !userId && pageNum === 0 && !before && !game;
  const active = game ?? "all";
  // Build feed URLs that keep the current view + game.
  const feedHref = (opts: { game?: string; view?: string; before?: string; page?: number; at?: string }) => {
    const p = new URLSearchParams();
    const v = opts.view ?? view;
    const g = opts.game === undefined ? game : opts.game === "all" ? undefined : opts.game;
    if (v === "following") p.set("view", "following");
    if (g) p.set("game", g);
    if (opts.before) p.set("before", opts.before);
    if (opts.page) p.set("page", String(opts.page));
    if (opts.at) p.set("at", opts.at);
    const s = p.toString();
    return s ? `/?${s}` : "/";
  };

  // One game's list of posts (with its "show more" and "caught up"). The Feed's first page renders one
  // for every game tab, the others hidden, so switching games is instant (round 558).
  const postList = (key: string, d: FeedData) => (
    <>
      {d.entries.length === 0 ? (ranked ? null :
        <>
          <p className="p-6 text-muted">
            {before ? t("feed.noOlder") : view === "following" ? t("feed.followingEmpty") : t("feed.empty")}
          </p>
          {view === "following" && !before && userId && (
            <Suspense fallback={null}>
              <FeedSuggestions userId={userId} />
            </Suspense>
          )}
        </>
      ) : (
        // Each post is its own glass card (round 496), not a row between lines.
        <div className="flex flex-col gap-3 px-3 py-3">
          {d.entries.map((e) => (
            <div key={e.key} className="card">
              <PostCard post={e.post} repostedBy={e.repostedBy} why={e.why} now={now} viewerId={userId} />
            </div>
          ))}
        </div>
      )}

      {ranked && !d.hasMore && (
        <div className="flex flex-col items-center gap-2 p-6 text-center">
          <p className="font-bold">{d.entries.length || pageNum ? t("feed.caughtUp") : t("feed.noRecent")}</p>
          <p className="text-meta text-muted">{t("feed.forYouNote")}</p>
          <Link href={feedHref({ game: key, before: new Date(now * 1000).toISOString() })} className="btn btn-md btn-outline">
            {t("feed.seeAllNewest")}
          </Link>
        </div>
      )}

      {d.hasMore && (
        <div className="p-4 text-center">
          <Link
            href={ranked ? feedHref({ game: key, page: pageNum + 1, at: at ?? new Date(now * 1000).toISOString() }) : feedHref({ game: key, before: d.cursor ?? "" })}
            className="btn btn-md btn-outline"
          >
            {ranked ? t("feed.showMore") : t("feed.olderPosts")}
          </Link>
        </div>
      )}
    </>
  );
  // Only the tab you're on is built (round 657). Round 559 also built every other game's list, hidden, so
  // tabs switched with no server trip; that made the Feed Smashy's most expensive page (~280 ms of CPU a
  // visit, Vercel Observability, Nov 2026). Matthew: load on tap is fine, but it must feel instant: a tap
  // shows the Feed's loading outline at once (its prefetched shell), and a tab already opened comes back
  // instantly for a minute (staleTimes.dynamic in next.config.ts). Guests' lists are kept and shared, so
  // theirs load fast too.
  return (
    <LangProvider lang={lang}>
      <Suspense fallback={null}>
        <MySetsTeaser userId={userId} />
      </Suspense>
      <LiveMajorsBanner majors={liveMajors} />
      {pageNum === 0 && !before && <NewPostsBanner since={new Date(now * 1000).toISOString()} game={game} following={view === "following"} viewerId={userId} />}
      {userId && (
        <TabBar
          label={t("feed.view")}
          active={view}
          tabs={(["for_you", "following"] as const).map((v) => ({ key: v, label: v === "for_you" ? t("feed.forYou") : t("feed.following"), href: feedHref({ view: v }) }))}
        />
      )}
      <FeedGameTabs label={t("feed.filterByGame")} active={active} tabs={TABS.map((tab) => ({ key: tab.key, label: tab.label, href: feedHref({ game: tab.key }) }))} />

      {params.account === "deleted" && !userId && (
        <p role="status" className="border-b border-line bg-surface px-4 py-3 text-sm">{t("feed.accountDeleted")}</p>
      )}
      {userId && unfinished ? (
        // Signed in but the welcome step was never finished (round 663): posting can't work yet, so the
        // way back to it comes first instead of the composer.
        <div role="status" className="card m-3 flex flex-col gap-2 p-4">
          <p className="font-semibold">{t("feed.finishSetup")}</p>
          <p className="text-sm text-muted">{t("feed.finishSetupBody")}</p>
          <Link href="/welcome" className="btn btn-md btn-primary self-start">{t("feed.finishSetupButton")}</Link>
        </div>
      ) : userId ? (
        <>
          {/* The "Welcome to Smashy" checklist left the Feed (round 560, Matthew: "a bit pushy"); the same
              list is on the Profile tab as "Getting started". */}
          <PostComposer defaultGame={game ?? "general"} templates={templates} />
          {view === "for_you" && pageNum === 0 && !before && (
            <Suspense fallback={null}>
              <FeedSuggestions userId={userId} />
            </Suspense>
          )}
        </>
      ) : guestWelcome ? (
        // Arrives with the posts (round 584), not after them: it popped in above them and pushed the
        // page down. Its lists are kept and shared, so the wait is short.
        <GuestWelcome majors={majors.upcoming} />
      ) : (
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <p className="text-sm text-muted">{t("feed.guestJoin")}</p>
          <Link href="/signin" className="shrink-0 btn btn-md btn-primary btn-hero">{t("feed.join")}</Link>
        </div>
      )}

      {/* Clips of the week (round 751): the most liked clips players posted in the last 7 days. */}
      {view === "for_you" && pageNum === 0 && !before && (
        <Suspense fallback={null}>
          <ClipsOfWeek game={game} userId={userId} />
        </Suspense>
      )}

      {/* A quiet feed (early days): top clips, this week's events and a nudge to post, instead of emptiness. */}
      {view === "for_you" && pageNum === 0 && !before && entries.length < 5 && (
        <Suspense fallback={null}>
          <FeedStarter myGames={myGames} city={await getMyHomeCity(userId)} region={await getViewerRegion(userId)} signedIn={!!userId} showEvents={!!userId} showClips={!guestWelcome} />
        </Suspense>
      )}

      {/* Guests (round 654): the posts come under their own heading, after the welcome, so a quiet
          feed reads as one part of Smashy rather than the whole of it. */}
      {guestWelcome && entries.length > 0 && <h2 className="px-4 pt-5 font-bold">{t("ui.guest.community")}</h2>}
      {postList(active, { entries, hasMore, cursor: nextCursor })}
      {!userId && (
        <p className="px-4 pb-6 text-center text-xs text-muted">{t("feed.signedInOnly")}</p>
      )}
    </LangProvider>
  );
}

// One address for the home feed, however it was reached ("show more" and "older posts" add their own
// parameters): search engines treat them all as this page instead of endless separate ones.
export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function FeedPage(props: PageProps<"/">) {
  return (
    <section>
      <header className="px-4 pt-6 pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-1">
            <Logo className="text-3xl md:hidden" />
            <h1 className="text-2xl font-bold max-md:sr-only"><T k="nav.feed" /></h1>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {/* Search, Resources, then More on the far right (Matthew). */}
            <TLink href="/search" labelKey="feed.search" titleKey="feed.search" className={headerBtn}>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current" strokeWidth={2}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
            </TLink>
            <TLink href="/games" labelKey="feed.resources" titleKey="feed.resources" className={headerBtn}>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current" strokeWidth={2}><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M8 7h7" /></svg>
              <span className="max-sm:hidden"><T k="feed.resources" /></span>
            </TLink>
            <MoreMenu className={headerBtn} profile={<Suspense fallback={null}><DrawerProfile /></Suspense>} admin={<Suspense fallback={null}><DrawerAdmin /></Suspense>} />
            {/* Phones: Messages and Notifications live in More (Matthew); wider screens keep these buttons. */}
            <TLink href="/messages" labelKey="nav.messages" titleKey="nav.messages" className={`${headerBtn} max-md:hidden`}>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current" strokeWidth={2}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
              <MessageBadge />
            </TLink>
            <TLink href="/notifications" labelKey="setroom.notif.title" titleKey="setroom.notif.title" className={`${headerBtn} max-md:hidden`}>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current" strokeWidth={2}><path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0" /></svg>
              <NotificationBadge />
            </TLink>
          </div>
        </div>
      </header>
      <Suspense fallback={<FeedSkeleton />}>
        <Feed searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
