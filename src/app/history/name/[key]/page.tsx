// Smash history: a name's page, for a player with no start.gg account (Smash 4's ZeRo, Melee's Ken): their
// placings at majors under that tag, game by game, and their places in the community's rankings. Gathered by
// the tag alone, so the page says plainly it may include different people who used it; a name an admin linked
// to a start.gg player (or that clearly is one) belongs to that player's page instead.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cacheLife, cacheTag } from "next/cache";
import { Suspense } from "react";
import GameBadge from "@/components/GameBadge";
import PlaceMark from "@/components/ui/PlaceMark";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { GAME_KEYS, GAMES, type GameKey } from "@/lib/games";
import { majorHref } from "@/lib/handMajors";
import CharacterStocks from "@/components/history/CharacterStocks";
import { mostPlayedIn, namePlacings, winBrackets, type NamePlacing } from "@/lib/historyFirsts";
import { placeKey } from "@/lib/i18n/core";
import { T } from "@/lib/i18n/client";
import { getT } from "@/lib/i18n/server";
import { getMajorCharacters, tagOnly, type MajorCharacters } from "@/lib/majorSets";
import { rankingPlaces } from "@/lib/officialRankings";
import { getNameLinks, linksForGame, nameKey } from "@/lib/playerLinks";
import { MAJORS_TAG } from "@/lib/majors";

const validKey = (key: string) => /^[\p{L}\p{N}]{1,40}$/u.test(key);

/**
 * Every game's placings under the name (each game's records are the shared copy the year pages use). The
 * answer is kept per name for a few minutes (round 706): the page and its title each asked for it, and
 * crawlers open a name a few times in a row, so the same scan of every game's brackets (about 600 KB of
 * records) ran 3 times per name. An admin's new name link shows within 15 minutes.
 */
async function gather(key: string): Promise<{ game: GameKey; placings: NamePlacing[] }[]> {
  "use cache: remote";
  cacheTag(MAJORS_TAG);
  let failed = false; // a failed lookup is kept for seconds, not minutes
  const fail = <T,>(fallback: T) => () => ((failed = true), fallback);
  const links = await getNameLinks().catch(fail(new Map<string, string>()));
  const games = (
    await Promise.all(
      GAME_KEYS.map(async (game) => ({ game, placings: namePlacings(await winBrackets(game).catch(fail([])), game, linksForGame(links, game), key) })),
    )
  ).filter((g) => g.placings.length > 0);
  // Placings at start.gg majors (ZeRo's 2017 ones) have no characters of their own: the sets saved there keep
  // them under the tag, as "name:<key>", when the player had no account.
  const missing = games.flatMap((g) => g.placings).filter((p) => !p.characters?.length);
  if (missing.length) {
    const chars = await getMajorCharacters([...new Set(missing.map((p) => p.slug))]).catch(fail<MajorCharacters>(new Map()));
    for (const p of missing) p.characters = chars.get(`${p.slug}|${p.eventId}`)?.get(`name:${key}`) ?? p.characters;
  }
  if (failed) cacheLife("seconds");
  else cacheLife({ stale: 300, revalidate: 900, expire: 3600 });
  return games;
}

/** The spelling used most often. */
const shownName = (all: NamePlacing[]) => {
  const counts = new Map<string, number>();
  for (const p of all) counts.set(p.name, (counts.get(p.name) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
};

export async function generateMetadata(props: PageProps<"/history/name/[key]">): Promise<Metadata> {
  const key = decodeURIComponent((await props.params).key);
  if (!validKey(key)) return {};
  const games = await gather(key).catch(() => []);
  const name = shownName(games.flatMap((g) => g.placings));
  return name ? { title: (await getT())("history.name.metaTitle", { name }), robots: { index: false } } : {};
}

async function NamePage({ params }: { params: PageProps<"/history/name/[key]">["params"] }) {
  const key = decodeURIComponent((await params).key);
  if (!validKey(key)) notFound();
  const [t, games] = await Promise.all([getT(), gather(key)]);
  if (!games.length) notFound();
  const name = shownName(games.flatMap((g) => g.placings));

  return (
    <>
      <Link href="/history" className="text-sm text-muted hover:text-foreground">← {t("history.title")}</Link>
      <h1 className="text-2xl font-bold">{name}</h1>
      <p className="text-sm text-muted">{t("history.name.intro", { name })}</p>
      {games.map(({ game, placings }) => {
        const wins = placings.filter((p) => p.place === 1 && !p.side).length;
        const top8s = placings.filter((p) => p.place <= 8).length;
        const ranked = rankingPlaces(game, new Set([key]), (n) => nameKey(tagOnly(n)));
        const mains = mostPlayedIn(placings);
        return (
          <section key={game} aria-labelledby={`name-${game}`} className="flex flex-col gap-2">
            <h2 id={`name-${game}`} className="flex items-center gap-2 font-bold">
              <GameBadge game={game} /> {GAMES[game].name}
            </h2>
            <p className="text-meta text-muted">
              {t("history.player.majors", { n: placings.length })}
              {top8s > 0 ? ` · ${t("history.player.summary", { n: top8s })}` : ""}
              {wins > 0 ? ` · ${t("history.player.wins", { n: wins })}` : ""}
            </p>
            {mains.length > 0 && (
              <p className="flex items-center gap-2 text-sm">
                <span className="text-muted">{t("history.name.played")}</span>
                <CharacterStocks game={game} names={mains} size={20} />
                <span>{mains.join(", ")}</span>
              </p>
            )}
            {ranked.length > 0 && (
              <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className="text-muted">{t("history.player.yearEnd")}</span>
                {ranked
                  .filter((p) => p.ranking.kind !== "mid")
                  .map((p) => (
                    <Link key={p.ranking.page} href={`/history?year=${p.ranking.year}&game=${game}`} title={p.ranking.name} className="tabular-nums hover:underline">
                      {p.ranking.alsoYears?.length ? `${p.ranking.year}–${p.ranking.alsoYears.at(-1)}` : p.ranking.year} #{p.rank}
                    </Link>
                  ))}
                <span className="text-meta text-muted">· {t("history.player.rankedIn", { n: ranked.length })}</span>
              </p>
            )}
            <ul className="card divide-y divide-line">
              {placings.map((p) => (
                <li key={p.slug}>
                  <Link href={majorHref(p.slug)} className="flex items-center gap-3 px-4 py-2 hover:bg-surface">
                    <PlaceMark place={p.place} label={t(placeKey(p.place), { n: p.place })} />
                    {p.characters?.length ? <CharacterStocks game={game} names={p.characters} /> : null}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{p.majorName}</span>
                      <span className="block truncate text-meta text-muted">
                        {p.startAt.slice(0, 4)} · {p.eventName}
                        {p.entrants ? ` · ${t("browse.entrants", { n: p.entrants })}` : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <p className="text-meta text-muted">{t("history.name.note")}</p>
      <p className="text-meta text-muted"><T k="history.source" /></p>
    </>
  );
}

export default function HistoryNamePage(props: PageProps<"/history/name/[key]">) {
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      <Suspense fallback={<CardListSkeleton count={6} />}>
        <NamePage params={props.params} />
      </Suspense>
    </section>
  );
}
