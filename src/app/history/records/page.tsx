// Smash history: a game's all-time records from the saved results (Matthew, 2026-11-19: "storylines,
// memorable moments, and more"): most major wins, most top 8s, the longest runs of wins at one series, and the longest
// gaps between major wins. Worked out from the records (src/lib/historyFirsts.ts), facts only; players who
// asked not to be listed are left out, and the lists don't show if that can't be checked.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { GAME_KEYS, GAMES, isGameKey, type GameKey } from "@/lib/games";
import { majorHref } from "@/lib/handMajors";
import { T } from "@/lib/i18n/client";
import { getT } from "@/lib/i18n/server";
import CharacterStocks from "@/components/history/CharacterStocks";
import { characterName } from "@/lib/characters";
import { RECORDS_SHOWN, characterWins, countCharacters, gameRecords, idForName, nameHref, top8Characters, winBrackets } from "@/lib/historyFirsts";
import { startggCharacterKey, tagOnly } from "@/lib/majorSets";
import { SMASHWIKI, allTimeRanking, rankingTallies } from "@/lib/officialRankings";
import NewTab from "@/components/ui/NewTab";
import { getNameLinks, linksForGame, nameKey } from "@/lib/playerLinks";
import { playersHidingStats } from "@/lib/playerStats";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("history.records.metaTitle") };
}

const year = (iso: string) => iso.slice(0, 4);
const yearsBetween = (from: string, to: string) => Math.floor((Date.parse(to) - Date.parse(from)) / (365.25 * 86400_000));

