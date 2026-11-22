"use client";

import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import Icon from "@/components/ui/Icon";
import { useT } from "@/lib/i18n/client";

const noop = () => () => {};

/** Refreshes the page every 30 seconds while the tab is visible (for live events). */
export function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 30_000);
    return () => clearInterval(t);
  }, [router]);
  return null;
}

/**
 * When `calledKey` changes to a set you haven't been alerted about, shows a browser notification
 * (if allowed) and vibrates the phone. Only works while this page is open.
 */
export function CalledAlert({ calledKey, text }: { calledKey: string | null; text: string }) {
  const title = useT()("play.alerts.title");
  useEffect(() => {
    if (!calledKey) return;
    const storeKey = `smashy-called-${calledKey}`;
    try {
      if (localStorage.getItem(storeKey)) return; // already told them about this set
      localStorage.setItem(storeKey, "1");
    } catch {}
    navigator.vibrate?.([200, 100, 200]);
    if ("Notification" in window && Notification.permission === "granted") {
      // Android Chrome only allows alerts through the service worker ("new Notification" throws there).
      const viaWorker = navigator.serviceWorker?.getRegistration().then((r) => (r ? r.showNotification(title, { body: text, tag: calledKey }).then(() => true) : false));
      void Promise.resolve(viaWorker)
        .catch(() => false)
        .then((shown) => {
          if (shown) return;
          try {
            new Notification(title, { body: text, tag: calledKey });
          } catch {
            // No way to show an alert here; the vibration and the big "You're up!" on the page still work.
          }
        });
    }
  }, [calledKey, text, title]);
  return null;
}

/** "Alert me when I'm called" — asks the browser for notification permission. */
export function AlertPermission() {
  const t = useT();
  const permission = useSyncExternalStore(
    noop,
    () => ("Notification" in window ? Notification.permission : "unsupported"),
    () => "unsupported",
  );
  if (permission === "unsupported") return null;
  if (permission === "granted") return <p className="text-meta text-muted"><Icon name="bell" /> {t("play.alerts.on")}</p>;
  if (permission === "denied") return <p className="text-meta text-muted">{t("play.alerts.blocked")}</p>;
  return (
    <button type="button" onClick={() => void Notification.requestPermission().then(() => location.reload())} className="btn btn-sm btn-outline self-start">
      <Icon name="bell" /> {t("play.alerts.ask")}
    </button>
  );
}
