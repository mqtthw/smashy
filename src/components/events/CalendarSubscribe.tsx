"use client";

import { useState, useSyncExternalStore } from "react";
import { GAMES, MAIN_GAME_KEYS, type GameKey } from "@/lib/games";
import { useT } from "@/lib/i18n/client";
import NewTab from "@/components/ui/NewTab";

const noSubscribe = () => () => {};

/**
 * "Add to your calendar" for a region's tournaments: a feed the viewer's calendar app subscribes to, so
 * new tournaments show up there on their own (/events/calendar.ics). One game or all of them.
 */
export default function CalendarSubscribe({ region, regionLabel }: { region: string; regionLabel: string }) {
  const t = useT();
  const [game, setGame] = useState<GameKey | "">("");
  const [copied, setCopied] = useState(false);
  // The site's address, known only in the browser (null while the page is drawn on the server).
  const host = useSyncExternalStore(noSubscribe, () => window.location.host, () => null);
  const path = `/events/calendar.ics?region=${encodeURIComponent(region)}${game ? `&game=${game}` : ""}`;
  const https = host ? `${window.location.protocol}//${host}${path}` : path;
  const webcal = host ? `webcal://${host}${path}` : path;
  const google = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`;

  return (
    <details className="mx-4 rounded-xl border border-line px-3 py-2 text-sm">
      <summary className="cursor-pointer font-semibold">
        {t("browse.cal.title")}
      </summary>
      <div className="mt-2 flex flex-col gap-2">
        <p className="text-muted">{t("browse.cal.help", { region: regionLabel })}</p>
        <label className="flex items-center gap-2">
          <span>{t("browse.cal.game")}</span>
          <select value={game} onChange={(e) => setGame(e.target.value as GameKey | "")} className="rounded-full border border-line bg-field px-3 py-1">
            <option value="">{t("browse.cal.allGames")}</option>
            {MAIN_GAME_KEYS.map((g) => (
              <option key={g} value={g}>{GAMES[g].short}</option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <a href={webcal} className="btn btn-sm btn-primary">{t("browse.cal.phone")}</a>
          <a href={google} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline">{t("browse.cal.google")}<NewTab /></a>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={() => {
              navigator.clipboard?.writeText(https).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }, () => {});
            }}
          >
            {copied ? t("common.copied") : t("browse.cal.copy")}
          </button>
        </div>
        <p className="text-meta text-muted">{t("browse.cal.note")}</p>
      </div>
    </details>
  );
}
