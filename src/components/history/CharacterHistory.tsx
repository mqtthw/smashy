// A character page's "In Smash history": the majors won by a player who played this character there, the
// players who did it most, and the latest ones. From the records (src/lib/historyFirsts.ts characterWins): the
// winner's characters from start.gg's sets, or SmashWiki's for results added by hand. Counts a win once per
// character the winner played, so a Fox and Falco player's win shows on both pages. Facts only.
import Link from "next/link";
import type { GameKey } from "@/lib/games";
import { majorHref } from "@/lib/handMajors";
import { characterWins, firstCharacterWins, nameHref } from "@/lib/historyFirsts";
import type { MessageKey, Values } from "@/lib/i18n/core";
import { startggCharacterKey } from "@/lib/majorSets";
import { playersHidingStats } from "@/lib/playerStats";

type Translate = (key: MessageKey, values?: Values) => string;

export default async function CharacterHistory({ game, character, name, t }: { game: GameKey; character: string; name: string; t: Translate }) {
  const all = await characterWins(game).catch(() => null);
  if (!all) return null;
  const mine = all.wins.filter((w) => w.characters.some((c) => startggCharacterKey(c) === character));
  if (!mine.length) return null;
  const ids = [...new Set(mine.flatMap((w) => (w.playerId ? [w.playerId] : [])))];
  const hidden = ids.length ? await playersHidingStats(ids).catch(() => null) : new Set<string>();
  if (!hidden) return null;
  const shown = mine.filter((w) => !w.playerId || !hidden.has(w.playerId));
  if (!shown.length) return null;
  const byPlayer = new Map<string, { key: string; playerId: string | null; name: string; wins: number }>();
  for (const w of shown) {
    const had = byPlayer.get(w.key);
    byPlayer.set(w.key, { key: w.key, playerId: w.playerId, name: w.name, wins: (had?.wins ?? 0) + 1 });
  }
  const top = [...byPlayer.values()].sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name)).slice(0, 5);
  const latest = [...shown].sort((a, b) => b.startAt.localeCompare(a.startAt)).slice(0, 5);
  // The character's first major win in the records, unless that winner keeps their stats hidden.
  const first = firstCharacterWins(all.wins).get(character);
  const firstShown = first && shown.includes(first) ? first : null;
  const who = (p: { playerId: string | null; name: string }) => (
    <Link href={p.playerId ? `/players/${p.playerId}` : nameHref(p.name)} className="font-semibold hover:underline">{p.name}</Link>
  );

  return (
    <section aria-labelledby="character-history" className="card flex flex-col gap-3 p-4">
      <h2 id="character-history" className="font-bold">{t("history.char.title", { name })}</h2>
      <p className="text-sm">{t("history.char.count", { n: shown.length, name })}</p>
      {firstShown && (
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="text-muted">{t("history.char.first")}</span>
          {who(firstShown)}
          <Link href={majorHref(firstShown.majorSlug)} className="hover:underline">{firstShown.majorName}</Link>
          {!firstShown.majorName.includes(firstShown.startAt.slice(0, 4)) && <span className="text-meta text-muted">{firstShown.startAt.slice(0, 4)}</span>}
        </p>
      )}
      <div className="flex flex-col gap-1">
        <h3 className="text-meta font-semibold text-muted">{t("history.char.most", { name })}</h3>
        <ol className="flex flex-col gap-0.5 text-sm">
          {top.map((p) => (
            <li key={p.key} className="flex items-baseline gap-2">
              {who(p)}
              <span className="text-muted">{t("history.records.winCount", { n: p.wins })}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-meta font-semibold text-muted">{t("history.char.latest")}</h3>
        <ul className="flex flex-col gap-0.5 text-sm">
          {latest.map((w) => (
            <li key={w.majorSlug} className="flex flex-wrap items-baseline gap-x-2">
              {who(w)}
              <Link href={majorHref(w.majorSlug)} className="hover:underline">{w.majorName}</Link>
              {!w.majorName.includes(w.startAt.slice(0, 4)) && <span className="text-meta text-muted">{w.startAt.slice(0, 4)}</span>}
            </li>
          ))}
        </ul>
      </div>
      <p className="text-meta text-muted">{t("history.char.note", { n: all.wins.length, total: all.majors })}</p>
    </section>
  );
}
