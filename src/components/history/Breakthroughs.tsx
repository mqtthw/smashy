// Smash history: the year's storylines from the records (src/lib/historyFirsts.ts): breakthroughs, players
// whose first major win in Smash history's records came that year, title defenses, players who won a
// series' next edition again, returns, a major win two years or more after the last, and rivalries, pairs
// who met in grand finals twice or more that year. Shown with a game picked; players who asked not to be listed are left out,
// and nothing shows if that can't be checked.
import Link from "next/link";
import { GAMES, type GameKey } from "@/lib/games";
import { majorHref } from "@/lib/handMajors";
import { defensesIn, firstWins, firstWinsIn, majorReturns, nameHref, rivalriesIn, titleDefenses, winBrackets, type FirstWin } from "@/lib/historyFirsts";
import type { MessageKey, Values } from "@/lib/i18n/core";
import { getNameLinks, linksForGame } from "@/lib/playerLinks";
import { playersHidingStats } from "@/lib/playerStats";

type Translate = (key: MessageKey, values?: Values) => string;

export default async function Breakthroughs({ year, game, t }: { year: number; game: GameKey | null; t: Translate }) {
  if (!game) return null;
  const [brackets, links] = await Promise.all([winBrackets(game).catch(() => []), getNameLinks().then((l) => linksForGame(l, game)).catch(() => new Map<string, string>())]);
  const firsts = firstWinsIn(firstWins(brackets, game, links), year);
  const defenses = defensesIn(titleDefenses(brackets, game, links), year);
  const returns = majorReturns(brackets, game, links).filter((r) => Number(r.startAt.slice(0, 4)) === year);
  const rivals = rivalriesIn(brackets, game, links, year);
  if (!firsts.length && !defenses.length && !returns.length && !rivals.length) return null;
  const ids = [...firsts, ...defenses, ...returns, ...rivals.flatMap((r) => [r.a, r.b])].flatMap((w) => (w.playerId ? [w.playerId] : []));
  const hidden = ids.length ? await playersHidingStats(ids).catch(() => null) : new Set<string>();
  if (!hidden) return null;
  const shown = <W extends FirstWin>(list: W[]) => list.filter((w) => !w.playerId || !hidden.has(w.playerId));
  const shownFirsts = shown(firsts);
  const shownDefenses = shown(defenses);
  const shownReturns = shown(returns);
  const shownRivals = rivals.filter((r) => ![r.a, r.b].some((p) => p.playerId && hidden.has(p.playerId)));
  const who = (w: { playerId: string | null; name: string }) => <Link href={w.playerId ? `/players/${w.playerId}` : nameHref(w.name)} className="hover:underline">{w.name}</Link>;
  const major = (slug: string, name: string) => <Link href={majorHref(slug)} className="hover:underline">{name}</Link>;
  const short = GAMES[game].short;

  return (
    <>
      {shownFirsts.length > 0 && (
        <section aria-labelledby="history-firsts" className="flex flex-col gap-2">
          <h2 id="history-firsts" className="font-bold">{t("history.firsts.title", { year, game: short })}</h2>
          <p className="text-meta text-muted">{t("history.firsts.note", { game: short })}</p>
          <ul className="card divide-y divide-line text-sm">
            {shownFirsts.map((w) => (
              <li key={w.key} className="flex flex-wrap items-baseline gap-x-2 px-4 py-2">
                <span className="font-semibold">{who(w)}</span>
                <span className="text-muted">{major(w.majorSlug, w.majorName)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {shownDefenses.length > 0 && (
        <section aria-labelledby="history-defenses" className="flex flex-col gap-2">
          <h2 id="history-defenses" className="font-bold">{t("history.defenses.title", { year, game: short })}</h2>
          <p className="text-meta text-muted">{t("history.defenses.note", { game: short })}</p>
          <ul className="card divide-y divide-line text-sm">
            {shownDefenses.map((d) => (
              <li key={d.majorSlug} className="flex flex-wrap items-baseline gap-x-2 px-4 py-2">
                <span className="font-semibold">{who(d)}</span>
                <span>{major(d.majorSlug, d.majorName)}</span>
                <span className="text-meta text-muted">
                  {t("history.defenses.previous", { name: d.previousName })}
                  {d.streak > 2 && <> · {t("history.defenses.streak", { n: d.streak })}</>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {shownReturns.length > 0 && (
        <section aria-labelledby="history-returns" className="flex flex-col gap-2">
          <h2 id="history-returns" className="font-bold">{t("history.returns.title", { year, game: short })}</h2>
          <p className="text-meta text-muted">{t("history.returns.note", { game: short })}</p>
          <ul className="card divide-y divide-line text-sm">
            {shownReturns.map((r) => (
              <li key={r.majorSlug} className="flex flex-wrap items-baseline gap-x-2 px-4 py-2">
                <span className="font-semibold">{who(r)}</span>
                <span>{major(r.majorSlug, r.majorName)}</span>
                <span className="text-meta text-muted">{t("history.returns.since", { name: r.previousName.includes(r.previousAt.slice(0, 4)) ? r.previousName : `${r.previousName} (${r.previousAt.slice(0, 4)})` })}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {shownRivals.length > 0 && (
        <section aria-labelledby="history-rivals" className="flex flex-col gap-2">
          <h2 id="history-rivals" className="font-bold">{t("history.rivals.title", { year, game: short })}</h2>
          <p className="text-meta text-muted">{t("history.rivals.note")}</p>
          <ul className="card divide-y divide-line text-sm">
            {shownRivals.map((r) => (
              <li key={`${r.a.key}|${r.b.key}`} className="flex flex-col gap-0.5 px-4 py-2">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-semibold">{who(r.a)}</span>
                  <span className="tabular-nums">{r.aWins}–{r.bWins}</span>
                  <span className="font-semibold">{who(r.b)}</span>
                  <span className="text-meta text-muted">· {t("history.rivals.count", { n: r.finals.length })}</span>
                </span>
                <span className="text-meta text-muted">
                  {r.finals.map((f, i) => (
                    <span key={f.majorSlug}>
                      {i > 0 && " · "}
                      {major(f.majorSlug, f.majorName)}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
