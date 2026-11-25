"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import GameBadge from "@/components/GameBadge";
import EventTimes, { zoneLabel } from "@/components/events/EventTimes";
import type { EventRow } from "@/lib/eventRows";
import { dayDate, dayKey, monthGrid, monthOf, shiftMonth, weekStartFor } from "@/lib/eventCalendar";
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
  const matching = rows.filter(
    (r) => (shownGame === ALL || r.games.some((g) => g.game === shownGame)) && (shownCity === ALL || r.city === shownCity),
  );
  // The calendar (round 729): open or closed is remembered; the picked day isn't (it's for one look-up,
  // like "I'm in Texas that weekend, what's on?"). Days are each venue's own date.
  const [calendar, setCalendar] = useStoredState("smashy.events.calendar", "off");
  const [picked, setPicked] = useState<string | null>(null);
  const days = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of matching) counts.set(dayKey(r.startAt, r.timezone), (counts.get(dayKey(r.startAt, r.timezone)) ?? 0) + 1);
    return counts;
  }, [matching]);
  const day = calendar === "on" && picked && days.has(picked) ? picked : null;
  const visible = day ? matching.filter((r) => dayKey(r.startAt, r.timezone) === day) : matching;
  // Times are each venue's own. Say which zone when they all share one ("CST"), so visitors from
  // elsewhere don't read them as their own time.
  const zones = new Set(visible.map((r) => zoneLabel(r.startAt, r.timezone)));
  const zoneNote = zones.size === 1 ? t("browse.list.zoneOne", { zone: [...zones][0] }) : t("browse.list.zoneEach");

  return (
    <div>
      <div className="sticky top-0 z-[5] flex flex-col gap-3 border-b border-line glass-sticky px-4 py-3">
        <div className="scroll-fade flex gap-2 overflow-x-auto pr-6 sm:pr-0 sm:[mask-image:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible" role="group" aria-label={t("browse.list.filterGame")}>
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
        <div className="flex items-center gap-2">
        <label className="flex min-w-0 items-center gap-2 text-sm text-muted">
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
          <button type="button" onClick={() => setCalendar(calendar === "on" ? "off" : "on")} aria-pressed={calendar === "on"} className="chip ml-auto shrink-0">
            {t("browse.cal.toggle")}
          </button>
        </div>
      </div>

      {calendar === "on" && days.size > 0 && <EventCalendar days={days} picked={day} onPick={setPicked} />}
      {day && (
        <p className="flex items-center gap-2 px-4 pt-3 text-sm">
          <span className="font-semibold">{dayDate(day).toLocaleDateString(lang, { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })}</span>
          <button type="button" onClick={() => setPicked(null)} className="text-brand underline">{t("browse.cal.showAll")}</button>
        </p>
      )}

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

/**
 * One month at a time, a dot under each day that has a tournament matching the filters. Pressing such
 * a day shows just that day's tournaments in the list below; pressing it again shows them all.
 */
function EventCalendar({ days, picked, onPick }: { days: Map<string, number>; picked: string | null; onPick: (day: string | null) => void }) {
  const t = useT();
  const lang = useLang();
  const sorted = [...days.keys()].sort();
  const first = monthOf(sorted[0]);
  const last = monthOf(sorted[sorted.length - 1]);
  const [month, setMonth] = useState(first);
  // Filters changed and the month on screen has nothing left in range: go back to the first month.
  const shown = month < first || month > last ? first : month;
  // Today is the visitor's own date, known only in the browser (so it's marked after the page loads).
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => {
    const now = new Date();
    setToday(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`); // eslint-disable-line react-hooks/set-state-in-effect -- the browser's date
  }, []);
  const start = weekStartFor(lang);
  const weeks = monthGrid(shown, start);
  // Weekday initials for the header: any week will do, 2023-01-01 was a Sunday.
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(2023, 0, 1 + start + i)).toLocaleDateString(lang, { weekday: "narrow", timeZone: "UTC" }));
  const title = dayDate(`${shown}-01`).toLocaleDateString(lang, { month: "long", year: "numeric", timeZone: "UTC" });
  const arrow = "rounded-full p-2 text-muted hover:bg-surface disabled:opacity-30";
  return (
    <section aria-label={t("browse.cal.label")} className="card mx-3 mt-3 p-3">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => setMonth(shiftMonth(shown, -1))} disabled={shown <= first} aria-label={t("browse.cal.prev")} className={arrow}>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current" strokeWidth={2.5}><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <h2 className="font-bold" aria-live="polite">{title}</h2>
        <button type="button" onClick={() => setMonth(shiftMonth(shown, 1))} disabled={shown >= last} aria-label={t("browse.cal.next")} className={arrow}>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current" strokeWidth={2.5}><path d="M9 6l6 6-6 6" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-meta text-muted" aria-hidden="true">
        {weekdays.map((w, i) => <span key={i}>{w}</span>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-y-1 text-center">
        {weeks.flat().map((d, i) => {
          if (!d) return <span key={i} />;
          const n = days.get(d) ?? 0;
          const num = Number(d.slice(8));
          const isPicked = picked === d;
          const label = `${dayDate(d).toLocaleDateString(lang, { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })}: ${t("browse.cal.count", { n })}`;
          if (!n) return <span key={d} className={`flex h-11 flex-col items-center justify-start pt-1.5 text-sm text-muted/60 ${today === d ? "font-bold text-foreground" : ""}`}>{num}</span>;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onPick(isPicked ? null : d)}
              aria-pressed={isPicked}
              aria-label={label}
              title={label}
              className={`mx-auto flex h-11 w-11 flex-col items-center justify-start rounded-xl pt-1.5 text-sm font-semibold ${isPicked ? "bg-brand text-white" : "hover:bg-surface"} ${today === d && !isPicked ? "ring-1 ring-line" : ""}`}
            >
              {num}
              {/* One dot, or up to three for a busy day. */}
              <span aria-hidden="true" className="mt-0.5 flex gap-0.5">
                {Array.from({ length: Math.min(n, 3) }, (_, k) => <span key={k} className={`h-1.5 w-1.5 rounded-full ${isPicked ? "bg-white" : "bg-brand"}`} />)}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
