// Sign in with Apple, server side: keeping a person's Apple link so deleting their Smashy account can
// cancel it, as Apple asks (App Store guideline 5.1.1(v)). At sign-in the iPhone app hands over a
// one-time code; Smashy trades it with Apple for a long-lived "refresh token" and keeps that
// (apple_signin_tokens, server only). Deleting the account sends it back to Apple to revoke.
// Talking to Apple takes a short "client secret" signed with the team's Sign in with Apple key:
// APPLE_SIGNIN_KEY (the .p8 file's text or base64 of it; a secret) and APPLE_SIGNIN_KEY_ID.
// Nothing here reads the database; the key and fetch are handed in so tests can use stand-ins.
import { createSign } from "node:crypto";
import { readAppleKey } from "./applePush";
import { APPLE_TEAM_ID, IOS_BUNDLE_ID } from "./iosApp";

export type SigninKey = { teamId: string; keyId: string; privateKey: string; clientId: string };
type Fetch = typeof fetch;

const APPLE = "https://appleid.apple.com";

/** The key from the environment, or null until it's set up (then nothing is kept or revoked). */
export function signinKeyFromEnv(env: Record<string, string | undefined> = process.env): SigninKey | null {
  const keyId = env.APPLE_SIGNIN_KEY_ID?.trim();
  const privateKey = readAppleKey(env.APPLE_SIGNIN_KEY);
  if (env.APPLE_SIGNIN_KEY && !privateKey) console.error("APPLE_SIGNIN_KEY can't be read");
  return keyId && privateKey ? { teamId: APPLE_TEAM_ID, keyId, privateKey, clientId: IOS_BUNDLE_ID } : null;
}

/** The client secret Apple's token endpoints ask for: an ES256 token, good for an hour. */
export function clientSecret(key: SigninKey, now = Math.floor(Date.now() / 1000)): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${b64({ alg: "ES256", kid: key.keyId })}.${b64({ iss: key.teamId, iat: now, exp: now + 3600, aud: APPLE, sub: key.clientId })}`;
  const signature = createSign("SHA256").update(unsigned).sign({ key: key.privateKey, dsaEncoding: "ieee-p1363" }).toString("base64url");
  return `${unsigned}.${signature}`;
}

function form(key: SigninKey, fields: Record<string, string>) {
  return new URLSearchParams({ client_id: key.clientId, client_secret: clientSecret(key), ...fields });
}

/** Trades the one-time code from the app for a refresh token. Null if Apple says no. */
export async function refreshTokenFor(key: SigninKey, authorizationCode: string, fetchImpl: Fetch = fetch): Promise<string | null> {
  const res = await fetchImpl(`${APPLE}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form(key, { code: authorizationCode, grant_type: "authorization_code" }),
    signal: AbortSignal.timeout(10_000),
  });
  const json = (await res.json().catch(() => ({}))) as { refresh_token?: unknown; error?: unknown };
  if (!res.ok || typeof json.refresh_token !== "string") {
    console.error("apple token exchange failed", res.status, json.error ?? "");
    return null;
  }
  return json.refresh_token;
}

/** Cancels Smashy's link with this person's Apple ID. True when Apple accepted it. */
export async function revokeRefreshToken(key: SigninKey, refreshToken: string, fetchImpl: Fetch = fetch): Promise<boolean> {
  const res = await fetchImpl(`${APPLE}/auth/revoke`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form(key, { token: refreshToken, token_type_hint: "refresh_token" }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) console.error("apple revoke failed", res.status);
  return res.ok;
}
