import Link from "next/link";
import { placeKey as ordinalKey } from "@/lib/i18n/core";
import type { PlayerInfo, Results as ResultsData } from "@/lib/hostedBracket";
import { getT } from "@/lib/i18n/server";
import PlaceMark from "@/components/ui/PlaceMark";

// Which ending a place takes in English ("1st", "12th"); each language fills in its own.

/** Final placements (elimination), pool standings (round robin) or the Swiss table. */
export default async function Results({ results, players, limit }: { results: ResultsData; players: Map<string, PlayerInfo>; limit?: number }) {
  const t = await getT();
  const name = (id: string) => players.get(id);
  if (results.kind === "elimination") {
    const list = limit ? results.placements.slice(0, limit) : results.placements;
    if (!list.length) return null;
    return (
      <ol className="card divide-y divide-line">
        {list.map((p) => (
          <li key={p.id} className="flex items-center gap-3 px-4 py-2">
            <span className="flex w-12 items-center gap-1.5 font-mono text-sm tabular-nums">{p.place <= 3 ? <PlaceMark place={p.place} size="sm" label={t(ordinalKey(p.place), { n: p.place })} /> : t(ordinalKey(p.place), { n: p.place })}</span>
            <span className="min-w-0 flex-1 truncate font-semibold">
              {name(p.id)?.handle ? <Link href={`/u/${name(p.id)!.handle}`} className="hover:underline">{name(p.id)!.tag}</Link> : (name(p.id)?.tag ?? t("event.results.player"))}
            </span>
          </li>
        ))}
      </ol>
    );
  }
  if (results.kind === "swiss") {
    const rows = limit ? results.standings.slice(0, limit) : results.standings;
    if (!rows.length) return null;
    const left = new Set(results.dropped);
    return (
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-meta text-muted">
            <tr>
              <th className="px-4 py-2 text-left font-normal">#</th>
              <th className="px-2 py-2 text-left font-normal">{t("event.results.player")}</th>
              <th className="px-2 py-2 text-right font-normal">{t("event.results.sets")}</th>
              <th className="px-2 py-2 text-right font-normal" title={t("event.results.oppWinsHint")}>{t("event.results.oppWins")}</th>
              <th className="px-4 py-2 text-right font-normal">{t("event.results.games")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-2 font-mono tabular-nums">{s.rank}</td>
                <td className="px-2 py-2 font-semibold">
                  {name(s.id)?.handle ? <Link href={`/u/${name(s.id)!.handle}`} className="hover:underline">{name(s.id)!.tag}</Link> : (name(s.id)?.tag ?? t("event.results.player"))}
                  {left.has(s.id) && <span className="ml-1.5 font-normal text-muted">{t("event.results.left")}</span>}
                </td>
                <td className="px-2 py-2 text-right font-mono tabular-nums">{s.wins}–{s.losses}</td>
                <td className="px-2 py-2 text-right font-mono tabular-nums">{s.opponentWins}</td>
                <td className="px-4 py-2 text-right font-mono tabular-nums">{s.gameDiff > 0 ? `+${s.gameDiff}` : s.gameDiff}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-line px-4 py-2 text-meta text-muted">{t("event.results.swissOrder")}</p>
      </div>
    );
  }
  const pools = [...new Set(results.standings.map((s) => s.pool))];
  return (
    <div className="flex flex-col gap-3">
      {pools.map((pool) => (
        <div key={pool} className="card overflow-x-auto">
          {pools.length > 1 && <h3 className="border-b border-line px-4 py-2 text-sm font-bold">{t("event.results.pool", { n: pool })}</h3>}
          <table className="w-full text-sm">
            <thead className="text-meta text-muted">
              <tr>
                <th className="px-4 py-2 text-left font-normal">#</th>
                <th className="px-2 py-2 text-left font-normal">{t("event.results.player")}</th>
                <th className="px-2 py-2 text-right font-normal">{t("event.results.sets")}</th>
                <th className="px-4 py-2 text-right font-normal">{t("event.results.games")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {results.standings.filter((s) => s.pool === pool).map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2 font-mono tabular-nums">{s.place}</td>
                  <td className="px-2 py-2 font-semibold">{name(s.id)?.tag ?? t("event.results.player")}</td>
                  <td className="px-2 py-2 text-right font-mono tabular-nums">{s.wins}–{s.losses}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">{s.gameDiff > 0 ? `+${s.gameDiff}` : s.gameDiff}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
