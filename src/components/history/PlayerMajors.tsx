// A player's placings at the majors in Smash history (docs/archive-plan.md, steps A5 and H3): facts from
// the saved top 8s and full standings (top 64), one combined list newest first (Matthew, 2026-11-19). Shown on player pages only when the player may be shown at all.
import Link from "next/link";
import GameBadge from "@/components/GameBadge";
import { majorHref } from "@/lib/handMajors";
import { placeKey } from "@/lib/i18n/core";
import { getT } from "@/lib/i18n/server";
import { bestPerMajor, getPlayerMajors } from "@/lib/majorEvents";
import PlaceMark from "@/components/ui/PlaceMark";
import { GAMES, type GameKey } from "@/lib/games";
import CharacterStocks from "@/components/history/CharacterStocks";
import { handAddedPlacings, mostPlayedIn, playerMilestone, playerNameKeys, winBrackets, type Milestone } from "@/lib/historyFirsts";
import { getMajorCharacters, tagOnly, type MajorCharacters } from "@/lib/majorSets";
import { rankingPlaces, type RankingPlace } from "@/lib/officialRankings";
import { getNameLinks, linksForGame, nameKey } from "@/lib/playerLinks";

const SHOWN = 25;

export default async function PlayerMajors({ playerId }: { playerId: string }) {
  const [saved, t, links] = await Promise.all([
    getPlayerMajors(playerId).catch((e) => {
      console.error("Couldn't read a player's majors:", e instanceof Error ? e.message : e);
      return [];
    }),
    getT(),
    getNameLinks().catch(() => new Map<string, string>()),
  ]);
  if (!saved.length) return null;
  // Each game's records (shared, refreshed every few hours): hand-added results matched to this player by
  // the name they placed under (Mango's 2008-2016 wins on Mang0's page), then their milestones.
  const games = [...new Set(saved.map((r) => r.game))] as GameKey[];
  const byGame = new Map(await Promise.all(games.map(async (g) => [g, await winBrackets(g).catch(() => null)] as const)));
  const rows = bestPerMajor([...saved, ...games.flatMap((g) => handAddedPlacings(byGame.get(g) ?? [], g, linksForGame(links, g), playerId))]);
  // The characters they played at each: a hand-added result's own, else the sets start.gg saved for that bracket.
  const needSets = rows.filter((r) => !r.characters?.length && r.eventId);
  const sets = needSets.length ? await getMajorCharacters([...new Set(needSets.map((r) => r.slug))]).catch((): MajorCharacters => new Map()) : new Map();
  for (const r of needSets) r.characters = sets.get(`${r.slug}|${r.eventId}`)?.get(playerId) ?? r.characters;
  const played = games
    .map((g) => ({ game: g, mains: mostPlayedIn(rows.filter((r) => r.game === g && !r.side)) }))
    .filter((x) => x.mains.length > 0);
  const wins = rows.filter((r) => r.place === 1 && !r.side).length; // side events and doubles aren't major wins
  const top8s = rows.filter((r) => r.place <= 8).length;
  // Milestones (storylines from the records) for each game they won a major in.
  const wonIn = [...new Set(rows.filter((r) => r.place === 1 && !r.side).map((r) => r.game))] as GameKey[];
  const milestones = wonIn
    .map((g) => {
      const brackets = byGame.get(g);
      return brackets ? playerMilestone(brackets, g, linksForGame(links, g), playerId) : null;
    })
    .filter((m): m is Milestone => !!m && !!(m.first || m.run || m.wait));
  // The community's rankings that listed them (matched by the tags they placed under in that game).
  const ranked = games
    .map((g) => ({ game: g, places: rankingPlaces(g, playerNameKeys(byGame.get(g) ?? [], linksForGame(links, g), playerId), (n) => nameKey(tagOnly(n))) }))
    .filter((r) => r.places.length > 0);
  const span = (r: RankingPlace["ranking"]) => (r.alsoYears?.length ? `${r.year}–${r.alsoYears.at(-1)}` : String(r.year));
  const year = (iso: string) => iso.slice(0, 4);
  const named = (name: string, iso: string) => (name.includes(year(iso)) ? name : `${name} (${year(iso)})`);
  return (
    <section aria-labelledby="player-majors" className="flex flex-col gap-2 px-4 pt-4">
      <h2 id="player-majors" className="font-bold">{t("history.player.title")}</h2>
      <p className="text-meta text-muted">
        {t("history.player.majors", { n: rows.length })}
        {top8s > 0 ? ` · ${t("history.player.summary", { n: top8s })}` : ""}
        {wins > 0 ? ` · ${t("history.player.wins", { n: wins })}` : ""}
      </p>
      {rows.length > 1 && (
        <p className="text-meta text-muted">
          {t("history.player.span", {
            first: rows[rows.length - 1].majorName,
            firstYear: new Date(rows[rows.length - 1].startAt).getUTCFullYear(),
            last: rows[0].majorName,
            lastYear: new Date(rows[0].startAt).getUTCFullYear(),
          })}
        </p>
      )}
      {played.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm" aria-label={t("history.name.played")}>
          {played.map(({ game, mains }) => (
            <li key={game} className="flex flex-wrap items-center gap-x-2">
              <span className="font-semibold">{GAMES[game].short}</span>
              <span className="text-muted">{t("history.name.played")}</span>
              <CharacterStocks game={game} names={mains} size={18} />
              <span>{mains.join(", ")}</span>
            </li>
          ))}
        </ul>
      )}
      {milestones.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm" aria-label={t("history.player.milestones")}>
          {milestones.map((m) => (
            <li key={m.game} className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-semibold">{GAMES[m.game].short}</span>
              {m.first && (
                <span>
                  {t("history.player.firstWin")} <Link href={majorHref(m.first.majorSlug)} className="hover:underline">{named(m.first.majorName, m.first.startAt)}</Link>
                </span>
              )}
              {m.run && m.run.streak >= 2 && (
                <span className="text-muted">
                  · {t("history.player.run", { n: m.run.streak })} <Link href={majorHref(m.run.majorSlug)} className="hover:underline">{m.run.majorName}</Link>
                </span>
              )}
              {m.wait && (
                <span className="text-muted">
                  · {t("history.player.wait", { n: Math.floor((Date.parse(m.wait.startAt) - Date.parse(m.wait.previousAt)) / (365.25 * 86400_000)) })} <Link href={majorHref(m.wait.majorSlug)} className="hover:underline">{m.wait.majorName}</Link>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {ranked.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm" aria-label={t("history.player.rankings")}>
          {ranked.map(({ game, places }) => (
            <li key={game} className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-semibold">{GAMES[game].short}</span>
              <span className="text-muted">{t("history.player.yearEnd")}</span>
              {places
                .filter((p) => p.ranking.kind !== "mid")
                .map((p) => (
                  <Link key={p.ranking.page} href={`/history?year=${p.ranking.year}&game=${game}`} title={p.ranking.name} className="tabular-nums hover:underline">
                    {span(p.ranking)} #{p.rank}
                  </Link>
                ))}
              <span className="text-meta text-muted">· {t("history.player.rankedIn", { n: places.length })}</span>
            </li>
          ))}
        </ul>
      )}
      <ul className="card divide-y divide-line">
        {rows.slice(0, SHOWN).map((r) => (
          <li key={`${r.slug}|${r.game}`}>
            <Link href={majorHref(r.slug)} className="flex items-center gap-3 px-4 py-2 hover:bg-surface">
              <PlaceMark place={r.place} label={t(placeKey(r.place), { n: r.place })} />
              {r.characters?.length ? <CharacterStocks game={r.game} names={r.characters} /> : null}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{r.majorName}</span>
                <span className="block truncate text-meta text-muted">
                  {new Date(r.startAt).getUTCFullYear()} · {r.eventName}
                  {r.entrants ? ` · ${t("browse.entrants", { n: r.entrants })}` : ""}
                </span>
              </span>
              <GameBadge game={r.game} />
            </Link>
          </li>
        ))}
      </ul>
      {rows.length > SHOWN && <p className="text-meta text-muted">{t("history.player.more", { n: rows.length - SHOWN })}</p>}
      <p className="text-meta text-muted">
        {t("history.player.note")} <Link href="/history" className="link">{t("history.title")}</Link>
      </p>
    </section>
  );
}
