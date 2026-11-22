// Sending one notification to one iPhone through Apple's push service (APNs). Apple only speaks HTTP/2
// here, and the server proves who it is with a short-lived token signed by the team's push key (the
// .p8 file). Nothing in this file reads the environment: the key is handed in (lib/appPush.ts reads
// it), so tests can use a throwaway key and a local stand-in for Apple.
import { createPrivateKey, createSign } from "node:crypto";
import { connect, type ClientHttp2Session } from "node:http2";
import type { AppSendResult } from "./appPush";
import type { PushPayload } from "./pushText";

export type AppleKey = { teamId: string; keyId: string; privateKey: string };

// App Store and TestFlight builds get tokens for the live service; builds run from Xcode get tokens
// for the test one. A token only works on its own side, and nothing in the token says which.
export const APPLE_LIVE = "https://api.push.apple.com";
export const APPLE_TEST = "https://api.sandbox.push.apple.com";

/**
 * The push key as stored in the environment: the .p8 file's text, or base64 of the file (one line,
 * easier to paste). Null when it's missing or isn't a key Apple's service accepts (elliptic curve).
 */
export function readAppleKey(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  const pem = value.includes("BEGIN") ? value.replace(/\\n/g, "\n") : Buffer.from(value, "base64").toString("utf8");
  try {
    return createPrivateKey(pem).asymmetricKeyType === "ec" ? pem : null;
  } catch {
    return null;
  }
}

/** The signed token Apple asks for with every request (ES256; team, key ID and the time it was made). */
export function appleToken(key: AppleKey, now = Math.floor(Date.now() / 1000)): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${b64({ alg: "ES256", kid: key.keyId })}.${b64({ iss: key.teamId, iat: now })}`;
  const signature = createSign("SHA256").update(unsigned).sign({ key: key.privateKey, dsaEncoding: "ieee-p1363" }).toString("base64url");
  return `${unsigned}.${signature}`;
}

// Apple accepts a token for an hour and refuses servers that make new ones more often than every
// 20 minutes, so one is reused for 40.
let cached: { token: string; made: number; keyId: string } | null = null;
function tokenFor(key: AppleKey): string {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.keyId === key.keyId && now - cached.made < 40 * 60) return cached.token;
  cached = { token: appleToken(key, now), made: now, keyId: key.keyId };
  return cached.token;
}

/** What the phone gets: the words to show, and the page to open (read by NativeAppBridge on tap). */
export function appleBody(payload: PushPayload) {
  return { aps: { alert: { title: payload.title, body: payload.body }, sound: "default" }, url: payload.url };
}

// One connection per Apple address, shared by the sends of one burst (a group chat message goes to
// several phones). A connection left idle is dropped instead of trusted: between requests the server
// may have been paused, and a paused connection can be dead without saying so.
const IDLE_MS = 30_000;
const sessions = new Map<string, { session: ClientHttp2Session; used: number }>();
function sessionFor(origin: string): ClientHttp2Session {
  const known = sessions.get(origin);
  if (known && !known.session.closed && !known.session.destroyed && Date.now() - known.used < IDLE_MS) {
    known.used = Date.now();
    return known.session;
  }
  known?.session.destroy();
  const session = connect(origin);
  session.on("error", () => {}); // the request in flight reports it
  session.on("close", () => {
    if (sessions.get(origin)?.session === session) sessions.delete(origin);
  });
  session.setTimeout(IDLE_MS, () => session.close());
  session.unref(); // never keeps the server awake on its own
  sessions.set(origin, { session, used: Date.now() });
  return session;
}

type Answer = { status: number; reason: string };
function post(origin: string, path: string, headers: Record<string, string>, body: string): Promise<Answer> {
  return new Promise<Answer>((resolve, reject) => {
    const session = sessionFor(origin);
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };
    const fail = (e: unknown) =>
      finish(() => {
        session.destroy();
        reject(e instanceof Error ? e : new Error(String(e)));
      });
    const timer = setTimeout(() => fail(new Error("Apple's push service didn't answer in time")), 10_000);
    try {
      const req = session.request({ ":method": "POST", ":path": path, "content-type": "application/json", ...headers });
      let status = 0;
      let text = "";
      req.setEncoding("utf8");
      req.on("response", (h) => (status = Number(h[":status"])));
      req.on("data", (chunk: string) => (text += chunk));
      req.on("end", () =>
        finish(() => {
          let reason = "";
          try {
            reason = String((JSON.parse(text) as { reason?: unknown }).reason ?? "");
          } catch {}
          resolve({ status, reason });
        }),
      );
      req.on("error", fail);
      req.on("close", () => fail(new Error("The connection to Apple's push service closed early")));
      req.end(body);
    } catch (e) {
      fail(e);
    }
  });
}

/**
 * One notification to one iPhone. Tries Apple's live service first; a token it doesn't know may be
 * from a build run from Xcode, so that one is tried on the test service before the phone is given up.
 */
export async function sendApple(
  key: AppleKey,
  bundleId: string,
  deviceToken: string,
  payload: PushPayload,
  ttlSeconds: number,
  origins: string[] = [APPLE_LIVE, APPLE_TEST],
): Promise<AppSendResult> {
  const body = JSON.stringify(appleBody(payload));
  const path = `/3/device/${deviceToken.toLowerCase()}`;
  const headers = (): Record<string, string> => ({
    authorization: `bearer ${tokenFor(key)}`,
    "apns-topic": bundleId,
    "apns-push-type": "alert",
    "apns-priority": "10",
    "apns-expiration": String(Math.floor(Date.now() / 1000) + ttlSeconds),
    // Like a web push "tag": a newer notification about the same thing replaces the older one.
    ...(payload.tag && Buffer.byteLength(payload.tag) <= 64 ? { "apns-collapse-id": payload.tag } : {}),
  });
  try {
    for (const origin of origins) {
      let res: Answer;
      try {
        res = await post(origin, path, headers(), body);
      } catch {
        res = await post(origin, path, headers(), body); // a dead connection: once more on a fresh one
      }
      if (res.status === 403 && res.reason === "ExpiredProviderToken") {
        cached = null;
        res = await post(origin, path, headers(), body);
      }
      if (res.status === 200) return "sent";
      // The app was removed, or the token belongs to another app (an old test build): forget the phone.
      if (res.status === 410 || res.reason === "Unregistered" || res.reason === "DeviceTokenNotForTopic") return "gone";
      if (res.status === 400 && res.reason === "BadDeviceToken") continue; // not this side's token
      console.error("iphone push failed", res.status, res.reason);
      return "failed";
    }
    return "gone"; // neither side knows the token
  } catch (e) {
    console.error("iphone push failed", e instanceof Error ? e.message : e);
    return "failed";
  }
}
