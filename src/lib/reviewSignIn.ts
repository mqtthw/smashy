// A way in for App Store and Google Play reviewers, who can't read the emails Smashy's sign-in codes go
// to. One address set in REVIEW_EMAIL signs in with the fixed 10-digit code in REVIEW_CODE (a secret,
// in Vercel only) instead of an emailed one; no email is sent to it. Every other address works as
// before. With either setting missing, or a code that isn't exactly 10 digits, this is off.
// Pure (shared with tests); only server actions use it, so the code never reaches a browser.
import { timingSafeEqual } from "node:crypto";

type Env = Record<string, string | undefined>;

export function reviewAccount(env: Env = process.env): { email: string; code: string } | null {
  const email = env.REVIEW_EMAIL?.trim().toLowerCase();
  const code = env.REVIEW_CODE?.trim();
  return email && code && /^\d{10}$/.test(code) ? { email, code } : null;
}

export function isReviewEmail(email: string, env: Env = process.env): boolean {
  const account = reviewAccount(env);
  return !!account && email.trim().toLowerCase() === account.email;
}

/** Whether `code` is the review code (compared in constant time). */
export function isReviewCode(code: string, env: Env = process.env): boolean {
  const account = reviewAccount(env);
  if (!account) return false;
  const given = Buffer.from(code.replace(/\s/g, ""));
  const expected = Buffer.from(account.code);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
