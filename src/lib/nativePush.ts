"use client";
// Notifications inside Smashy's store apps (apps/mobile), through the app's push plugin
// (@capacitor/push-notifications), which the app shell puts on window.Capacitor.Plugins. The site
// doesn't bundle the plugin: it talks to the one inside the app.

type Permission = "granted" | "denied" | "prompt" | "prompt-with-rationale";
type Listener = { remove: () => Promise<void> };
type PushPlugin = {
  checkPermissions: () => Promise<{ receive: Permission }>;
  requestPermissions: () => Promise<{ receive: Permission }>;
  register: () => Promise<void>;
  addListener: (event: string, cb: (data: never) => void) => Promise<Listener>;
};
type Cap = { getPlatform?: () => string; Plugins?: { PushNotifications?: PushPlugin } };

const cap = () => (typeof window === "undefined" ? undefined : (window as Window & { Capacitor?: Cap }).Capacitor);
export const appPlatform = (): "android" | "ios" | null => {
  const p = cap()?.getPlatform?.();
  return p === "android" || p === "ios" ? p : null;
};
export const pushPlugin = (): PushPlugin | null => cap()?.Plugins?.PushNotifications ?? null;

// This phone's token, and whether the person turned notifications on here (so a refreshed token is saved again).
const TOKEN_KEY = "smashy.appPushToken";
const ON_KEY = "smashy.appPushOn";
const read = (k: string) => {
  try {
    return window.localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string | null) => {
  try {
    if (v === null) window.localStorage.removeItem(k);
    else window.localStorage.setItem(k, v);
  } catch {}
};
export const storedToken = () => read(TOKEN_KEY);
export const appPushWanted = () => read(ON_KEY) === "1";
export const setAppPushWanted = (on: boolean) => write(ON_KEY, on ? "1" : null);
export const rememberToken = (token: string) => write(TOKEN_KEY, token);

/** Asks the phone's push service for this phone's token (the plugin answers with an event). */
export async function registerForToken(plugin: PushPlugin): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const listeners: Promise<Listener>[] = [];
    const done = (fn: () => void) => {
      clearTimeout(timer);
      void Promise.all(listeners).then((ls) => ls.forEach((l) => void l.remove()));
      fn();
    };
    const timer = setTimeout(() => done(() => reject(new Error("No answer from the phone's push service"))), 20_000);
    listeners.push(plugin.addListener("registration", ((t: { value: string }) => done(() => (rememberToken(t.value), resolve(t.value)))) as (d: never) => void));
    listeners.push(plugin.addListener("registrationError", ((e: { error?: string }) => done(() => reject(new Error(e?.error ?? "Registration failed")))) as (d: never) => void));
    plugin.register().catch((e) => done(() => reject(e)));
  });
}
