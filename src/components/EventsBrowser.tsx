"use client";

import Link from "next/link";
import { useMemo } from "react";
import GameBadge from "@/components/GameBadge";
import EventTimes, { zoneLabel } from "@/components/events/EventTimes";
import type { EventRow } from "@/lib/eventRows";
import { dateBadgeParts, formatEventDate } from "@/lib/format";
import { GAMES, GAME_KEYS, type GameKey } from "@/lib/games";
import { useStoredState } from "@/lib/useStoredState";
import { useLang, useT } from "@/lib/i18n/client";

const ALL = "all";

export default function EventsBrowser({
  rows,
  region = "US-TX",
  regionLabel = "Texas",
}: {
  rows: EventRow[]; // built on the server (src/lib/eventRows.ts), "Live" worked out there
  region?: string;
  regionLabel?: string;
}) {
  const t = useT();
  const lang = useLang();
  // Remembered per browser, so guests keep their filters without an account.
  const [game, setGame] = useStoredState("smashy.events.game", ALL);
  const [city, setCity] = useStoredState(`smashy.events.city:${region}`, ALL);

  // Cities sorted by how many events they have.
  const cities = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) if (r.city) counts.set(r.city, (counts.get(r.city) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  }, [rows]);

  const gameKeys = [ALL, ...GAME_KEYS.filter((g) => !GAMES[g].legacy || rows.some((r) => !r.expected && r.games.some((x) => x.game === g)))];
  // A remembered filter that no longer applies (a city with nothing this week, a game chip that isn't
  // shown) counts as "All", for both the menu and the list.
  const shownCity = cities.includes(city) ? city : ALL;
  const shownGame = gameKeys.includes(game) ? game : ALL;
  const visible = rows.filter(
    (r) => (shownGame === ALL || r.games.some((g) => g.game === shownGame)) && (shownCity === ALL || r.city === shownCity),
  );
  // Times are each venue's own. Say which zone when they all share one ("CST"), so visitors from
  // elsewhere don't read them as their own time.
  const zones = new Set(visible.map((r) => zoneLabel(r.startAt, r.timezone)));
  const zoneNote = zones.size === 1 ? t("browse.list.zoneOne", { zone: [...zones][0] }) : t("browse.list.zoneEach");

  return (
    <div>
      <div className="sticky top-0 z-[5] flex flex-col gap-3 border-b border-line glass-sticky px-4 py-3">
        <div className="flex gap-2 overflow-x-auto" role="group" aria-label={t("browse.list.filterGame")}>
          {gameKeys.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setGame(key)}
              aria-pressed={shownGame === key}
              className="chip shrink-0"
            >
              {key === ALL ? t("browse.list.allGames") : GAMES[key as GameKey].short}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          {t("browse.list.city")}
          <select
            value={shownCity}
            onChange={(e) => setCity(e.target.value)}
            className="field px-2 py-1"
          >
            <option value={ALL}>{t("browse.list.allOf", { region: regionLabel })}</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="p-6 text-muted">{t("browse.list.noMatch")}</p>
      ) : (
        <>
        <p className="px-4 pt-2 text-meta text-muted">{zoneNote}</p>
        <ul className="card mx-3 my-3 divide-y divide-line overflow-hidden">
          {visible.map((r) => {
            const [weekday] = formatEventDate(r.startAt, r.timezone, lang).split(", ");
            // A glossy date bubble (round 493): red while the event is running.
            const d = dateBadgeParts(r.startAt, r.timezone, lang);
            return (
              <li key={r.key}>
                <Link href={r.href} className="flex gap-3 px-3 py-4 hover:bg-surface">
                  <div className="flex w-12 shrink-0 flex-col items-center gap-1 text-center">
                    <div className="text-xs font-semibold uppercase text-brand">{weekday}</div>
                    <span className={`date-bubble ${r.live ? "date-bubble-live" : ""}`} aria-hidden="true">
                      <span className={`text-[0.625rem] font-bold ${r.live ? "" : "text-brand"}`}>{d.month}</span>
                      <span className="text-lg font-bold">{d.day}</span>
                    </span>
                    <span className="sr-only">{formatEventDate(r.startAt, r.timezone, lang)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {r.live && <span className="shrink-0 text-meta font-semibold text-brand">{t("browse.live")}</span>}
                      <h2 className="truncate font-bold">{r.name}</h2>
                      {r.expected && (
                        <span className="shrink-0 rounded-full border border-dashed border-muted px-2 text-xs text-muted">
                          {t("browse.expected")}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-sm text-muted">
                      {[r.city, r.venueName].filter(Boolean).join(" · ") || t("browse.locationTba")}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {r.games.map(({ game: g, entrants }) => (
                        <GameBadge key={g} game={g} entrants={entrants} />
                      ))}
                    </div>
                    {/* When each bracket starts (singles, doubles...), so nobody has to open the event to find out. */}
                    {r.events.some((e) => e.startAt && (shownGame === ALL || e.game === shownGame)) && (
                      <div className="mt-2">
                        <EventTimes events={shownGame === ALL ? r.events : r.events.filter((e) => e.game === shownGame)} timezone={r.timezone} compact t={t} lang={lang} />
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
        </>
      )}
    </div>
  );
}
