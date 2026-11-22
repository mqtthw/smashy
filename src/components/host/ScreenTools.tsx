"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useLang, useT } from "@/lib/i18n/client";
import { localeFor } from "@/lib/i18n/base";

const onFullscreenChange = (listener: () => void) => {
  document.addEventListener("fullscreenchange", listener);
  return () => document.removeEventListener("fullscreenchange", listener);
};
const never = () => () => {};

/** The venue screen's corner: a clock, a full-screen button and the way back. */
export default function ScreenTools({ backHref, timeZone }: { backHref: string; timeZone: string }) {
  const t = useT();
  const locale = localeFor(useLang()); // the clock in the screen's language (9:26 a.m., 9:26…)
  const [time, setTime] = useState("");
  const full = useSyncExternalStore(onFullscreenChange, () => !!document.fullscreenElement, () => false);
  const canFull = useSyncExternalStore(never, () => !!document.documentElement.requestFullscreen, () => false);

  useEffect(() => {
    const tick = () => {
      try {
        setTime(new Intl.DateTimeFormat(locale, { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date()));
      } catch {
        setTime(new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(new Date()));
      }
    };
    tick();
    const t = setInterval(tick, 10_000);
    return () => clearInterval(t);
  }, [timeZone, locale]);

  return (
    <div className="flex shrink-0 items-center gap-3">
      {time && <span className="font-mono text-xl tabular-nums text-muted md:text-3xl">{time}</span>}
      {!full && canFull && (
        <button type="button" onClick={() => void document.documentElement.requestFullscreen().catch(() => {})} className="btn btn-sm btn-outline">
          {t("hostbracket.screen.fullScreen")}
        </button>
      )}
      {!full && (
        <Link href={backHref} className="btn btn-sm btn-ghost">
          {t("common.close")}
        </Link>
      )}
    </div>
  );
}
