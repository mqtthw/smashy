"use server";

import type { EmailOtpType } from "@supabase/supabase-js";
import { getT } from "@/lib/i18n/server";
import { authErrorCode, authErrorText, signinErrorPath } from "@/lib/authErrors";
import { getLang } from "@/lib/i18n/server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isReviewCode, isReviewEmail } from "@/lib/reviewSignIn";
import { refreshTokenFor, signinKeyFromEnv } from "@/lib/appleSignIn";
import { RETURN_COOKIE, RETURN_MAX_AGE, safeReturnPath } from "@/lib/returnTo";

export type FormState = { error?: string; sentTo?: string };
export type CodeState = { error?: string };

const cookieOptions = { httpOnly: true, sameSite: "lax" as const, path: "/", secure: process.env.NODE_ENV === "production" };

async function siteOrigin() {
  const h = await headers();
  return h.get("origin") ?? `http://${h.get("host")}`;
}

/** Discord. Sends the user to Discord, then back to /auth/callback. */
/** Remember where to go after sign-in (the hidden "next" field), or forget an old one. */
async function rememberReturn(formData: FormData | undefined) {
  const next = safeReturnPath(formData?.get("next"));
  const jar = await cookies();
  if (next) jar.set(RETURN_COOKIE, next, { ...cookieOptions, maxAge: RETURN_MAX_AGE });
  else jar.delete(RETURN_COOKIE);
}

export async function signInWithDiscord(formData?: FormData) {
  await rememberReturn(formData);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "discord",
    options: { redirectTo: `${await siteOrigin()}/auth/callback?next=/welcome` },
  });
  if (error || !data.url) redirect(signinErrorPath(authErrorCode(error?.message)));
  redirect(data.url);
}

/**
 * Google (round 658). Shown only once Google is switched on in Supabase (lib/authProviders.ts) and only on
 * the website: Google refuses sign-in inside apps that show a website, as the store apps do.
 * `prompt: select_account` lets people pick which Google account, instead of silently using the last one.
 */
export async function signInWithGoogle(formData?: FormData) {
  await rememberReturn(formData);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await siteOrigin()}/auth/callback?next=/welcome`, queryParams: { prompt: "select_account" } },
  });
  if (error || !data.url) redirect(signinErrorPath(authErrorCode(error?.message)));
  redirect(data.url);
}

/** Email link (no password). */
export async function signInWithEmail(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: (await getT())("signin.badEmail") };
  await rememberReturn(formData);
  // The store reviewers' account signs in with its fixed code: nothing is emailed (lib/reviewSignIn.ts).
  if (isReviewEmail(email)) return { sentTo: email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${await siteOrigin()}/auth/callback?next=/welcome` },
  });
  if (error) return { error: authErrorText(await getT(), error.message) };
  return { sentTo: email };
}

/**
 * The code from the sign-in email, typed in instead of opening the link. Inside the store apps the
 * link opens the phone's browser, so typing the code is how people sign in there (it works on the
 * website too). Supabase checks the code and limits how many tries are allowed.
 */
export async function verifyEmailCode(_prev: CodeState, formData: FormData): Promise<CodeState> {
  const t = await getT();
  const email = String(formData.get("email") ?? "").trim();
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: t("signin.badEmail") };
  if (!/^\d{6,10}$/.test(code)) return { error: t("signin.badCode") };
  if (isReviewEmail(email)) return reviewSignIn(email, code);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
  if (error || !data.session) {
    // A wrong, old or used code all come back as "expired or invalid": say it in code terms.
    if (!error || /expired|invalid/i.test(error.message)) return { error: t("signin.codeFailed") };
    return { error: authErrorText(await getT(), error.message) };
  }
  // Alerts in the language they're using, if they haven't picked one (as the email link does).
  try {
    if (data.user) await supabase.from("profiles").update({ lang: await getLang() }).eq("id", data.user.id).is("lang", null);
  } catch {}
  redirect("/welcome");
}

/** Alerts in the language they're using, if they haven't picked one (never blocks signing in). */
async function keepLanguage(supabase: Awaited<ReturnType<typeof createClient>>, userId: string | undefined) {
  try {
    if (userId) await supabase.from("profiles").update({ lang: await getLang() }).eq("id", userId).is("lang", null);
  } catch {}
}

/**
 * The store reviewers' account (lib/reviewSignIn.ts): with the right fixed code, the server makes a
 * one-time sign-in link for that address (nothing is sent) and uses it straight away.
 */
async function reviewSignIn(email: string, code: string): Promise<CodeState> {
  const t = await getT();
  if (!isReviewCode(code)) {
    await new Promise((r) => setTimeout(r, 1000)); // slows guessing a little
    return { error: t("signin.codeFailed") };
  }
  const { data: link, error: linkError } = await createAdminClient().auth.admin.generateLink({ type: "magiclink", email });
  if (linkError || !link.properties?.hashed_token) return { error: authErrorText(await getT(), linkError?.message ?? "Sign-in failed") };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ type: link.properties.verification_type as EmailOtpType, token_hash: link.properties.hashed_token });
  if (error || !data.session) return { error: authErrorText(await getT(), error?.message ?? "Sign-in failed") };
  await keepLanguage(supabase, data.user?.id);
  redirect("/welcome");
}

/**
 * Sign in with Apple, inside the iPhone app (apps/mobile/ios/App/App/AppleSignIn.swift). Apple's sheet
 * returns an identity token for the SHA-256 of `nonce`; Supabase checks both and signs the person in
 * (making the account the first time, like Discord).
 */
export async function signInWithAppleToken(identityToken: unknown, nonce: unknown, next?: unknown, authorizationCode?: unknown): Promise<CodeState> {
  const t = await getT();
  if (typeof identityToken !== "string" || identityToken.length > 8192 || typeof nonce !== "string" || !/^[A-Za-z0-9_-]{32,128}$/.test(nonce)) {
    return { error: t("signin.appleFailed") };
  }
  const form = new FormData();
  if (typeof next === "string") form.set("next", next);
  await rememberReturn(form);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithIdToken({ provider: "apple", token: identityToken, nonce });
  if (error || !data.session) {
    console.error("apple sign-in failed", error?.message);
    return { error: error ? authErrorText(await getT(), error.message) : t("signin.appleFailed") };
  }
  await keepLanguage(supabase, data.user?.id);
  await keepAppleLink(data.user?.id, authorizationCode);
  redirect("/welcome");
}

/**
 * Keeps this person's Apple link (lib/appleSignIn.ts), so deleting their account can cancel it.
 * Never blocks signing in: without the key, the code or the table, it's skipped.
 */
async function keepAppleLink(userId: string | undefined, authorizationCode: unknown) {
  const key = signinKeyFromEnv();
  if (!key || !userId) return;
  if (typeof authorizationCode !== "string" || !/^[A-Za-z0-9._-]{10,2000}$/.test(authorizationCode)) {
    // The app didn't pass Apple's one-time code (an older build), or it looks unexpected.
    console.error("apple sign-in without a usable authorization code", typeof authorizationCode, typeof authorizationCode === "string" ? authorizationCode.length : 0);
    return;
  }
  try {
    const refreshToken = await refreshTokenFor(key, authorizationCode);
    if (!refreshToken) return;
    const { error } = await createAdminClient()
      .from("apple_signin_tokens")
      .upsert({ user_id: userId, refresh_token: refreshToken, updated_at: new Date().toISOString() });
    if (error) console.error("keeping the apple link failed", error.message);
  } catch (e) {
    console.error("keeping the apple link failed", e instanceof Error ? e.message : e);
  }
}
