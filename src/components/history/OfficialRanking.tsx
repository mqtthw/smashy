// Smash history: the year's official community rankings (a game's year-end top 10 open, its other editions —
// mid-year, multi-year, tiered Contenders lists — folded below; each game's #1s when no game is picked),
// credited to the ranking and linked to its SmashWiki article (src/lib/officialRankings.ts). Names link to a
// player's page when that name placed at the year's majors with a start.gg id (or an admin linked it).
import Link from "next/link";
import NewTab from "@/components/ui/NewTab";
import { GAMES, type GameKey } from "@/lib/games";
import type { MessageKey, Values } from "@/lib/i18n/core";
import type { MajorEvent } from "@/lib/majorEvents";
import { tagOnly } from "@/lib/majorSets";
import { SMASHWIKI, officialRankings, officialRankingsIn, type OfficialRanking as Ranking } from "@/lib/officialRankings";
import { idForName, nameHref, unlinkedNameKeys, winBrackets } from "@/lib/historyFirsts";
import { getNameLinks, linksForGame, nameKey } from "@/lib/playerLinks";

type Translate = (key: MessageKey, values?: Values) => string;

/** Name key → start.gg player id, from the year's saved placings (and names an admin linked). */
export function knownPlayers(byMajor: MajorEvent[][], game: GameKey | null, links: Map<string, string>): Map<string, string> {
  const out = new Map(links);
  for (const events of byMajor)
    for (const e of events)
      if ((!game || e.game === game) && !e.teams)
        for (const r of e.top8) if (r.playerId) out.set(nameKey(tagOnly(r.name)), r.playerId);
  return out;
}

export default async function OfficialRanking({ year, game, byMajor, t }: { year: number; game: GameKey | null; byMajor: MajorEvent[][]; t: Translate }) {
  const rankings = game ? officialRankings(year, game) : [];
  const all = game ? [] : officialRankingsIn(year);
  if (!rankings.length && !all.length) return null;
  const gameLinks = linksForGame(await getNameLinks().catch(() => new Map<string, string>()), game);
  const players = knownPlayers(byMajor, game, gameLinks);
  // With a game picked, a name also matches the player who placed under it in any year (Mango → Mang0), or
  // else links to its name page when it has placings no player stands for (ZeRo, Ken).
  const brackets = game ? await winBrackets(game).catch(() => []) : [];
  const alias = idForName(brackets);
  const unlinked = game ? unlinkedNameKeys(brackets, gameLinks) : new Set<string>();
  const who = (name: string) => {
    const key = nameKey(tagOnly(name));
    const id = players.get(nameKey(name)) ?? alias(key);
    if (id) return <Link href={`/players/${id}`} className="hover:underline">{name}</Link>;
    return unlinked.has(key) ? <Link href={nameHref(name)} className="hover:underline">{name}</Link> : name;
  };
  const source = (page: string, label: string) => (
    <a href={SMASHWIKI + page} target="_blank" rel="noopener noreferrer" className="link">
      {label} ↗<NewTab />
    </a>
  );
  const body = (r: Ranking) => (
    <>
      {r.tiers ? (
        <div className="card flex flex-col gap-2 px-4 py-3 text-sm">
          <p className="text-meta text-muted">{t("history.ranking.tiers")}</p>
          {r.tiers.map((g) => (
            <div key={g.region ?? "all"} className="flex flex-col gap-1">
              {g.region && <p className="font-semibold">{g.region}</p>}
              {g.tiers.map(([tier, names]) => (
                <p key={tier} className="flex flex-wrap gap-x-2">
                  <span className="w-6 shrink-0 font-bold">{tier}</span>
                  {names.map((n, i) => <span key={n}>{who(n)}{i < names.length - 1 && ","}</span>)}
                </p>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <ol className="card divide-y divide-line text-sm">
          {r.top.map(([rank, name]) => (
            <li key={`${rank}|${name}`} className="flex items-baseline gap-3 px-4 py-1.5">
              <span className="w-6 shrink-0 text-right tabular-nums text-muted">{rank}</span>
              <span className="min-w-0 flex-1 truncate font-semibold">{who(name)}</span>
            </li>
          ))}
        </ol>
      )}
      <p className="text-sm">{source(r.page, t("history.ranking.full", { name: r.name }))}</p>
    </>
  );
  const [main, ...more] = rankings;
  const firsts = (r: Ranking) => r.top.filter(([rank]) => rank === 1).map(([, name]) => name);

  return (
    <section aria-labelledby="history-ranking" className="flex flex-col gap-2">
      <h2 id="history-ranking" className="font-bold">{main ? t(main.tiers ? "history.ranking.tiersTitle" : "history.ranking.title", { name: main.name }) : t("history.ranking.allTitle", { year })}</h2>
      <p className="text-meta text-muted">{t("history.ranking.note", { year })}</p>
      {main ? (
        <>
          {body(main)}
          {more.length > 0 && <p className="text-meta text-muted">{t("history.ranking.more", { year })}</p>}
          {more.map((r) => (
            <details key={r.page} className="card px-4 py-2 text-sm">
              <summary className="cursor-pointer font-semibold">
                {r.name}
                {firsts(r).length > 0 && <span className="font-normal text-muted"> · #1 {firsts(r).join(" · ")}</span>}
              </summary>
              <div className="mt-2 flex flex-col gap-2">{body(r)}</div>
            </details>
          ))}
        </>
      ) : (
        <ul className="card divide-y divide-line text-sm">
          {all.map((r) => (
            <li key={r.page} className="flex flex-wrap items-baseline gap-x-2 px-4 py-2">
              <span className="font-semibold">{firsts(r).map((name, i) => <span key={name}>{i > 0 && " · "}{who(name)}</span>)}</span>
              <span className="text-meta text-muted">
                {t("history.ranking.first", { name: r.name })} ({GAMES[r.game].short}) · {source(r.page, "SmashWiki")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
