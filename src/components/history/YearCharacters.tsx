// Smash history: a year's characters for one game. The ones played most in that year's major top 8s, counted
// from each placing's characters where they're known (start.gg's sets, or SmashWiki for results added by hand),
// and the characters that won their first major in the records that year. Facts and counts, not judgements of
// how strong a character is.
import Link from "next/link";
import CharacterStocks from "@/components/history/CharacterStocks";
import { characterName } from "@/lib/characters";
import { GAMES, type GameKey } from "@/lib/games";
import { majorHref } from "@/lib/handMajors";
import { characterWins, firstCharacterWins, nameHref, top8Characters, yearCharacters } from "@/lib/historyFirsts";
import type { MessageKey, Values } from "@/lib/i18n/core";
import { startggCharacterKey } from "@/lib/majorSets";
import { playersHidingStats } from "@/lib/playerStats";

type Translate = (key: MessageKey, values?: Values) => string;
const SHOWN = 10;

export default async function YearCharacters({ year, game, t }: { year: number; game: GameKey | null; t: Translate }) {
  if (!game) return null;
  const [majors, wins] = await Promise.all([top8Characters(game).catch(() => null), characterWins(game).catch(() => null)]);
  const year_ = majors ? yearCharacters(majors, year) : null;
  // Too few known placings to say anything fair about the year (most of 2024's sets aren't saved yet, say).
  const top = year_ && year_.known >= 8 && year_.known * 2 >= year_.placings ? year_.characters.slice(0, SHOWN) : [];
  // Characters whose first major win in the records came this year; players who keep their stats hidden are left out.
  const firsts = wins ? [...firstCharacterWins(wins.wins)].filter(([, w]) => w.startAt.startsWith(String(year))) : [];
  const ids = [...new Set(firsts.flatMap(([, w]) => (w.playerId ? [w.playerId] : [])))];
  const hidden = ids.length ? await playersHidingStats(ids).catch(() => null) : new Set<string>();
  const shownFirsts = hidden ? firsts.filter(([, w]) => !w.playerId || !hidden.has(w.playerId)).sort((a, b) => a[1].startAt.localeCompare(b[1].startAt)) : [];
  if (!top.length && !shownFirsts.length) return null;
  const nameOf = (key: string, fallback: string) => characterName(game, key) ?? fallback;

  return (
    <>
      {top.length > 0 && year_ && (
        <section aria-labelledby="history-year-characters" className="flex flex-col gap-2">
          <h2 id="history-year-characters" className="font-bold">{t("history.yearChars.title", { game: GAMES[game].short, year })}</h2>
          <ol className="card divide-y divide-line text-sm">
            {top.map((c, i) => (
              <li key={c.key} className="flex items-center gap-3 px-4 py-2">
                <span className="w-6 shrink-0 text-right tabular-nums text-muted">{i + 1}</span>
                <CharacterStocks game={game} names={[c.name]} size={20} />
                {characterName(game, c.key) ? (
                  <Link href={`/games/${game}/${c.key}`} className="min-w-0 flex-1 truncate font-semibold hover:underline">{nameOf(c.key, c.name)}</Link>
                ) : (
                  <span className="min-w-0 flex-1 truncate font-semibold">{c.name}</span>
                )}
                <span className="shrink-0 text-right tabular-nums">{t("history.yearChars.count", { n: c.n })}</span>
              </li>
            ))}
          </ol>
          <p className="text-meta text-muted">{t("history.yearChars.note", { n: year_.known, total: year_.placings, majors: year_.majors })}</p>
        </section>
      )}
      {shownFirsts.length > 0 && (
        <section aria-labelledby="history-year-char-firsts" className="flex flex-col gap-2">
          <h2 id="history-year-char-firsts" className="font-bold">{t("history.yearChars.firstsTitle", { game: GAMES[game].short, year })}</h2>
          <ul className="card divide-y divide-line text-sm">
            {shownFirsts.map(([key, w]) => (
              <li key={key} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 px-4 py-2">
                <CharacterStocks game={game} names={[w.characters.find((c) => startggCharacterKey(c) === key) ?? key]} size={20} />
                <span className="font-semibold">{nameOf(key, key)}</span>
                <span className="text-muted">·</span>
                <Link href={w.playerId ? `/players/${w.playerId}` : nameHref(w.name)} className="hover:underline">{w.name}</Link>
                <Link href={majorHref(w.majorSlug)} className="text-muted hover:underline">{w.majorName}</Link>
              </li>
            ))}
          </ul>
          <p className="text-meta text-muted">{t("history.yearChars.firstsNote", { game: GAMES[game].short })}</p>
        </section>
      )}
    </>
  );
}
