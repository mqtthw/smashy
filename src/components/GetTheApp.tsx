"use client";
// "Get the app" (launch day, 2026-11-17): App Store and Google Play buttons. Shown on the website
// only: inside the iPhone or Android app it renders nothing. Plain buttons rather than the stores'
// badge artwork, in Smashy's own style.
import { useSyncExternalStore } from "react";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/contact";
import { useT } from "@/lib/i18n/client";
import { inNativeApp } from "@/lib/nativeApp";

const noop = () => () => {};

export default function GetTheApp({ title = false, className = "" }: { title?: boolean; className?: string }) {
  const t = useT();
  // Hidden while the page is drawn on the server (it can't know yet), shown once the browser says it's
  // not the app. So the apps never flash these buttons.
  const onWeb = useSyncExternalStore(noop, () => !inNativeApp(), () => false);
  if (!onWeb) return null;
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {title && <p className="font-semibold">{t("ui.getApp.title")}</p>}
      <div className="flex flex-wrap gap-2">
        <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="btn btn-md btn-outline">
          <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8 0 0-2.5-1-2.5-3.9zM14 5.5c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.1-.6 2.8-1.4z" /></svg>
          {t("ui.getApp.appStore")}
        </a>
        <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="btn btn-md btn-outline">
          <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M4 2.8v18.4c0 .4.4.7.8.5l10.4-9.2c.3-.3.3-.7 0-1L4.8 2.3c-.4-.2-.8.1-.8.5zm12.4 6.6-2.6 2.3 2.6 2.3 3.2-1.8c.6-.3.6-1.1 0-1.4zM5.9 2.2l8.6 8.4 1.9-1.7zm0 19.6 10.5-6.7-1.9-1.7z" /></svg>
          {t("ui.getApp.googlePlay")}
        </a>
      </div>
    </div>
  );
}
