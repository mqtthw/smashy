import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import PostCard from "@/components/feed/PostCard";
import HighlightCard from "@/components/highlights/HighlightCard";
import TypeTabs, { parseType } from "@/components/hub/TypeTabs";
import { characterName } from "@/lib/characters";
import { unixNow } from "@/lib/format";
import { logError } from "@/lib/errorLog";
import { GAMES, GAME_KEYS, type GameKey } from "@/lib/games";
import { getMatchupCounts, getTopHighlights } from "@/lib/highlights";
import MatchupGrid from "@/components/hub/MatchupGrid";
import CharacterHistory, { characterHistoryData } from "@/components/history/CharacterHistory";
import { top8Characters } from "@/lib/historyFirsts";
import CharacterYears from "@/components/history/CharacterYears";
import { getCharacterPosts } from "@/lib/posts";
import { getUserId } from "@/lib/supabase/server";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import CharacterIcon from "@/components/CharacterIcon";
import { characterDiscord } from "@/lib/characterDiscords";
import { CHARACTER_COURSES, CHARACTER_LIBRARIES, cookbookUrl, FRAME_DATA_SOURCE, frameDataLinks, libraryType, LIBRARY_SECTIONS, type CommunityLink } from "@/lib/essentials";
import Icon from "@/components/ui/Icon";
import { LangProvider } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";
import type { MessageKey, Values } from "@/lib/i18n/core";
import type { HighlightType } from "@/lib/highlightTypes";
import NewTab from "@/components/ui/NewTab";

type TFn = (key: MessageKey, values?: Values) => string;

// Library section names, in the visitor's language (same order and types as LIBRARY_SECTIONS).
const LIBRARY_SECTION_KEYS: Record<HighlightType, MessageKey> = {
  guide: "media.lib.guide",
  combo_video: "media.lib.combo_video",
  tech: "media.lib.tech",
  frame_data: "media.lib.frame_data",
  matchup: "media.lib.matchup",
  vod: "media.lib.vod",
  other: "media.lib.other",
};

// The community hashtag prefix per game (also understood by lib/hashtags.ts).
const HASHTAG_PREFIX: Record<GameKey, string> = { ultimate: "SSBU", melee: "SSBM", pplus: "PPlus", smash64: "SSB64", brawl: "SSBB", smash4: "SSB4" };

const isGame = (g: string): g is GameKey => GAME_KEYS.includes(g as GameKey);

export async function generateMetadata({ params }: PageProps<"/games/[game]/[character]">): Promise<Metadata> {
  const { game, character } = await params;
  const name = isGame(game) ? characterName(game, character) : null;
  if (!isGame(game) || !name) return { title: "Not found" };
  return {
    title: `${name} (${GAMES[game].short}) guides, combos & tech`,
    description: `Community ${name} resources for ${GAMES[game].name}: guides, combo videos, matchup notes, tech, and frame data, ranked by upvotes.`,
  };
}

