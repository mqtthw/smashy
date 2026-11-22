"use client";

import { useEffect, useState } from "react";
import { useViewerLocale, useViewerTimeZone } from "@/lib/viewerTimeZone";

/**
 * The inbox's "last message" time: the time if it's today, else the date (reader's time zone and date
 * style). "Today" starts from the server's clock (so the first paint matches) and follows the device after.
 */
export default function InboxTime({ iso, serverNow }: { iso: string; serverNow: number }) {
  const timeZone = useViewerTimeZone();
  const locale = useViewerLocale();
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const tick = () => setNow(Math.floor(Date.now() / 1000));
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);
  const day = (d: Date) => new Intl.DateTimeFormat("en-US", { year: "numeric", month: "numeric", day: "numeric", timeZone }).format(d);
  const d = new Date(iso);
  const sameDay = day(d) === day(new Date(now * 1000));
  const text = new Intl.DateTimeFormat(locale, sameDay ? { hour: "numeric", minute: "2-digit", timeZone } : { month: "short", day: "numeric", timeZone }).format(d);
  return <time dateTime={iso}>{text}</time>;
}
