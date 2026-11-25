import type { Metadata } from "next";
import EmptyState from "@/components/ui/EmptyState";
import Link from "next/link";
import { Suspense } from "react";
import ThreadRow from "@/components/discuss/ThreadRow";
import TabBar from "@/components/ui/TabBar";
import { FeedSkeleton } from "@/components/ui/Skeleton";
import { unixNow } from "@/lib/format";
import { GAMES, gamesFor, type GameKey } from "@/lib/games";
import { CHARACTERS, characterName } from "@/lib/characters";
import CharacterPicker from "@/components/discuss/CharacterPicker";
import { FEED_GAMES, FLAIRS, isFlair, type FeedGame } from "@/lib/postConstants";
import { getFeed, getThreads } from "@/lib/posts";
import PostCard from "@/components/feed/PostCard";
import { THREAD_SORTS, TOP_WINDOWS, type ThreadSort, type TopWindow } from "@/lib/threadRank";
import { getUserId } from "@/lib/supabase/server";
import { getMyGames } from "@/lib/viewer";
import { pageMeta } from "@/lib/siteMeta";
import Icon from "@/components/ui/Icon";
import { flairKey } from "@/components/feed/flairKey";
import { LangProvider, T } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";

type Search = { game?: string; sort?: string; flair?: string; t?: string; page?: string; nr?: string; character?: string };

function parse(sp: Search) {
  const game = (FEED_GAMES as readonly string[]).includes(String(sp.game)) ? (sp.game as FeedGame) : undefined;
  const sort: ThreadSort = THREAD_SORTS.includes(sp.sort as ThreadSort) ? (sp.sort as ThreadSort) : "hot";
  const flair = isFlair(sp.flair) ? sp.flair : undefined;
  const window: TopWindow = TOP_WINDOWS.includes(sp.t as TopWindow) ? (sp.t as TopWindow) : "week";
  const page = Math.min(40, Math.max(0, Number.parseInt(String(sp.page ?? "0"), 10) || 0));
  const noReplies = sp.nr === "1";
  // A character's board (round 807): only with a game picked, and only a character of that game.
  const character = game && game !== "general" && CHARACTERS[game].some((c) => c.key === sp.character) ? sp.character : undefined;
  return { game, sort, flair, window, page, noReplies, character };
}

export async function generateMetadata({ searchParams }: PageProps<"/discuss">): Promise<Metadata> {
  const { game, character } = parse((await searchParams) as Search);
  const gameName = game && game !== "general" ? GAMES[game].name : "Smash";
  const who = game && game !== "general" && character ? characterName(game, character) : null;
  const name = who ? `${who} (${GAMES[game as GameKey].short})` : gameName;
  return {
    ...pageMeta(`${name} discussions`, `Questions, analysis, news and talk about ${name}, from the smash community.`),
    alternates: { canonical: game ? `/discuss?game=${game}${character ? `&character=${character}` : ""}` : "/discuss" },
  };
}

/** "New thread", already set to the game and character being looked at. */
const newThreadHref = (game: FeedGame | undefined, character: string | undefined) =>
  `/discuss/new${game ? `?game=${game}${character ? `&character=${character}` : ""}` : ""}`;

function href(base: ReturnType<typeof parse>, change: Partial<ReturnType<typeof parse>>) {
  const v = { ...base, page: 0, ...change };
  const p = new URLSearchParams();
  if (v.game) p.set("game", v.game);
  if (v.character) p.set("character", v.character);
  if (v.sort !== "hot") p.set("sort", v.sort);
  if (v.sort === "top" && v.window !== "week") p.set("t", v.window);
  if (v.flair) p.set("flair", v.flair);
  if (v.noReplies) p.set("nr", "1");
  if (v.page) p.set("page", String(v.page));
  const s = p.toString();
  return s ? `/discuss?${s}` : "/discuss";
}

