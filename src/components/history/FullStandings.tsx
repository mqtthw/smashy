// Smash history, step H3: a bracket's saved standings (top 64, from start.gg), folded away under its
// top 8 or winner. Names link to player pages when start.gg knows the player.
import Link from "next/link";
import type { MessageKey, Values } from "@/lib/i18n/core";
import { placeKey } from "@/lib/i18n/core";
import { STANDINGS_SIZE, type StandingRow } from "@/lib/majorStandings";
import { playersHidingStats } from "@/lib/playerStats";

type Translate = (key: MessageKey, values?: Values) => string;

/**
 * Saved standings without the players who asked not to be listed (and members who keep their stats to
 * themselves). If that can't be checked, nothing is shown.
 */
export async function visibleStandings(byEvent: Map<string, StandingRow[]>): Promise<Map<string, StandingRow[]>> {
  const ids = [...byEvent.values()].flat().flatMap((r) => (r.playerId ? [r.playerId] : []));
  const hidden = ids.length ? await playersHidingStats(ids).catch(() => null) : new Set<string>();
  if (!hidden) return new Map();
  return new Map([...byEvent].map(([id, rows]) => [id, rows.filter((r) => !r.playerId || !hidden.has(r.playerId))]));
}

export default function FullStandings({ rows, entrants, t, className = "" }: { rows: StandingRow[] | undefined; entrants: number | null; t: Translate; className?: string }) {
  if (!rows?.length) return null;
  const whole = entrants !== null && entrants <= STANDINGS_SIZE;
  return (
    <details className={className}>
      <summary className="cursor-pointer text-sm font-semibold text-brand">
        {whole ? t("history.standings.all") : t("history.standings.top", { n: STANDINGS_SIZE })}
      </summary>
      <ol className="mt-2 flex flex-col gap-0.5 text-sm">
        {rows.map((r, i) => (
          <li key={i} className="flex gap-3">
            <span className="w-10 shrink-0 text-muted">{t(placeKey(r.place), { n: r.place })}</span>
            {r.playerId ? <Link href={`/players/${r.playerId}`} className="hover:underline">{r.name}</Link> : <span>{r.name}</span>}
          </li>
        ))}
      </ol>
      <p className="mt-1 text-meta text-muted">{t("history.standings.source")}</p>
    </details>
  );
}
