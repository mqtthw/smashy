"use client";
// A player's placements: a one-line summary (wins, top 8s, the best finish at a big event) and the
// list, each linking to that event's bracket. For a claimed page it's their whole saved career, with
// a filter by game and more shown a page at a time.
import { placeKey } from "@/lib/i18n/base";
import Link from "next/link";
import { useMemo, useState } from "react";
import GameBadge from "@/components/GameBadge";
import LocalTime from "@/components/ui/LocalTime";
import { GAMES, type GameKey } from "@/lib/games";
import { bracketLabel } from "@/lib/bracketLabel";
import { summarizeResults, type PlayerResult } from "@/lib/playerResults";
import { useT } from "@/lib/i18n/client";

const STEP = 25;

/** Which "1st / 2nd / 3rd / 4th" phrase fits a placement. */

export default function PlayerResultsCard({ results, career = false, initial = 10 }: { results: PlayerResult[]; career?: boolean; initial?: number }) {
  const t = useT();
  const place = (n: number) => t(placeKey(n), { n });
  const [game, setGame] = useState<GameKey | null>(null);
  const [shown, setShown] = useState(initial);
  const games = useMemo(() => {
    const counts = new Map<GameKey, number>();
    for (const r of results) if (r.game) counts.set(r.game, (counts.get(r.game) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1]).map(([g]) => g);
  }, [results]);
  const list = useMemo(() => (game ? results.filter((r) => r.game === game) : results), [results, game]);
  if (!results.length) return null;
  const sum = summarizeResults(list);
  const first = list.reduce<number | null>((min, r) => (r.startAt && (min === null || r.startAt < min) ? r.startAt : min), null);

  return (
    <section aria-labelledby="results-heading" className="card flex flex-col gap-1 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="results-heading" className="font-bold">{career ? t("people.results.career") : t("people.results.title")}</h2>
        <span className="text-meta text-muted">
          {career
            ? first
              ? t("people.results.eventsSince", { n: list.length, year: new Date(first * 1000).getUTCFullYear() })
              : t("people.results.events", { n: list.length })
            : t("people.results.latest", { n: results.length })}
        </span>
      </div>
      {games.length > 1 && (
        <nav aria-label={t("people.games")} className="flex flex-wrap gap-1.5 py-1">
          <button type="button" aria-current={!game ? "page" : undefined} className="chip text-meta" onClick={() => (setGame(null), setShown(initial))}>
            {t("people.results.allGames")}
          </button>
          {games.map((g) => (
            <button key={g} type="button" aria-current={game === g ? "page" : undefined} className="chip text-meta" onClick={() => (setGame(g), setShown(initial))}>
              {GAMES[g].short}
            </button>
          ))}
        </nav>
      )}
      {sum.events > 0 && (
        <p className="text-sm">
          {sum.wins > 0 && <b>{t("people.results.wins", { n: sum.wins })}</b>}
          {sum.wins > 0 && " · "}
          {t("people.results.top8s", { n: sum.top8 })} {t("people.results.inEvents", { n: sum.events })}
          {sum.bestBig && (
            <span className="text-muted">
              {" "}
              · {t("people.results.bestBig", { place: place(sum.bestBig.placement), n: sum.bestBig.result.entrants, tournament: sum.bestBig.result.tournament })}
            </span>
          )}
        </p>
      )}
      <ul className="flex flex-col divide-y divide-line">
        {list.slice(0, shown).map((r) => (
          <li key={r.eventId} className="flex items-center gap-3 py-2 text-sm">
            <span className={`w-12 shrink-0 text-right font-bold tabular-nums ${r.placement === 1 ? "text-brand" : r.placement <= 8 ? "" : "text-muted"}`}>
              {place(r.placement)}
            </span>
            <span className="min-w-0 flex-1">
              <Link href={`/brackets/startgg/${r.eventId}`} className="block truncate font-semibold hover:underline">
                {r.tournament}
              </Link>
              <span className="block truncate text-meta text-muted">
                {r.game ? bracketLabel(r.eventName, r.game) : r.eventName} · {t(r.doubles ? "people.results.teams" : "people.results.entrants", { n: r.entrants })}
                {r.startAt ? (
                  <>
                    {" · "}
                    <LocalTime iso={new Date(r.startAt * 1000).toISOString()} style="date" />
                  </>
                ) : null}
              </span>
            </span>
            {!game && games.length > 1 && r.game && <GameBadge game={r.game} />}
          </li>
        ))}
      </ul>
      {list.length > shown && (
        <button type="button" className="border-t border-line py-2 text-left text-sm font-semibold text-brand" onClick={() => setShown((n) => n + STEP)}>
          {t("common.showMore", { n: Math.min(STEP, list.length - shown) })}
        </button>
      )}
    </section>
  );
}