async function Threads({ searchParams }: { searchParams: PageProps<"/discuss">["searchParams"] }) {
  const f = parse((await searchParams) as Search);
  const userId = await getUserId();
  const [{ posts, hasMore }, myGames, t, lang] = await Promise.all([getThreads({ ...f, userId }), getMyGames(userId), getT(), getLang()]);
  const games = gamesFor(f.game && f.game !== "general" ? [...myGames, f.game] : myGames);
  const tabs = [{ key: "all", label: t("feed.tab.all") }, ...games.map((g) => ({ key: g, label: GAMES[g].short })), { key: "general", label: t("feed.tab.general") }];
  const now = unixNow();
  return (
    <LangProvider lang={lang}>
      <TabBar sticky scroll label={t("feed.discuss.board")} active={f.game ?? "all"} tabs={tabs.map((tab) => ({ ...tab, href: href(f, { game: tab.key === "all" ? undefined : (tab.key as FeedGame), character: undefined }) }))} />
      <div className="flex flex-col gap-2 border-b border-line px-4 py-3">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("feed.discuss.sortThreads")}>
          {THREAD_SORTS.map((s) => (
            <Link key={s} href={href(f, { sort: s })} aria-current={f.sort === s ? "page" : undefined} className="chip">
              {t(`feed.discuss.sort.${s}`)}
            </Link>
          ))}
          {/* Threads nobody has answered yet: where experienced players can help newcomers. */}
          <Link href={href(f, { noReplies: !f.noReplies })} aria-current={f.noReplies ? "page" : undefined} className="chip">
            <Icon name="chat" /> {t("feed.discuss.noReplies")}
          </Link>
          {f.sort === "top" &&
            TOP_WINDOWS.map((w) => (
              <Link key={w} href={href(f, { window: w })} aria-current={f.window === w ? "page" : undefined} className="chip text-meta">
                {t(`feed.discuss.window.${w}`)}
              </Link>
            ))}
        </div>
        {/* A character's board (round 807), like Smashboards' character boards: once a game is picked. */}
        {f.game && f.game !== "general" && (
          <div className="flex flex-wrap items-center gap-2">
            <CharacterPicker
              characters={CHARACTERS[f.game]}
              value={f.character}
              hrefFor={Object.fromEntries([["", href(f, { character: undefined })], ...CHARACTERS[f.game].map((c) => [c.key, href(f, { character: c.key })])])}
            />
            {f.character && (
              <Link href={`/games/${f.game}/${f.character}`} className="link text-sm">{t("feed.discuss.characterPage", { name: characterName(f.game, f.character) ?? "" })}</Link>
            )}
          </div>
        )}
        <div className="scroll-fade flex gap-2 overflow-x-auto pr-6 sm:pr-0 sm:[mask-image:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible" role="group" aria-label={t("feed.discuss.filterFlair")}>
          <Link href={href(f, { flair: undefined })} aria-current={!f.flair ? "page" : undefined} className="chip shrink-0">{t("feed.discuss.everything")}</Link>
          {FLAIRS.map((fl) => (
            <Link key={fl.key} href={href(f, { flair: fl.key })} aria-current={f.flair === fl.key ? "page" : undefined} className="chip shrink-0">
              {t(flairKey(fl.key))}
            </Link>
          ))}
        </div>
      </div>
      {posts.length === 0 ? (
        <>
          <div className="p-4">
            <EmptyState
              game={f.game}
              title={f.noReplies ? t("feed.discuss.allAnswered") : t("feed.discuss.empty")}
              body={f.noReplies ? t("feed.discuss.allAnsweredBody") : t("feed.discuss.emptyBody")}
              action={<Link href={newThreadHref(f.game, f.character)} className="btn btn-md btn-primary">{t("feed.discuss.start")}</Link>}
            />
          </div>
          {(f.game || f.flair || f.noReplies || f.character) && <HotEverywhere userId={userId} now={now} />}
          {/* No threads on the whole board (round 783): the newest posts from the Feed, so the page isn't a dead end. */}
          {!f.game && !f.flair && !f.noReplies && f.page === 0 && <FromTheFeed userId={userId} now={now} />}
        </>
      ) : (
        <ul className="flex flex-col gap-3 px-3 py-3">
          {posts.map((p) => <ThreadRow key={p.id} post={p} now={now} />)}
        </ul>
      )}
      {(f.page > 0 || hasMore) && (
        <nav className="flex justify-between p-4 text-sm" aria-label={t("feed.discuss.pages")}>
          {f.page > 0 ? <Link href={href(f, { page: f.page - 1 })} className="link">{t("feed.discuss.newer")}</Link> : <span />}
          {hasMore && <Link href={href(f, { page: f.page + 1 })} className="link">{t("feed.discuss.more")}</Link>}
        </nav>
      )}
    </LangProvider>
  );
}

export default function DiscussPage(props: PageProps<"/discuss">) {
  return (
    <section>
      <header className="flex items-start justify-between gap-3 px-4 pt-6 pb-3">
        <div>
          <h1 className="text-2xl font-bold"><T k="feed.discuss.title" /></h1>
          <p className="mt-1 text-sm">
            <T k="feed.discuss.newToSmash" /> <Link href="/new" className="link"><T k="feed.discuss.startHere" /></Link>
          </p>
        </div>
        <Suspense fallback={null}>
          <NewThreadButton searchParams={props.searchParams} />
        </Suspense>
      </header>
      <Suspense fallback={<FeedSkeleton count={5} label="Loading discussions…" />}>
        <Threads searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}

async function NewThreadButton({ searchParams }: { searchParams: PageProps<"/discuss">["searchParams"] }) {
  const { game, character } = parse((await searchParams) as Search);
  return (
    <Link href={newThreadHref(game, character)} className="btn btn-md btn-primary shrink-0">
      <T k="feed.discuss.newThread" />
    </Link>
  );
}

/** When Discussions has no threads at all: the Feed's newest posts (a thread is a post with a title; these have none). */
async function FromTheFeed({ userId, now }: { userId: string | null; now: number }) {
  const { entries } = await getFeed({ userId }).catch(() => ({ entries: [] }));
  if (!entries.length) return null;
  return (
    <section aria-labelledby="from-the-feed" className="border-t border-line">
      <div className="flex items-baseline justify-between gap-3 px-4 pt-4 pb-1">
        <h2 id="from-the-feed" className="font-bold"><T k="feed.discuss.fromFeed" /></h2>
        <Link href="/" className="link shrink-0 text-sm"><T k="feed.discuss.seeFeed" /></Link>
      </div>
      <div className="flex flex-col gap-3 px-3 py-3">
        {entries.slice(0, 8).map((e) => (
          <div key={e.key} className="card">
            <PostCard post={e.post} repostedBy={e.repostedBy} now={now} viewerId={userId} />
          </div>
        ))}
      </div>
    </section>
  );
}

/** On an empty board: what's being talked about across all games, so the page is never a dead end. */
async function HotEverywhere({ userId, now }: { userId: string | null; now: number }) {
  const { posts } = await getThreads({ sort: "hot", userId });
  if (!posts.length) return null;
  return (
    <section aria-labelledby="hot-everywhere" className="border-t border-line">
      <h2 id="hot-everywhere" className="px-4 pt-4 pb-1 font-bold"><T k="feed.discuss.hotEverywhere" /></h2>
      <ul className="flex flex-col gap-3 px-3 py-3">{posts.slice(0, 10).map((p) => <ThreadRow key={p.id} post={p} now={now} />)}</ul>
    </section>
  );
}
