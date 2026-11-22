"use client";

// How old a clip is ("· 3h", "· 2d") and a "NEW" badge for clips under a day old. Shown after the
// page knows the time (first paint has neither, so server and browser match).
import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/timeAgo";
import { useViewerLocale, useViewerTimeZone } from "@/lib/viewerTimeZone";
import { useT } from "@/lib/i18n/client";

export default function ReelAge({ at }: { at: string }) {
  const tz = useViewerTimeZone();
  const locale = useViewerLocale();
  const t = useT();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Math.floor(Date.now() / 1000));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);
  if (now === null) return null;
  const fresh = now - Date.parse(at) / 1000 < 86400;
  return (
    <>
      <span>· {timeAgo(at, now, tz, locale)}</span>
      {fresh && <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-white">{t("media.reels.new")}</span>}
    </>
  );
}
