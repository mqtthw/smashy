// Sign-in errors in plain words, in the reader's language (Supabase's own messages are technical English).
//
// Round 683: pages that send people back to /signin pass a short code (?error=expired), never words. The
// sign-in page used to print whatever ?error= said, so anyone could link to smashy.gg/signin with their own
// red "message from Smashy" on it.
import { CONTACT_EMAIL } from "./contact";
import type { MessageKey, Values } from "./i18n/base";

export const AUTH_ERROR_CODES = ["banned", "expired", "rate", "again", "inUse", "failed"] as const;
export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];

const KEYS: Record<AuthErrorCode, MessageKey> = {
  banned: "signin.err.banned",
  expired: "signin.err.expired",
  rate: "signin.err.rate",
  again: "feed.welcome.err.signInAgain",
  inUse: "signin.err.inUse",
  failed: "signin.err.failed",
};

/** Which kind of problem a Supabase sign-in error is. Anything unrecognised is "failed". */
export function authErrorCode(message: string | null | undefined): AuthErrorCode {
  const m = String(message ?? "");
  if (/banned/i.test(m)) return "banned";
  if (/expired|invalid.*(otp|token|code)|otp.*(expired|invalid)/i.test(m)) return "expired";
  if (/rate limit|too many/i.test(m)) return "rate";
  if (/already linked|identity_already_exists|already (been )?(used|registered)/i.test(m)) return "inUse";
  return "failed";
}

/** The ?error= value on /signin: one of the codes, or null (no message) for anything else. */
export function readAuthErrorCode(value: unknown): AuthErrorCode | null {
  return typeof value === "string" && (AUTH_ERROR_CODES as readonly string[]).includes(value) ? (value as AuthErrorCode) : null;
}

/** /signin with that problem shown. */
export function signinErrorPath(code: AuthErrorCode): string {
  return `/signin?error=${code}`;
}

/** The words for a code, or for a Supabase error message, in the reader's language. */
export function authErrorText(t: (key: MessageKey, values?: Values) => string, codeOrMessage: AuthErrorCode | string | null | undefined): string {
  const code = readAuthErrorCode(codeOrMessage) ?? authErrorCode(codeOrMessage);
  return t(KEYS[code], { email: CONTACT_EMAIL });
}
