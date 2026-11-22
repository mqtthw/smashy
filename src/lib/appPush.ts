// Notifications for Smashy's store apps (apps/mobile). Android phones get them through Firebase Cloud
// Messaging; the server signs in to Google with the Firebase key in FIREBASE_SERVICE_ACCOUNT (base64 of
// the service-account JSON, a secret). iPhones get them straight from Apple's push service
// (lib/applePush.ts), signed with the Apple team's push key: APNS_KEY (the .p8 file's text, or base64 of
// the file; a secret) and APNS_KEY_ID (the key's 10-character ID). Until those are set, iPhones are
// not sent to and the app keeps its "coming soon" note (docs/store-apps-plan.md).
import "server-only";
import { createSign } from "node:crypto";
import { readAppleKey, sendApple, type AppleKey } from "./applePush";
import { APPLE_TEAM_ID, IOS_BUNDLE_ID } from "./iosApp";
import type { PushPayload } from "./pushText";

type ServiceAccount = { project_id: string; client_email: string; private_key: string; token_uri: string };

let account: ServiceAccount | null | undefined;
function serviceAccount(): ServiceAccount | null {
  if (account !== undefined) return account;
  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    account = raw ? (JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as ServiceAccount) : null;
  } catch {
    console.error("FIREBASE_SERVICE_ACCOUNT can't be read");
    account = null;
  }
  return account;
}

export function androidPushConfigured(): boolean {
  return !!serviceAccount();
}

// Google's access tokens last an hour; one is reused until five minutes before it runs out.
let cached: { token: string; until: number } | null = null;
async function accessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.until > now + 300) return cached.token;
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: sa.token_uri,
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(sa.private_key).toString("base64url");
  const res = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
    signal: AbortSignal.timeout(10_000),
  });
  const json = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string };
  if (!json.access_token) throw new Error(`Google sign-in for push failed: ${json.error ?? res.status}`);
  cached = { token: json.access_token, until: now + (json.expires_in ?? 3600) };
  return json.access_token;
}

/** What happened to one send: delivered, the device is gone for good (forget it), or another failure. */
export type AppSendResult = "sent" | "gone" | "failed";

/** One notification to one Android device. */
export async function sendAndroid(token: string, payload: PushPayload, ttlSeconds: number): Promise<AppSendResult> {
  const sa = serviceAccount();
  if (!sa) return "failed";
  try {
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await accessToken(sa)}` },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: payload.title, body: payload.body },
          data: { url: payload.url },
          android: {
            priority: ttlSeconds < 3600 ? "high" : "normal",
            ttl: `${ttlSeconds}s`,
            notification: { ...(payload.tag ? { tag: payload.tag } : {}), color: "#c8102e" },
          },
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) return "sent";
    const json = (await res.json().catch(() => ({}))) as { error?: { status?: string; details?: { errorCode?: string }[] } };
    const code = json.error?.details?.find((d) => d.errorCode)?.errorCode ?? json.error?.status;
    // The app was removed, or the token is no longer valid: Firebase won't deliver to it again.
    if (res.status === 404 || code === "UNREGISTERED" || (res.status === 400 && code === "INVALID_ARGUMENT")) return "gone";
    console.error("android push failed", res.status, code);
    return "failed";
  } catch (e) {
    console.error("android push failed", e instanceof Error ? e.message : e);
    return "failed";
  }
}

let appleKey: AppleKey | null | undefined;
function iphoneKey(): AppleKey | null {
  if (appleKey !== undefined) return appleKey;
  const keyId = process.env.APNS_KEY_ID?.trim();
  const privateKey = readAppleKey(process.env.APNS_KEY);
  if (process.env.APNS_KEY && !privateKey) console.error("APNS_KEY can't be read");
  appleKey = keyId && privateKey ? { teamId: APPLE_TEAM_ID, keyId, privateKey } : null;
  return appleKey;
}

export function iphonePushConfigured(): boolean {
  return !!iphoneKey();
}

/** One notification to one iPhone. */
export async function sendIphone(token: string, payload: PushPayload, ttlSeconds: number): Promise<AppSendResult> {
  const key = iphoneKey();
  return key ? sendApple(key, IOS_BUNDLE_ID, token, payload, ttlSeconds) : "failed";
}
