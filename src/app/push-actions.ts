"use server";

import { iphonePushConfigured } from "@/lib/appPush";
import { createAdminClient } from "@/lib/supabase/admin";
import { validPushEndpoint, validPushKeys } from "@/lib/pushKeys";
import { createClient, getVerifiedUserId } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";

type Sub = { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };

/** Saves this device for push notifications (one row per device; signing in elsewhere moves it). */
export async function savePushSubscription(sub: Sub): Promise<{ ok?: boolean; error?: string }> {
  const userId = await getVerifiedUserId();
  const t = await getT();
  if (!userId) return { error: t("common.signInFirst") };
  const endpoint = typeof sub?.endpoint === "string" ? sub.endpoint : "";
  const p256dh = typeof sub?.keys?.p256dh === "string" ? sub.keys.p256dh : "";
  const auth = typeof sub?.keys?.auth === "string" ? sub.keys.auth : "";
  if (!validPushEndpoint(endpoint) || !validPushKeys(p256dh, auth)) {
    return { error: t("play.push.err.unexpected") };
  }
  // The same device may still be saved for another account (it didn't sign out here first). Only this
  // browser knows its push address, so it moves to the account turning push on now.
  await createAdminClient().from("push_subscriptions").delete().eq("endpoint", endpoint);
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").insert({ user_id: userId, endpoint, p256dh, auth });
  if (error) return { error: t("play.push.err.saveFailed") };
  return { ok: true };
}

/** Whether this device's push address is saved for the signed-in account. */
export async function isPushSavedForMe(endpoint: string): Promise<boolean> {
  const userId = await getVerifiedUserId();
  if (!userId || typeof endpoint !== "string") return false;
  const supabase = await createClient();
  const { data } = await supabase.from("push_subscriptions").select("id").eq("endpoint", endpoint).eq("user_id", userId).maybeSingle();
  return !!data;
}

/** Stops push notifications on this device. */
export async function removePushSubscription(endpoint: string): Promise<{ ok?: boolean }> {
  const userId = await getVerifiedUserId();
  if (!userId || typeof endpoint !== "string") return {};
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", userId);
  return { ok: true };
}

// ---------- Store apps (apps/mobile): the phone's own push token instead of web push ----------

const APP_TOKEN = /^[A-Za-z0-9:_-]{32,4096}$/;

/** Saves this phone for notifications (Smashy's store app). A token saved for another account moves here. */
export async function saveAppPushDevice(platform: unknown, token: unknown): Promise<{ ok?: boolean; error?: string }> {
  const userId = await getVerifiedUserId();
  const t = await getT();
  if (!userId) return { error: t("common.signInFirst") };
  if ((platform !== "android" && platform !== "ios") || typeof token !== "string" || !APP_TOKEN.test(token)) {
    return { error: t("play.push.err.unexpected") };
  }
  // Only this phone knows its token, so it moves to whoever turns notifications on here now.
  await createAdminClient().from("app_push_devices").delete().eq("token", token).neq("user_id", userId);
  const supabase = await createClient();
  const { data: mine } = await supabase.from("app_push_devices").select("id").eq("token", token).maybeSingle();
  if (mine) return { ok: true };
  const { error } = await supabase.from("app_push_devices").insert({ user_id: userId, platform, token });
  if (error) return { error: t("play.push.err.saveFailed") };
  return { ok: true };
}

/** Whether this phone's token is saved for the signed-in account. */
export async function isAppPushSavedForMe(token: unknown): Promise<boolean> {
  const userId = await getVerifiedUserId();
  if (!userId || typeof token !== "string" || !APP_TOKEN.test(token)) return false;
  const supabase = await createClient();
  const { data } = await supabase.from("app_push_devices").select("id").eq("token", token).eq("user_id", userId).maybeSingle();
  return !!data;
}

/** Stops notifications on this phone. */
export async function removeAppPushDevice(token: unknown): Promise<{ ok?: boolean }> {
  const userId = await getVerifiedUserId();
  if (!userId || typeof token !== "string") return {};
  const supabase = await createClient();
  await supabase.from("app_push_devices").delete().eq("token", token).eq("user_id", userId);
  return { ok: true };
}

/** Whether the server can send to iPhones yet (Apple's push key is set up). Until then the iPhone app says "coming soon". */
export async function iphonePushReady(): Promise<boolean> {
  return iphonePushConfigured();
}
