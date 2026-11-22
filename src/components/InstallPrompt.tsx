"use client";

import { inNativeApp } from "@/lib/nativeApp";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { inFrame } from "@/lib/embed";
import { useT } from "@/lib/i18n/client";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/contact";

const VISITS_KEY = "smashy-visits";
const DISMISSED_KEY = "smashy-install-dismissed"; // when it was closed (ms); asks again after 30 days
const SHOW_FROM_VISIT = 2;
/** Pages where it stays out of the way: signing in and setting up a profile. */
export const SIGNING_UP = /^\/(signin|welcome)(\/|$)/;

/** Which store this phone gets apps from: iPhones and iPads (any browser) the App Store, Android Google Play. */
export function storeFor(ua: string, maxTouchPoints = 0): "apple" | "google" | null {
  if (/iPhone|iPad|iPod/.test(ua)) return "apple";
  // iPads ask for the desktop site and say "Macintosh"; only they have a touch screen.
  if (/Macintosh/.test(ua) && maxTouchPoints > 1) return "apple";
  if (/Android/.test(ua)) return "google";
  return null;
}

/**
 * "Get the Smashy app" for phone users from their second visit (round 642, Matthew: the store apps
 * replace "add it to your home screen"): a button to the App Store on iPhones and iPads, to Google Play
 * on Android. Never shown inside the app, and closing it hides it for 30 days.
 */
export default function InstallPrompt() {
  const t = useT();
  const pathname = usePathname();
  const [store, setStore] = useState<null | "apple" | "google">(null);

  useEffect(() => {
    const phone = window.matchMedia("(pointer: coarse)").matches && window.innerWidth < 768;
    if (!phone || inFrame() || inNativeApp()) return;
    const which = storeFor(navigator.userAgent, navigator.maxTouchPoints);
    if (!which) return;
    // The browser's own "Install" mini-bar would offer the home screen shortcut instead of the app.
    const quiet = (e: Event) => e.preventDefault();
    window.addEventListener("beforeinstallprompt", quiet);
    // Count visits (once per browser session).
    let visits = 0;
    try {
      visits = Number(window.localStorage.getItem(VISITS_KEY) ?? 0) || 0;
      if (!window.sessionStorage.getItem(VISITS_KEY)) {
        window.sessionStorage.setItem(VISITS_KEY, "1");
        visits += 1;
        window.localStorage.setItem(VISITS_KEY, String(visits));
      }
    } catch {}
    let dismissed = 0;
    try {
      dismissed = Number(window.localStorage.getItem(DISMISSED_KEY) ?? 0) || 0;
    } catch {}
    const timer = visits >= SHOW_FROM_VISIT && Date.now() - dismissed >= 30 * 86400e3 ? setTimeout(() => setStore(which), 4000) : null;
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", quiet);
    };
  }, []);

  // Not over the sign-in and sign-up forms (round 681): it covered "Create profile" mid-sign-up.
  if (!store || SIGNING_UP.test(pathname ?? "")) return null;
  const close = () => {
    setStore(null);
    try {
      window.localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {}
  };

  return (
    <div role="dialog" aria-label={t("ui.install.title")} className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 flex items-center gap-3 rounded-2xl border border-line bg-background p-3 shadow-xl md:hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon" alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-bold">{t("ui.install.title")}</p>
        <p className="text-muted">{t("ui.install.storeBody")}</p>
      </div>
      <a href={store === "apple" ? APP_STORE_URL : PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" onClick={close} className="btn btn-sm btn-primary shrink-0">
        {store === "apple" ? t("ui.getApp.appStore") : t("ui.getApp.googlePlay")}
      </a>
      <button type="button" onClick={close} aria-label={t("ui.install.notNow")} className="shrink-0 rounded-full p-1 text-muted hover:bg-surface">✕</button>
    </div>
  );
}
