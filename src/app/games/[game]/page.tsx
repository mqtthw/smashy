import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import HighlightCard from "@/components/highlights/HighlightCard";
import TypeTabs, { parseType } from "@/components/hub/TypeTabs";
import { CHARACTERS } from "@/lib/characters";
import CharacterIcon from "@/components/CharacterIcon";
import { GAME_ESSENTIALS } from "@/lib/essentials";
import { DIRECTORY_SOURCE, LINK_DIRECTORY } from "@/lib/linkDirectory";
import { GAMES, GAME_KEYS, type GameKey } from "@/lib/games";
import { getCharacterCounts, getTopHighlights } from "@/lib/highlights";
import { getUserId } from "@/lib/supabase/server";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { LangProvider, T } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";
import NewTab from "@/components/ui/NewTab";

const isGame = (g: string): g is GameKey => GAME_KEYS.includes(g as GameKey);

export async function generateMetadata({ params }: PageProps<"/games/[game]">): Promise<Metadata> {
  const { game } = await params;
  if (!isGame(game)) return { title: "Not found" };
  return {
    title: `${GAMES[game].short} resources`,
    description: `${GAMES[game].name} guides, combo videos, matchup notes, and tech for every character.`,
  };
}

async function GameHub({ params, searchParams }: Pick<PageProps<"/games/[game]">, "params" | "searchParams">) {
  const [{ game }, { type }] = await Promise.all([params, searchParams]);
  if (!isGame(game)) notFound();
  const activeType = parseType(type);
  const userId = await getUserId();
  const [counts, top, t, lang] = await Promise.all([
    getCharacterCounts(game),
    getTopHighlights({ game, type: activeType ?? undefined, userId, limit: 10 }),
    getT(),
    getLang(),
  ]);
  const short = GAMES[game].short;
  // Characters with resources first (most first), then everyone else A–Z.
  const roster = [...CHARACTERS[game]].sort((a, b) => (counts.get(b.key) ?? 0) - (counts.get(a.key) ?? 0) || a.name.localeCompare(b.name));

  const essentials = (GAME_ESSENTIALS[game] ?? []).filter((e) => !e.general);
  const general = (GAME_ESSENTIALS[game] ?? []).filter((e) => e.general);
  const directory = LINK_DIRECTORY[game] ?? [];
  const source = DIRECTORY_SOURCE[game];

  return (
    <LangProvider lang={lang}>
      {essentials.length > 0 && (
        <section aria-labelledby="essentials" className="flex flex-col gap-2">
          <h2 id="essentials" className="font-bold">{t("media.game.essentials", { game: short })}</h2>
          <ol className="flex flex-col gap-2">
            {essentials.map((e, i) => (
              <li key={e.url} className="card flex flex-col gap-2 p-4">
                <h3 className="flex items-center gap-2 font-bold">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs text-white" aria-hidden="true">{i + 1}</span>
                  {e.title}
                </h3>
                <p className="text-sm text-muted">{e.why}</p>
                {e.credit && <p className="text-meta text-muted">{e.credit}</p>}
                <a href={e.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-primary self-start">
                  {e.cta} ↗︎
                <NewTab /></a>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">{t("media.game.characters")}</h2>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {roster.map((c) => (
            <li key={c.key}>
              <Link href={`/games/${game}/${c.key}`} className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 text-sm hover:bg-surface">
                <span className="flex min-w-0 items-center gap-2">
                  <CharacterIcon game={game} character={c.key} />
                  <span className="truncate font-semibold">{c.name}</span>
                </span>
                {(counts.get(c.key) ?? 0) > 0 && <span className="shrink-0 text-xs text-muted">{counts.get(c.key)}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-bold">{t("media.game.top", { game: short })}</h2>
        <TypeTabs basePath={`/games/${game}`} active={activeType} filterLabel={t("media.type.filter")} />
        {top.length === 0 ? (
          <p className="text-sm text-muted">{t("media.game.empty")}</p>
        ) : (
          top.map((h) => <HighlightCard key={h.id} h={h} viewerId={userId} showAuthor />)
        )}
      </section>

      {general.length > 0 && (
        <section aria-labelledby="general-resources" className="flex flex-col gap-2">
          <h2 id="general-resources" className="font-bold">{t("media.game.general", { game: short })}</h2>
          <ul className="flex flex-col gap-2">
            {general.map((e) => (
              <li key={e.url} className="card flex flex-col gap-2 p-4">
                <h3 className="font-bold">{e.title}</h3>
                <p className="text-sm text-muted">{e.why}</p>
                {e.credit && <p className="text-meta text-muted">{e.credit}</p>}
                <div className="flex flex-wrap items-center gap-3">
                  <a href={e.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline">
                    {e.cta} ↗︎
                  <NewTab /></a>
                  {e.more && (
                    <a href={e.more.url} target="_blank" rel="noopener noreferrer" className="link text-sm">
                      {e.more.label} ↗︎
                    <NewTab /></a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {directory.length > 0 && (
        <section aria-labelledby="link-directory" className="flex flex-col gap-2">
          <h2 id="link-directory" className="font-bold">{t("media.dir.title", { game: short })}</h2>
          <p className="text-sm text-muted">
            {t("media.dir.intro")}
            {source && (
              <>
                {" "}{t("media.dir.inspired")}{" "}
                <a href={source.url} target="_blank" rel="noopener noreferrer" className="link">{source.label}<NewTab /></a>.
              </>
            )}
          </p>
          {directory.map((g) => (
            <details key={g.key} className="group rounded-xl border border-line">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
                <span className="font-semibold">{t(`media.dir.${g.key}`)}</span>
                <span className="text-sm text-muted">{g.entries.length}</span>
                <svg viewBox="0 0 24 24" aria-hidden="true" className="ml-auto h-4 w-4 shrink-0 fill-none stroke-current text-muted transition group-open:rotate-180" strokeWidth={2.5}><path d="M6 9l6 6 6-6" /></svg>
              </summary>
              <ul className="flex flex-col divide-y divide-line border-t border-line">
                {g.entries.map((e) => (
                  <li key={e.title} className="flex flex-col gap-1 px-3 py-2.5">
                    <h3 className="text-sm font-bold">{e.title}</h3>
                    <p className="text-sm text-muted">{e.note}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {e.links.map((l) => (
                        <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="link text-sm">
                          {l.label} ↗︎
                        <NewTab /></a>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </section>
      )}
    </LangProvider>
  );
}

export default async function GameHubPage(props: PageProps<"/games/[game]">) {
  return (
    <section className="flex flex-col gap-5 p-4">
      <header className="pt-2">
        <Link href="/games" className="text-sm text-muted hover:text-foreground"><T k="media.games.back" /></Link>
        <Suspense fallback={<h1 className="mt-2 text-2xl font-bold"><T k="media.games.title" /></h1>}>
          {props.params.then(({ game }) => (
            <h1 className="mt-2 text-2xl font-bold">{isGame(game) ? GAMES[game].name : <T k="media.games.title" />}</h1>
          ))}
        </Suspense>
      </header>
      <Suspense fallback={<CardListSkeleton />}>
        <GameHub params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
