"use client";

// "Enjoying Smashy?" inside the Android app, from the 5th time it's opened (round 703): ratings help Smashy show
// up in Google Play searches. "Not now" asks again in 60 days; tapping "Rate" never asks again. No reward is
// offered (Google's rule). Not on iPhone: Apple's rule 5.6.1 only allows its own built-in rating prompt, which
// needs a change inside the app (the next app build), so nothing shows there.
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PLAY_STORE_URL } from "@/lib/contact";
import { useT } from "@/lib/i18n/client";
import { appPlatform } from "@/lib/nativePush";
import { SIGNING_UP } from "./InstallPrompt";

const OPENS_KEY = "smashy-app-opens";
const DISMISSED_KEY = "smashy-rate-dismissed"; // when "Not now" was tapped (ms)
const RATED_KEY = "smashy-rate-done";
const SHOW_FROM_OPEN = 5;
const ASK_AGAIN_MS = 60 * 86400e3;

/** Whether to ask now, from the saved counts (plain logic, for tests). */
export function shouldAskToRate(opens: number, dismissedAt: number, rated: boolean, now: number): boolean {
  return !rated && opens >= SHOW_FROM_OPEN && now - dismissedAt >= ASK_AGAIN_MS;
}

export default function RateAppPrompt() {
  const t = useT();
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (appPlatform() !== "android") return;
    let opens = 0;
    let dismissed = 0;
    let rated = false;
    try {
      opens = Number(window.localStorage.getItem(OPENS_KEY) ?? 0) || 0;
      if (!window.sessionStorage.getItem(OPENS_KEY)) {
        window.sessionStorage.setItem(OPENS_KEY, "1");
        opens += 1;
        window.localStorage.setItem(OPENS_KEY, String(opens));
      }
      dismissed = Number(window.localStorage.getItem(DISMISSED_KEY) ?? 0) || 0;
      rated = window.localStorage.getItem(RATED_KEY) === "1";
    } catch {
      return;
    }
    if (!shouldAskToRate(opens, dismissed, rated, Date.now())) return;
    const timer = setTimeout(() => setShow(true), 8000); // not the moment the app opens
    return () => clearTimeout(timer);
  }, []);

  if (!show || SIGNING_UP.test(pathname ?? "")) return null;
  const remember = (key: string, value: string) => {
    setShow(false);
    try {
      window.localStorage.setItem(key, value);
    } catch {}
  };

  return (
    <div role="dialog" aria-label={t("ui.rate.title")} className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 flex items-center gap-3 rounded-2xl border border-line bg-background p-3 shadow-xl md:hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon" alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-bold">{t("ui.rate.title")}</p>
        <p className="text-muted">{t("ui.rate.body")}</p>
      </div>
      <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" onClick={() => remember(RATED_KEY, "1")} className="btn btn-sm btn-primary shrink-0">
        {t("ui.rate.rate")}
      </a>
      <button type="button" onClick={() => remember(DISMISSED_KEY, String(Date.now()))} aria-label={t("ui.install.notNow")} className="shrink-0 rounded-full p-1 text-muted hover:bg-surface">✕</button>
    </div>
  );
}