async function Records({ searchParams }: { searchParams: PageProps<"/history/records">["searchParams"] }) {
  const sp = await searchParams;
  const game: GameKey = isGameKey(sp.game) ? sp.game : "melee";
  const [t, brackets, links, charWins, top8Chars] = await Promise.all([
    getT(),
    winBrackets(game).catch(() => null),
    getNameLinks().then((l) => linksForGame(l, game)).catch(() => new Map<string, string>()),
    characterWins(game).catch(() => null),
    top8Characters(game).catch(() => null),
  ]);
  // Characters played in the most top 8 placings, from every placing whose characters are known.
  const inTop8s = top8Chars ? countCharacters(top8Chars) : null;
  // Characters that won the most majors (a win counts for each character the winner played there).
  const byCharacter = new Map<string, { key: string; name: string; wins: number }>();
  for (const w of charWins?.wins ?? [])
    for (const c of new Set(w.characters.map((n) => startggCharacterKey(n)))) {
      const name = characterName(game, c);
      if (name) byCharacter.set(c, { key: c, name, wins: (byCharacter.get(c)?.wins ?? 0) + 1 });
    }
  const topCharacters = [...byCharacter.values()].sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name)).slice(0, RECORDS_SHOWN);
  const records = brackets ? gameRecords(brackets, game, links) : null;
  const ids = records ? [...records.wins, ...records.top8s, ...records.runs, ...records.returns].flatMap((w) => (w.playerId ? [w.playerId] : [])) : [];
  const hidden = ids.length ? await playersHidingStats([...new Set(ids)]).catch(() => null) : new Set<string>();
  const ok = <W extends { playerId: string | null }>(list: W[]) => list.filter((w) => !w.playerId || !hidden?.has(w.playerId)).slice(0, RECORDS_SHOWN);
  const g = GAMES[game].short;
  // The community's all-time list for this game, if it has one (names link where they placed at a major).
  const allTime = allTimeRanking(game);
  const known = new Map([...links, ...(records?.top8s ?? []).flatMap((w) => (w.playerId ? [[nameKey(tagOnly(w.name)), w.playerId] as const] : []))]);
  // The community's rankings counted: a ranked name joins the player who placed under it (Mango and Mang0).
  const alias = idForName(brackets ?? []);
  const tallies = rankingTallies(game, (n) => links.get(nameKey(tagOnly(n))) ?? alias(nameKey(tagOnly(n))) ?? `name:${nameKey(tagOnly(n))}`).filter(
    (r) => r.key.startsWith("name:") || !hidden?.has(r.key),
  );
  const rankedFirst = tallies.filter((r) => r.firsts > 0).sort((a, b) => b.firsts - a.firsts || b.top10s - a.top10s);
  const rankedTop = [...tallies].sort((a, b) => b.top10s - a.top10s || b.firsts - a.firsts || a.firstYear - b.firstYear).slice(0, RECORDS_SHOWN);
  // A name with no start.gg player links to its own page (ZeRo, Ken) when it has placings there.
  const unlinked = new Set((records?.top8s ?? []).filter((w) => !w.playerId).map((w) => nameKey(tagOnly(w.name))));
  const byName = (name: string) => (unlinked.has(nameKey(tagOnly(name))) ? <Link href={nameHref(name)} className="hover:underline">{name}</Link> : name);
  const rankedWho = (r: { key: string; name: string }) => (r.key.startsWith("name:") ? byName(r.name) : <Link href={`/players/${r.key}`} className="hover:underline">{r.name}</Link>);
  const who = (w: { playerId: string | null; name: string }) => (w.playerId ? <Link href={`/players/${w.playerId}`} className="hover:underline">{w.name}</Link> : <Link href={nameHref(w.name)} className="hover:underline">{w.name}</Link>);
  const major = (slug: string, name: string) => <Link href={majorHref(slug)} className="hover:underline">{name}</Link>;

  return (
    <>
      <Link href={`/history?game=${game}`} className="text-sm text-muted hover:text-foreground">← {t("history.title")}</Link>
      <h1 className="text-2xl font-bold">{t("history.records.title", { game: g })}</h1>
      <nav aria-label={t("history.games")} className="flex flex-wrap gap-2">
        {GAME_KEYS.map((k) => (
          <Link key={k} href={`/history/records?game=${k}`} aria-current={k === game ? "page" : undefined} className="chip py-1">{GAMES[k].short}</Link>
        ))}
      </nav>
      <p className="text-sm text-muted">{t("history.records.intro", { game: g })}</p>
      {!records || !hidden ? (
        <p className="card p-4 text-sm text-muted">{t("history.records.none")}</p>
      ) : (
        <>
          <section aria-labelledby="records-wins" className="flex flex-col gap-2">
            <h2 id="records-wins" className="font-bold">{t("history.records.wins")}</h2>
            <ol className="card divide-y divide-line text-sm">
              {ok(records.wins).map((w, i) => (
                <li key={w.key} className="flex items-baseline gap-3 px-4 py-2">
                  <span className="w-6 shrink-0 text-right tabular-nums text-muted">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{who(w)}</span>
                  <span className="shrink-0 text-meta text-muted">{t("history.records.span", { first: year(w.firstAt), last: year(w.lastAt) })}</span>
                  <span className="w-20 shrink-0 text-right tabular-nums">{t("history.records.winCount", { n: w.wins })}</span>
                </li>
              ))}
            </ol>
          </section>
          <section aria-labelledby="records-top8s" className="flex flex-col gap-2">
            <h2 id="records-top8s" className="font-bold">{t("history.records.top8s")}</h2>
            <ol className="card divide-y divide-line text-sm">
              {ok(records.top8s).map((w, i) => (
                <li key={w.key} className="flex items-baseline gap-3 px-4 py-2">
                  <span className="w-6 shrink-0 text-right tabular-nums text-muted">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{who(w)}</span>
                  <span className="shrink-0 text-meta text-muted">{t("history.records.span", { first: year(w.firstAt), last: year(w.lastAt) })}</span>
                  <span className="w-20 shrink-0 text-right tabular-nums">{t("history.records.top8Count", { n: w.top8s })}</span>
                </li>
              ))}
            </ol>
          </section>
          {topCharacters.length > 0 && charWins && (
            <section aria-labelledby="records-characters" className="flex flex-col gap-2">
              <h2 id="records-characters" className="font-bold">{t("history.records.characters")}</h2>
              <ol className="card divide-y divide-line text-sm">
                {topCharacters.map((c, i) => (
                  <li key={c.key} className="flex items-center gap-3 px-4 py-2">
                    <span className="w-6 shrink-0 text-right tabular-nums text-muted">{i + 1}</span>
                    <CharacterStocks game={game} names={[c.name]} size={20} />
                    <Link href={`/games/${game}/${c.key}`} className="min-w-0 flex-1 truncate font-semibold hover:underline">{c.name}</Link>
                    <span className="w-20 shrink-0 text-right tabular-nums">{t("history.records.winCount", { n: c.wins })}</span>
                  </li>
                ))}
              </ol>
              <p className="text-meta text-muted">{t("history.char.note", { n: charWins.wins.length, total: charWins.majors })}</p>
            </section>
          )}
          {inTop8s && inTop8s.characters.length > 0 && (
            <section aria-labelledby="records-character-top8s" className="flex flex-col gap-2">
              <h2 id="records-character-top8s" className="font-bold">{t("history.records.characterTop8s")}</h2>
              <ol className="card divide-y divide-line text-sm">
                {inTop8s.characters.slice(0, RECORDS_SHOWN).map((c, i) => {
                  const name = characterName(game, c.key);
                  return (
                    <li key={c.key} className="flex items-center gap-3 px-4 py-2">
                      <span className="w-6 shrink-0 text-right tabular-nums text-muted">{i + 1}</span>
                      <CharacterStocks game={game} names={[c.name]} size={20} />
                      {name ? (
                        <Link href={`/games/${game}/${c.key}`} className="min-w-0 flex-1 truncate font-semibold hover:underline">{name}</Link>
                      ) : (
                        <span className="min-w-0 flex-1 truncate font-semibold">{c.name}</span>
                      )}
                      <span className="shrink-0 text-right tabular-nums">{t("history.yearChars.count", { n: c.n })}</span>
                    </li>
                  );
                })}
              </ol>
              <p className="text-meta text-muted">{t("history.records.characterTop8sNote", { n: inTop8s.known, total: inTop8s.placings, majors: inTop8s.majors })}</p>
            </section>
          )}
          {(rankedFirst.length > 0 || rankedTop.length > 0) && (
            <section aria-labelledby="records-rankings" className="flex flex-col gap-2">
              <h2 id="records-rankings" className="font-bold">{t("history.records.rankings")}</h2>
              <p className="text-meta text-muted">{t("history.records.rankingsNote")}</p>
              {rankedFirst.length > 0 && (
                <ul className="card divide-y divide-line text-sm" aria-label={t("history.records.rankedFirst")}>
                  <li className="px-4 py-1.5 text-meta font-semibold text-muted">{t("history.records.rankedFirst")}</li>
                  {rankedFirst.map((r) => (
                    <li key={r.key} className="flex items-baseline gap-3 px-4 py-1.5">
                      <span className="min-w-0 flex-1 truncate font-semibold">{rankedWho(r)}</span>
                      <span className="w-20 shrink-0 text-right tabular-nums">{t("history.records.timesFirst", { n: r.firsts })}</span>
                    </li>
                  ))}
                </ul>
              )}
              <ol className="card divide-y divide-line text-sm" aria-label={t("history.records.rankedTop")}>
                <li className="px-4 py-1.5 text-meta font-semibold text-muted">{t("history.records.rankedTop")}</li>
                {rankedTop.map((r, i) => (
                  <li key={r.key} className="flex items-baseline gap-3 px-4 py-1.5">
                    <span className="w-6 shrink-0 text-right tabular-nums text-muted">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{rankedWho(r)}</span>
                    <span className="shrink-0 text-meta text-muted">{t("history.records.span", { first: r.firstYear, last: r.lastYear })}</span>
                    <span className="w-20 shrink-0 text-right tabular-nums">{t("history.records.timesTop", { n: r.top10s })}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
          {records.runs.length > 0 && (
            <section aria-labelledby="records-runs" className="flex flex-col gap-2">
              <h2 id="records-runs" className="font-bold">{t("history.records.runs")}</h2>
              <p className="text-meta text-muted">{t("history.records.runsNote")}</p>
              <ul className="card divide-y divide-line text-sm">
                {ok(records.runs).map((d) => (
                  <li key={`${d.key}|${d.majorSlug}`} className="flex flex-wrap items-baseline gap-x-2 px-4 py-2">
                    <span className="font-semibold">{who(d)}</span>
                    <span>{t("history.defenses.streak", { n: d.streak })}</span>
                    <span className="text-meta text-muted">{t("history.records.upTo")} {major(d.majorSlug, d.majorName)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {records.returns.length > 0 && (
            <section aria-labelledby="records-returns" className="flex flex-col gap-2">
              <h2 id="records-returns" className="font-bold">{t("history.records.returns")}</h2>
              <ul className="card divide-y divide-line text-sm">
                {ok(records.returns).map((r) => (
                  <li key={r.majorSlug} className="flex flex-wrap items-baseline gap-x-2 px-4 py-2">
                    <span className="font-semibold">{who(r)}</span>
                    <span>{major(r.majorSlug, r.majorName)}</span>
                    <span className="text-meta text-muted">
                      {t("history.records.gap", { n: yearsBetween(r.previousAt, r.startAt) })} · {t("history.returns.since", { name: r.previousName.includes(year(r.previousAt)) ? r.previousName : `${r.previousName} (${year(r.previousAt)})` })}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
      <p className="text-meta text-muted">{t("history.records.note")}</p>
      {allTime && (
        <section aria-labelledby="records-all-time" className="flex flex-col gap-2">
          <h2 id="records-all-time" className="font-bold">{t("history.records.allTime", { name: allTime.name })}</h2>
          <p className="text-meta text-muted">{t("history.records.allTimeNote")}</p>
          <ol className="card divide-y divide-line text-sm">
            {allTime.top.map(([rank, name]) => {
              const id = known.get(nameKey(name));
              return (
                <li key={rank} className="flex items-baseline gap-3 px-4 py-1.5">
                  <span className="w-6 shrink-0 text-right tabular-nums text-muted">{rank}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{id && !hidden?.has(id) ? <Link href={`/players/${id}`} className="hover:underline">{name}</Link> : name}</span>
                </li>
              );
            })}
          </ol>
          <p className="text-sm">
            <a href={SMASHWIKI + allTime.page} target="_blank" rel="noopener noreferrer" className="link">
              {t("history.ranking.full", { name: allTime.name })} ↗<NewTab />
            </a>
          </p>
        </section>
      )}
      <p className="text-meta text-muted"><T k="history.source" /></p>
    </>
  );
}

export default function HistoryRecordsPage(props: PageProps<"/history/records">) {
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      <Suspense fallback={<CardListSkeleton count={6} />}>
        <Records searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
