// Smash history: a year's tally for one game (counts from the saved majors, not a ranking) and the
// community's own rankings for that year, linked and credited (Matthew, 2026-11-17).
import Link from "next/link";
import NewTab from "@/components/ui/NewTab";
import { rankingsFor } from "@/lib/communityRankings";
import { GAMES, type GameKey } from "@/lib/games";
import type { MessageKey, Values } from "@/lib/i18n/core";
import type { MajorEvent } from "@/lib/majorEvents";
import { playersHidingStats } from "@/lib/playerStats";
import { applyNameLinks, getNameLinks } from "@/lib/playerLinks";
import { ARCHIVE_FIRST_YEAR, MAJOR_THRESHOLDS } from "@/lib/majors";
import { yearTally } from "@/lib/yearTally";
import { FIRST_GRID_YEAR, handSetYears, hasGrid } from "@/lib/yearHeadToHead";

type Translate = (key: MessageKey, values?: Values) => string;
const SHOWN = 20;

export default async function YearTally({ year, game, byMajor, t }: { year: number; game: GameKey | null; byMajor: MajorEvent[][]; t: Translate }) {
  const rankings = rankingsFor(year, game);
  // Names an admin linked to a start.gg player count as that player (Smash history H2).
  const links = game ? await getNameLinks().catch(() => new Map<string, string>()) : new Map<string, string>();
  const tally = game ? yearTally(byMajor.map((events) => applyNameLinks(events, links)), game, MAJOR_THRESHOLDS[game]) : null;
  // Players who asked not to be listed, and members who keep their stats to themselves, are left out.
  // If that can't be checked, no tally is shown.
  const ids = (tally?.rows ?? []).flatMap((r) => (r.playerId ? [r.playerId] : []));
  const hidden = ids.length ? await playersHidingStats(ids).catch(() => null) : new Set<string>();
  const rows = tally && hidden ? tally.rows.filter((r) => !r.playerId || !hidden.has(r.playerId)).slice(0, SHOWN) : [];
  const handYears = game && year < FIRST_GRID_YEAR ? await handSetYears().catch(() => [] as number[]) : [];

  if (!rows.length && !rankings.length && game) return null;
  return (
    <section aria-labelledby="history-tally" className="flex flex-col gap-2">
      <h2 id="history-tally" className="font-bold">{game ? t("history.tally.title", { game: GAMES[game].short, year }) : t("history.tally.rankingsTitle", { year })}</h2>
      {game && rows.length > 0 && tally && (
        <>
          <p className="text-meta text-muted">{year < ARCHIVE_FIRST_YEAR
              ? t("history.tally.noteHand", { n: tally.majors, game: GAMES[game].short, year })
              : t("history.tally.note", { n: tally.majors, game: GAMES[game].short, year, min: MAJOR_THRESHOLDS[game] })}</p>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-meta text-muted">
                  <th scope="col" className="px-4 py-2 font-normal">{t("history.tally.player")}</th>
                  <th scope="col" className="px-2 py-2 text-right font-normal">{t("history.tally.wins")}</th>
                  <th scope="col" className="px-2 py-2 text-right font-normal">{t("history.tally.seconds")}</th>
                  <th scope="col" className="px-4 py-2 text-right font-normal">{t("history.tally.top8s")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.key}>
                    <td className="px-4 py-1.5">{r.playerId ? <Link href={`/players/${r.playerId}`} className="hover:underline">{r.name}</Link> : r.name}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{r.wins}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{r.seconds}</td>
                    <td className="px-4 py-1.5 text-right tabular-nums">{r.top8s}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasGrid(year, handYears) && (
            <Link href={`/history/head-to-head?year=${year}&game=${game}`} className="self-start text-sm font-semibold text-brand">
              {t("history.grid.link", { year })}
            </Link>
          )}
        </>
      )}
      {!game && <p className="text-meta text-muted">{t("history.tally.pickGame", { year })}</p>}
      {rankings.length > 0 && (
        <p className="text-sm">
          <span className="text-muted">{t("history.tally.community")} </span>
          {rankings.map((r, i) => (
            <span key={`${r.game}|${r.name}`}>
              {i > 0 && " · "}
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="link">
                {r.name}{!game ? ` (${GAMES[r.game].short})` : ""} ↗︎<NewTab />
              </a>
            </span>
          ))}
          <span className="text-muted"> {t("history.tally.onSmashWiki")}</span>
        </p>
      )}
    </section>
  );
}
