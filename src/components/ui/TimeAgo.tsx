"use client";

import { useEffect, useState } from "react";
import { fullTime, timeAgo } from "@/lib/timeAgo";
import { useViewerLocale, useViewerTimeZone } from "@/lib/viewerTimeZone";
import { useT } from "@/lib/i18n/client";

/**
 * "5m" that keeps itself up to date while the page is open, in the reader's own time zone. Starts from
 * the server's time (so the first paint matches), then ticks every 30 seconds. Hover for the exact time.
 * `editedAt`: adds "· edited" with the edit time on hover.
 */
export default function TimeAgo({ at, serverNow, editedAt = null }: { at: string; serverNow: number; editedAt?: string | null }) {
  const tz = useViewerTimeZone();
  const locale = useViewerLocale();
  const t = useT();
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const tick = () => setNow(Math.floor(Date.now() / 1000));
    const t = setInterval(tick, 30_000);
    const first = setTimeout(tick, 0);
    return () => {
      clearInterval(t);
      clearTimeout(first);
    };
  }, []);
  const ago = timeAgo(at, now, tz, locale); // "now", "5m", "3h", "2d" or a date in the reader's own format
  return (
    <>
      <time dateTime={at} title={fullTime(at, tz, locale)}>
        {ago === "now" ? t("ui.time.now") : ago}
      </time>
      {editedAt && <span title={t("ui.time.editedAt", { time: fullTime(editedAt, tz, locale) })}> · {t("ui.time.edited")}</span>}
    </>
  );
}
