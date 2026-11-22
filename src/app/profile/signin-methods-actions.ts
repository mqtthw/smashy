"use server";

// Adding Google or Discord to an account that already exists (round 684), so a player who joined one way
// can still get in if they lose that account. Needs "Allow manual linking" on in Supabase (switched on
// 2026-11-21). Supabase sends them to Google or Discord, then back through /auth/callback to /profile.
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { authErrorText } from "@/lib/authErrors";
import { getT } from "@/lib/i18n/server";

const LINKABLE = ["google", "discord"] as const;
type Linkable = (typeof LINKABLE)[number];

export async function connectSignInMethod(formData: FormData) {
  const provider = String(formData.get("provider") ?? "") as Linkable;
  if (!LINKABLE.includes(provider)) redirect("/profile");
  const h = await headers();
  const origin = h.get("origin") ?? `http://${h.get("host")}`;
  const next = encodeURIComponent(`/profile?signin_link=${provider}#signin-methods`);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.linkIdentity({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback?next=${next}`,
      ...(provider === "google" ? { queryParams: { prompt: "select_account" } } : {}),
    },
  });
  if (error || !data?.url) {
    console.error("link identity:", provider, error?.message);
    redirect("/profile?signin_link_error=failed#signin-methods");
  }
  redirect(data.url);
}

export type ChangeEmailState = { error?: string; sentTo?: string };

/**
 * A new email address for the account (round 685). Supabase's "Secure email change" is on: it emails a link
 * to the old address and one to the new; the change happens once both are opened (each returns through
 * /auth/callback to /profile, which says what's left).
 */
export async function changeEmail(_prev: ChangeEmailState, formData: FormData): Promise<ChangeEmailState> {
  const t = await getT();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { error: t("signin.badEmail") };
  const supabase = await createClient();
  const { data: current } = await supabase.auth.getUser();
  if (!current.user) redirect("/signin");
  if (current.user.email?.toLowerCase() === email) return { error: t("people.signin.sameEmail") };
  const h = await headers();
  const origin = h.get("origin") ?? `http://${h.get("host")}`;
  const next = encodeURIComponent("/profile?email_change=done#signin-methods");
  const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: `${origin}/auth/callback?next=${next}` });
  if (error) {
    if (/already (been )?registered|email_exists/i.test(error.message)) return { error: t("people.signin.emailInUse") };
    console.error("change email:", error.message);
    return { error: authErrorText(t, error.message) };
  }
  return { sentTo: email };
}
