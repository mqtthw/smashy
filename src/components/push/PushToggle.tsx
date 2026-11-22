"use client";

import { inNativeApp } from "@/lib/nativeApp";
import { useEffect, useState } from "react";
import { iphonePushReady, isAppPushSavedForMe, isPushSavedForMe, removeAppPushDevice, removePushSubscription, saveAppPushDevice, savePushSubscription } from "@/app/push-actions";
import { appPlatform, appPushWanted, pushPlugin, registerForToken, setAppPushWanted, storedToken } from "@/lib/nativePush";
import { useT } from "@/lib/i18n/client";

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type Status = "loading" | "unsupported" | "app" | "app-blocked" | "ios-install" | "blocked" | "off" | "on";

async function currentStatus(): Promise<Status> {
  // Inside the store app: the phone's own notifications (on iPhone, once the server has Apple's push key).
  if (inNativeApp()) {
    const plugin = pushPlugin();
    const platform = appPlatform();
    if (!plugin || !platform || (platform === "ios" && !(await iphonePushReady()))) return "app";
    const { receive } = await plugin.checkPermissions();
    if (receive === "denied") return "app-blocked";
    const token = storedToken();
    return receive === "granted" && appPushWanted() && token && (await isAppPushSavedForMe(token)) ? "on" : "off";
  }
  if (!KEY || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    // iPhones and iPads only allow notifications for sites added to the Home Screen.
    const ios = /iP(hone|ad|od)/.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    return ios && !standalone ? "ios-install" : "unsupported";
  }
  if (Notification.permission === "denied") return "blocked";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  // "On" only if this device is saved for the account signed in now (not someone who used it before).
  return sub && Notification.permission === "granted" && (await isPushSavedForMe(sub.endpoint)) ? "on" : "off";
}

/**
 * Phone and desktop notifications for this device: replies, mentions, follows, messages, majors going
 * live, and event reminders. The mute settings below still apply.
 */
export default function PushToggle({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<Status>("loading");
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void currentStatus().then((s) => live && setStatus(s));
    return () => {
      live = false;
    };
  }, []);

  const turnOn = async () => {
    setBusy(true);
    setError(null);
    try {
      if (inNativeApp()) {
        const plugin = pushPlugin();
        const platform = appPlatform();
        if (!plugin || !platform) return;
        const { receive } = await plugin.requestPermissions();
        if (receive !== "granted") {
          setStatus(receive === "denied" ? "app-blocked" : "off");
          return;
        }
        const res = await saveAppPushDevice(platform, await registerForToken(plugin));
        if (res.error) {
          setError(res.error);
          return;
        }
        setAppPushWanted(true);
        setStatus("on");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "blocked" : "off");
        return;
      }
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(KEY) }));
      const res = await savePushSubscription(JSON.parse(JSON.stringify(sub)));
      if (res.error) {
        setError(res.error);
        return;
      }
      setStatus("on");
    } catch {
      setError(t("play.push.failed"));
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    try {
      if (inNativeApp()) {
        const token = storedToken();
        if (token) await removeAppPushDevice(token);
        setAppPushWanted(false);
        setStatus("off");
        return;
      }
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("off");
    } finally {
      setBusy(false);
    }
  };

  if (status === "loading") return null;
  const note =
    status === "app" ? t("play.push.appSoon")
    : status === "app-blocked" ? t("play.push.appBlocked")
    : status === "unsupported" ? t("play.push.unsupported")
    : status === "ios-install" ? t("play.push.ios")
    : status === "blocked" ? t("play.push.blocked")
    : status === "on" ? t("play.push.on")
    : t("play.push.off");

  if (compact && (status === "on" || status === "unsupported" || status === "app")) return null;
  return (
    <div className={compact ? "flex flex-col gap-2 border-b border-line px-4 py-3" : "flex flex-col gap-1"}>
      <div className="flex items-center justify-between gap-4">
        <span>
          <span className="block font-semibold">{t("play.push.title")}</span>
          <span className="block text-meta text-muted">{note}</span>
        </span>
        {(status === "on" || status === "off") && (
          <input
            type="checkbox"
            role="switch"
            aria-label={t("play.push.switch")}
            checked={status === "on"}
            disabled={busy}
            onChange={(e) => void (e.target.checked ? turnOn() : turnOff())}
            className="h-5 w-5 shrink-0"
          />
        )}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
