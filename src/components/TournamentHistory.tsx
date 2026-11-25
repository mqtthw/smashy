"use client";

import { placeKey } from "@/lib/i18n/base";
import Link from "next/link";
import { useState, useTransition } from "react";
import { loadMoreHistory } from "@/app/profile/actions";
import GameBadge from "@/components/GameBadge";
import { formatEventDate } from "@/lib/format";
import { GAMES, GAME_KEYS, type GameKey } from "@/lib/games";
import type { HistoryEntry } from "@/lib/startgg";
import { useLang, useT } from "@/lib/i18n/client";

/** Which "1st / 2nd / 3rd / 4th" phrase fits a placement (13 -> "13th", 33 -> "33rd"). */

export default function TournamentHistory({
  initial,
  initialHasMore,
  total,
  now,
}: {
  initial: HistoryEntry[];
  initialHasMore: boolean;
  total: number;
  now: number;
}) {
  const t = useT();
  const lang = useLang();
  const [entries, setEntries] = useState(initial);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(1);
  const [game, setGame] = useState<GameKey | "all">("all");
  const [loading, startLoading] = useTransition();

  const gamesPlayed = GAME_KEYS.filter((g) => entries.some((e) => e.game === g));
  const visible = entries.filter((e) => game === "all" || e.game === game);

  const showMore = () =>
    startLoading(async () => {
      const next = await loadMoreHistory(page + 1);
      setEntries((cur) => [...cur, ...next.entries]);
      setHasMore(next.hasMore);
      setPage((p) => p + 1);
    });

  if (entries.length === 0) {
    return <p className="text-sm text-muted">{t("people.history.none")}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted">{t("people.history.count", { n: total })}</p>
        {gamesPlayed.length > 1 && (
          <div className="flex gap-1.5" role="group" aria-label={t("people.history.filter")}>
            {(["all", ...gamesPlayed] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGame(g)}
                aria-pressed={game === g}
                className="chip px-2.5 py-0.5 text-xs"
              >
                {g === "all" ? t("people.history.all") : GAMES[g].short}
              </button>
            ))}
          </div>
        )}
      </div>

      <ul className="divide-y divide-line card">
        {visible.map((e) => {
          const upcoming = e.placement === null && e.startAt > now;
          return (
            <li key={e.eventId}>
              <Link href={`/events/${e.tournamentSlug}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface">
                <div className="w-16 shrink-0 text-center">
                  {e.placement ? (
                    <>
                      <div className={`text-lg font-bold leading-tight ${e.placement <= 3 ? "text-brand" : ""}`}>{t(placeKey(e.placement), { n: e.placement })}</div>
                      <div className="text-xs text-muted">{t("people.history.of", { n: e.numEntrants ?? "?" })}</div>
                    </>
                  ) : (
                    <div className="text-xs text-muted">{upcoming ? t("people.history.signedUp") : "—"}</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{e.tournamentName}</p>
                  <p className="truncate text-sm text-muted">
                    {formatEventDate(e.startAt, e.timezone, lang)}
                    {e.isOnline ? ` · ${t("event.online")}` : e.city ? ` · ${e.city}` : ""}
                    {` · ${e.eventName}`}
                  </p>
                </div>
                {/* Only when they've played more than one game (round 835), like the filter above. */}
                {gamesPlayed.length > 1 && <GameBadge game={e.game} />}
              </Link>
            </li>
          );
        })}
      </ul>

      {hasMore && (
        <button
          type="button"
          onClick={showMore}
          disabled={loading}
          className="self-center btn btn-md btn-outline"
        >
          {loading ? t("people.history.loading") : t("people.history.showMore")}
        </button>
      )}
    </div>
  );
}
