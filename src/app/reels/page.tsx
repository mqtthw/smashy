import type { Metadata, Viewport } from "next";
import { after } from "next/server";
import { Suspense } from "react";
import ReelFeed from "@/components/reels/ReelFeed";
import { getGuestReels, getReels, refreshReelsIfStale, searchReels } from "@/lib/reels";
import { cleanReelQuery } from "@/lib/reelSearch";
import { getUserId } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { REEL_SEEN_COOKIE, decodeSeen } from "@/lib/reelSeenCookie";
import { getMyGames } from "@/lib/viewer";
import { gamesFor, isGameKey } from "@/lib/games";
import { loadMoreReels } from "./actions";
import { ClipSkeleton } from "@/components/ui/Skeleton";
import { LangProvider } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";

// Reels is dark in both themes, so the phone's browser bars are too (round 820): in light mode Safari's bar
// and the clock strip were sky blue around the black clips. One colour, no light/dark split.
export const viewport: Viewport = { themeColor: "#0a0a0a" };

export const metadata: Metadata = { title: "Smash Bros. clips", description: "The best clips from Super Smash Bros. tournament streams, one after another." };

async function Reels({ searchParams }: { searchParams: PageProps<"/reels">["searchParams"] }) {
  const { game: gameParam, q: qParam } = await searchParams;
  const game = typeof gameParam === "string" && isGameKey(gameParam) ? gameParam : null;
  const query = cleanReelQuery(qParam); // the search box (round 713)
  const userId = await getUserId();
  const myGames = await getMyGames(userId);
  // What this device already watched, from its cookie (round 805): the first clips come back in the right
  // order, so the page no longer asks again and swaps them a second later.
  const seen = query ? [] : decodeSeen((await cookies()).get(REEL_SEEN_COOKIE)?.value);
  // Guests who haven't watched anything here: the kept, shared first page (round 582).
  const first = await (query
    ? searchReels({ q: query, game, limit: 15 })
    : userId || seen.length
      ? getReels({ myGames, game, limit: 15, seen, userId })
      : getGuestReels(game, 15)
  ).catch((e) => {
    console.error("Reels load failed", e);
    return null;
  });
  after(refreshReelsIfStale); // collects new clips in the background, at most every few hours
  if (!first) return <p className="p-6 text-muted">{(await getT())("media.reels.loadFailed")}</p>;
  // key: switching games starts a fresh feed
  return (
    <LangProvider lang={await getLang()}>
      <ReelFeed key={`${game ?? "all"}|${query ?? ""}`} initial={first.reels} hasMore={first.hasMore} loadMore={loadMoreReels} signedIn={!!userId} games={gamesFor(myGames)} game={game} query={query} seenApplied={seen} />
    </LangProvider>
  );
}

export default function ReelsPage(props: PageProps<"/reels">) {
  return (
    <Suspense fallback={<div className="h-above-dock"><ClipSkeleton full /></div>}>
      <Reels searchParams={props.searchParams} />
    </Suspense>
  );
}
