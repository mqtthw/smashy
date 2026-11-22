// Where to send someone after they sign in: the page that asked them to (e.g. "Host an event").
// Kept in a short-lived cookie because sign-in goes through Discord or an email link, then /welcome.

export const RETURN_COOKIE = "smashy_return";
export const RETURN_MAX_AGE = 60 * 30; // 30 minutes: long enough to find the email link

/** A path on this site only ("/host/new"), never another site ("//evil.com", "https://..."). */
export function safeReturnPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const p = value.trim();
  if (!p.startsWith("/") || p.startsWith("//") || p.length > 200) return null;
  // No control characters or backslashes anywhere: browsers drop tabs and newlines and read "\" as
  // "/", so "/<tab>/evil.com" or "/\evil.com" would turn into "//evil.com" (another site).
  if (/[\u0000-\u001f\u007f\\]/.test(p)) return null;
  // Belt and braces: it must still be this site once a browser has parsed it.
  try {
    if (new URL(p, "https://smashy.invalid").origin !== "https://smashy.invalid") return null;
  } catch {
    return null;
  }
  if (/^\/(signin|welcome|auth)(\/|\?|$)/.test(p)) return null; // no loops back into sign-in
  return p;
}

/** "/signin?next=/host/new": the sign-in link for a page that needs an account. */
export function signInPath(next: string): string {
  return `/signin?next=${encodeURIComponent(next)}`;
}