async function CharacterHub({ params, searchParams }: Pick<PageProps<"/games/[game]/[character]">, "params" | "searchParams">) {
  const [{ game, character }, { type }] = await Promise.all([params, searchParams]);
  const name = isGame(game) ? characterName(game, character) : null;
  if (!isGame(game) || !name) notFound();
  const activeType = parseType(type);
  // The two history sections' records start loading now, alongside the posts and guides below (round 709);
  // each section used to start its own only once those had loaded, a second wait in a row.
  const historyData = characterHistoryData(game, character);
  const yearsData = top8Characters(game).catch(() => null);
  const userId = await getUserId();
  const base = `/games/${game}/${character}`;
  // The library, Discord and frame data never touch the database, so a slow database (e.g. a brief
  // statement timeout) should only blank the lists below, not the whole page. Logged for Admin > Health.
  const soft = <T,>(p: Promise<T>): Promise<T | null> =>
    p.catch((e) => {
      void logError("server", `character page: ${e instanceof Error ? e.message : JSON.stringify(e)}`, base);
      return null;
    });
  const [highlightsOrNull, posts, matchupCounts, t, lang] = await Promise.all([
    soft(getTopHighlights({ game, character, type: activeType ?? undefined, userId })),
    soft(getCharacterPosts(game, character, userId)),
    soft(getMatchupCounts(game, character)),
    getT(),
    getLang(),
  ]);
  const highlights = highlightsOrNull ?? [];
  const now = unixNow();
  const discord = characterDiscord(game, character);
  const frameData = frameDataLinks(game, character, name);
  const cookbook = cookbookUrl(game, character);
  const courses = CHARACTER_COURSES[game]?.[character] ?? [];
  const library = CHARACTER_LIBRARIES[game]?.[character] ?? null;
  // Library links sorted into the same types as the "Top resources" tabs.
  const libraryByType = new Map<string, NonNullable<typeof library>["links"]>();
  for (const l of library?.links ?? []) {
    const kind = libraryType(l);
    libraryByType.set(kind, [...(libraryByType.get(kind) ?? []), l]);
  }
  const libraryForTab = activeType ? libraryByType.get(activeType) ?? [] : [];

  return (
    <LangProvider lang={lang}>
      <header className="flex flex-col gap-2 pt-2">
        <Link href={`/games/${game}`} className="text-sm text-muted hover:text-foreground">← {GAMES[game].name}</Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><CharacterIcon game={game} character={character} size={36} />{name}</h1>
        <p className="text-muted">
          {t("media.char.intro", { game: GAMES[game].short, tag: `#${HASHTAG_PREFIX[game]}_${name.normalize("NFKD").replace(/[^A-Za-z0-9]/g, "")}`, name })}
        </p>
        {userId && (
          <Link href={`/highlights/new?game=${game}&character=${character}`} className="self-start btn btn-md btn-primary">
            {t("media.char.add", { name })}
          </Link>
        )}
      </header>

      {discord && (
        <section aria-labelledby="community-discord" className="card flex flex-col gap-2 p-4">
          <h2 id="community-discord" className="font-bold"><Icon name="chat" /> {t("media.char.discord", { name })}</h2>
          <p className="text-sm text-muted">
            {withBold(t("media.char.discordBody", { name }), "{server}", <b className="text-foreground">{discord.name}</b>)}
          </p>
          <a href={discord.invite} target="_blank" rel="noopener noreferrer" className="btn btn-md btn-primary self-start">
            {t("media.char.joinDiscord", { name })}
          <NewTab /></a>
          <p className="text-meta text-muted">{t("media.char.discordNote")}</p>
        </section>
      )}

      {cookbook && (
        <section aria-labelledby="cookbook" className="card flex flex-col gap-2 p-4">
          <h2 id="cookbook" className="font-bold"><Icon name="file" /> {t("media.char.cookbook", { name })}</h2>
          <p className="text-sm text-muted">{t("media.char.cookbookBody", { name })}</p>
          <a href={cookbook} target="_blank" rel="noopener noreferrer" className="btn btn-md btn-primary self-start">
            {t("media.char.openCookbook", { name })}
          <NewTab /></a>
          <p className="text-meta text-muted">{t("media.char.cookbookNote")}</p>
        </section>
      )}

      {courses.length > 0 && (
        <section aria-labelledby="go-deeper" className="card flex flex-col gap-3 p-4">
          <h2 id="go-deeper" className="font-bold">{t("media.char.learn")}</h2>
          <ul className="flex flex-col gap-3">
            {courses.map((c) => (
              <li key={c.url} className="flex flex-col gap-1">
                <a href={c.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand hover:underline">
                  {t("media.char.courseBy", { title: c.title, by: c.by })}
                <NewTab /></a>
                <span className="text-sm text-muted">{c.note}</span>
                {c.paid && <span className="text-meta text-muted">{t("media.char.paid")}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {library && (
        <section aria-labelledby="library" className="card flex flex-col gap-3 p-4">
          <div>
            <h2 id="library" className="font-bold"><Icon name="file" /> {t("media.char.library", { name })}</h2>
            <p className="text-meta text-muted">{t("media.char.libraryCredit", { credit: library.credit })}</p>
          </div>
          <form action="/search" role="search" className="flex gap-2">
            <input type="hidden" name="in" value={`${game}/${character}`} />
            <input
              name="q"
              maxLength={100}
              placeholder={t("media.char.searchPlaceholder", { name })}
              aria-label={t("media.char.searchAria", { name })}
              className="min-w-0 flex-1 rounded-full border border-line bg-field px-4 py-1.5 text-sm"
            />
            <button className="btn btn-sm btn-outline">{t("media.char.search")}</button>
          </form>
          <nav aria-label={t("media.char.librarySections")} className="flex flex-wrap gap-2">
            {LIBRARY_SECTIONS.filter(([s]) => libraryByType.has(s)).map(([s]) => (
              <a key={s} href={`#lib-${s}`} className="chip">{t(LIBRARY_SECTION_KEYS[s])} ({libraryByType.get(s)!.length})</a>
            ))}
          </nav>
          {LIBRARY_SECTIONS.filter(([s]) => libraryByType.has(s)).map(([s]) => (
            <div key={s} id={`lib-${s}`} className="flex scroll-mt-20 flex-col gap-1">
              <h3 className="text-meta font-semibold uppercase tracking-wide text-muted">{t(LIBRARY_SECTION_KEYS[s])}</h3>
              <LibraryList links={libraryByType.get(s)!} t={t} />
            </div>
          ))}
        </section>
      )}

      {frameData.length > 0 && (
        <section aria-labelledby="frame-data" className="card flex flex-col gap-2 p-4">
          <h2 id="frame-data" className="font-bold"><Icon name="chart" /> {t("media.char.frameData", { name })}</h2>
          <p className="text-sm text-muted">{t("media.char.frameDataBody", { source: FRAME_DATA_SOURCE[game] ?? "" })}</p>
          <div className="flex flex-wrap gap-2">
            {frameData.map((f) => (
              <a key={f.url} href={f.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline">
                {frameData.length > 1 ? t("media.char.frameDataOf", { label: f.label }) : t("media.char.openFrameData")} ↗
              <NewTab /></a>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-bold">{t("media.char.top")}</h2>
        <TypeTabs basePath={base} active={activeType} filterLabel={t("media.type.filter")} />
        {highlights.map((h) => <HighlightCard key={h.id} h={h} viewerId={userId} showAuthor />)}
        {libraryForTab.length > 0 && (
          <div className="card flex flex-col gap-2 p-4">
            <h3 className="text-sm font-semibold">{t("media.char.fromLibrary", { name })}</h3>
            <LibraryList links={libraryForTab} t={t} />
          </div>
        )}
        {highlightsOrNull === null ? (
          <p className="text-sm text-muted">{t("media.char.loadFailed")}</p>
        ) : highlights.length === 0 && libraryForTab.length === 0 && (
          <p className="text-sm text-muted">{t(activeType ? "media.char.noneOfType" : "media.char.none")}</p>
        )}
      </section>

      <Suspense fallback={null}>
        <CharacterHistory game={game} character={character} name={name} t={t} data={historyData} />
      </Suspense>
      <Suspense fallback={null}>
        <CharacterYears game={game} character={character} name={name} t={t} majors={yearsData} />
      </Suspense>

      <MatchupGrid game={game} character={character} name={name} counts={matchupCounts ?? new Map()} />

      <section className="flex flex-col">
        <h2 className="mb-2 font-bold">{t("media.char.recentPosts", { name })}</h2>
        {posts === null ? (
          <p className="text-sm text-muted">{t("media.char.postsFailed")}</p>
        ) : posts.length === 0 ? (
          <p className="text-sm text-muted">{t("media.char.noPosts")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {posts.map((p) => <div key={p.id} className="card"><PostCard post={p} now={now} viewerId={userId} /></div>)}
          </div>
        )}
      </section>
      {!userId && <p className="text-center text-xs text-muted">{t("media.signedInMore")}</p>}
    </LangProvider>
  );
}

/** Long sections show the first few links, with the rest behind "Show N more" (no JavaScript needed). */
const LIBRARY_PREVIEW = 8;

/** A phrase with one part (e.g. a name in bold) put in where its {placeholder} is. */
function withBold(text: string, placeholder: string, node: React.ReactNode) {
  const [before, after = ""] = text.split(placeholder);
  return <>{before}{node}{after}</>;
}

function LibraryList({ links, t }: { links: CommunityLink[]; t: TFn }) {
  const item = (l: CommunityLink) => (
    <li key={l.url} className="text-sm">
      <a href={l.url} target="_blank" rel="noopener noreferrer" className="link">{l.title} ↗<NewTab /></a>
      {l.by && <span className="text-muted"> · {l.by}</span>}
    </li>
  );
  const shown = links.length > LIBRARY_PREVIEW + 2 ? links.slice(0, LIBRARY_PREVIEW) : links;
  const rest = links.slice(shown.length);
  return (
    <>
      <ul className="flex flex-col gap-1">{shown.map(item)}</ul>
      {rest.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm font-semibold text-brand group-open:hidden">{t("common.showMore", { n: rest.length })}</summary>
          <ul className="mt-1 flex flex-col gap-1">{rest.map(item)}</ul>
        </details>
      )}
    </>
  );
}

export default function CharacterHubPage(props: PageProps<"/games/[game]/[character]">) {
  return (
    <section className="flex flex-col gap-5 p-4">
      <Suspense fallback={<CardListSkeleton />}>
        <CharacterHub params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
