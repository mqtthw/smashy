"use client";
// Runs only inside Smashy's store apps (apps/mobile). Tapping a notification opens its page; a
// smashy.gg link tapped elsewhere (a sign-in email, a shared post) that opens the app goes to that page;
// and when notifications are on, the phone's token is saved again whenever the push service changes it.
import { useEffect } from "react";
import { saveAppPushDevice } from "@/app/push-actions";
import { inNativeApp, smashyPath } from "@/lib/nativeApp";
import { countAppDay } from "@/lib/appReview";
import { appPlatform, appPushWanted, pushPlugin, rememberToken, storedToken } from "@/lib/nativePush";

type AppPlugin = { addListener: (event: "appUrlOpen", cb: (data: { url: string }) => void) => Promise<{ remove: () => Promise<void> }> };

export default function NativeAppBridge() {
  // Days the app was used, for asking for a store rating only from the third day (round 643).
  useEffect(() => countAppDay(), []);

  // smashy.gg links that open the app (iPhone universal links, Android app links): show that page.
  useEffect(() => {
    if (!inNativeApp()) return;
    const app = (window as Window & { Capacitor?: { Plugins?: { App?: AppPlugin } } }).Capacitor?.Plugins?.App;
    if (!app) return;
    const listener = app.addListener("appUrlOpen", ({ url }: { url: string }) => {
      const path = smashyPath(url);
      if (path && path !== window.location.pathname + window.location.search + window.location.hash) window.location.href = path;
    });
    return () => void listener.then((l) => l.remove());
  }, []);

  useEffect(() => {
    if (!inNativeApp()) return;
    const plugin = pushPlugin();
    const platform = appPlatform();
    if (!plugin || !platform) return;
    const listeners = [
      plugin.addListener("pushNotificationActionPerformed", ((action: { notification?: { data?: { url?: unknown } } }) => {
        const url = action.notification?.data?.url;
        if (typeof url === "string" && url.startsWith("/") && !url.startsWith("//")) window.location.href = url;
      }) as (d: never) => void),
    ];
    if (appPushWanted()) {
      listeners.push(
        plugin.addListener("registration", ((t: { value: string }) => {
          if (t.value !== storedToken()) {
            rememberToken(t.value);
            void saveAppPushDevice(platform, t.value);
          }
        }) as (d: never) => void),
      );
      void plugin
        .checkPermissions()
        .then(({ receive }) => (receive === "granted" ? plugin.register() : undefined))
        .catch(() => {});
    }
    return () => {
      void Promise.all(listeners).then((ls) => ls.forEach((l) => void l.remove()));
    };
  }, []);
  return null;
}
