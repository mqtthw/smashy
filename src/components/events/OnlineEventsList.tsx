"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import GameBadge from "@/components/GameBadge";
import LocalTime from "@/components/ui/LocalTime";
import StartsIn from "@/components/host/StartsIn";
import { GAMES, GAME_KEYS, type GameKey } from "@/lib/games";
import { useStoredState } from "@/lib/useStoredState";
import { useViewerLocale, useViewerTimeZone } from "@/lib/viewerTimeZone";
import Icon from "@/components/ui/Icon";
import { useT } from "@/lib/i18n/client";

export type OnlineRow = {
  key: string;
  href: string;
  name: string;
  startAt: number; // unix seconds
  games: { game: GameKey; entrants: number | null }[];
  signupsOpen: boolean;
  onSmashy: boolean; // hosted on Smashy (sign up right here)
  live?: boolean; // running now (a Smashy bracket can start before the listed time; a start.gg one has passed its start)
  finished?: boolean; // over (still listed for a while so people can find the results)
  friends?: string | null; // "Fox + 1 you follow"
  brackets: { name: string; startAt: number | null }[];
};

const ALL = "all";

/**
 * Online brackets anyone can enter, soonest first, grouped by day in the viewer's own time zone
 * (online events have no venue, so local times are what people need). Filter by game, or to ones
 * still taking sign-ups.
 */
export default function OnlineEventsList({ rows }: { rows: OnlineRow[] }) {
  const [game, setGame] = useStoredState("smashy.online.game", ALL);
  const [openOnly, setOpenOnly] = useStoredState("smashy.online.open", "no");
  const [smashyOnly, setSmashyOnly] = useStoredState("smashy.online.smashy", "no");
  const t = useT();
  const tz = useViewerTimeZone();
  const locale = useViewerLocale();
  const shownGames = GAME_KEYS.filter((g) => !GAMES[g].legacy || rows.some((r) => r.games.some((x) => x.game === g)));
  const gameNow = game === ALL || shownGames.includes(game as GameKey) ? game : ALL;
  const visible = rows.filter((r) => (gameNow === ALL || r.games.some((g) => g.game === gameNow)) && (openOnly !== "yes" || r.signupsOpen) && (smashyOnly !== "yes" || r.onSmashy));

  const dayKey = (sec: number) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(sec * 1000);
  const fullDay = (sec: number) => new Intl.DateTimeFormat(locale, { timeZone: tz, weekday: "long", month: "short", day: "numeric" }).format(sec * 1000);
  // "Today · Monday, Nov 9" / "Tomorrow · …" (the viewer's own calendar day). Before the page knows the
  // time (first paint) it shows the plain date.
  const [nowSec, setNowSec] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNowSec(Math.floor(Date.now() / 1000));
    tick();
    const id = setInterval(tick, 10 * 60_000); // keeps "Today" right past midnight
    return () => clearInterval(id);
  }, []);
  const dayLabel = (sec: number) => {
    if (nowSec !== null) {
      if (dayKey(sec) === dayKey(nowSec)) return t("browse.online.today", { day: fullDay(sec) });
      if (dayKey(sec) === dayKey(nowSec + 86400)) return t("browse.online.tomorrow", { day: fullDay(sec) });
    }
    return fullDay(sec);
  };
  const days: { key: string; label: string; rows: OnlineRow[] }[] = [];
  for (const r of visible) {
    const k = dayKey(r.startAt);
    const last = days[days.length - 1];
    if (last && last.key === k) last.rows.push(r);
    else days.push({ key: k, label: dayLabel(r.startAt), rows: [r] });
  }

  return (
    <div>
      <div className="sticky top-0 z-[5] flex gap-2 overflow-x-auto border-b border-line glass-sticky px-4 py-3" role="group" aria-label={t("browse.list.filterGame")}>
        {[ALL, ...shownGames].map((g) => (
          <button key={g} type="button" onClick={() => setGame(g)} aria-pressed={gameNow === g} className="chip shrink-0">
            {g === ALL ? t("browse.list.allGames") : GAMES[g as GameKey].short}
          </button>
        ))}
        <span className="mx-1 w-px shrink-0 bg-line" aria-hidden="true" />
        <button type="button" onClick={() => setOpenOnly(openOnly === "yes" ? "no" : "yes")} aria-pressed={openOnly === "yes"} className="chip shrink-0">
          {t("event.status.open")}
        </button>
        <button type="button" onClick={() => setSmashyOnly(smashyOnly === "yes" ? "no" : "yes")} aria-pressed={smashyOnly === "yes"} className="chip shrink-0" title={t("browse.online.onSmashyHint")}>
          {t("browse.online.onSmashy")}
        </button>
      </div>
      <p className="px-4 pt-2 text-meta text-muted">
        {t("browse.online.count", { n: visible.length })}
      </p>
      {visible.length === 0 ? (
        <p className="p-6 text-muted">{smashyOnly === "yes" ? t("browse.online.emptySmashy") : openOnly === "yes" ? t("browse.online.emptyOpen") : t("browse.online.empty")}</p>
      ) : (
        days.map((d) => (
          <section key={d.key} aria-label={d.label}>
            <h2 className="sticky top-[3.25rem] z-[4] border-b border-line glass-sticky px-4 py-1.5 text-meta font-semibold uppercase tracking-wide text-muted">{d.label}</h2>
            <ul>
              {d.rows.map((r) => (
                <li key={r.key} className="border-b border-line">
                  <Link href={r.href} className="flex gap-3 px-4 py-3 hover:bg-surface">
                    <span className="w-[4.75rem] shrink-0 whitespace-nowrap text-sm font-bold tabular-nums">
                      <LocalTime iso={new Date(r.startAt * 1000).toISOString()} style="time" />
                      {r.live ? (
                        <span className="block text-meta font-semibold text-brand">{t("browse.live")}</span>
                      ) : r.finished ? (
                        // "Finished · Results" is wider than the time column and ran into the game badge
                        // (round 767): one word per line.
                        t("browse.online.finished")
                          .split(" · ")
                          .map((word) => (
                            <span key={word} className="block text-meta font-normal leading-tight text-muted">{word}</span>
                          ))
                      ) : (
                        <StartsIn iso={new Date(r.startAt * 1000).toISOString()} within={24 * 3600_000} prefix={t("event.in")} className="block text-meta font-semibold text-brand" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-bold">{r.name}</span>
                        {r.onSmashy && <span className="shrink-0 rounded-full border border-brand px-2 text-xs text-brand">{t("browse.online.onSmashy")}</span>}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5 text-meta">
                        {r.games.map((g) => <GameBadge key={g.game} game={g.game} entrants={g.entrants} />)}
                        {r.signupsOpen && <span className="font-semibold text-brand">{t("event.status.open")}</span>}
                        {r.friends && <span className="text-muted"><Icon name="user" /> {r.friends}</span>}
                      </span>
                      {r.brackets.length > 1 && (
                        <span className="mt-1 block truncate text-meta text-muted">{r.brackets.map((b) => b.name).join(" · ")}</span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
