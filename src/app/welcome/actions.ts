"use server";

import { signinErrorPath } from "@/lib/authErrors";

import { HOME_REGION, isRegion } from "@/lib/regions";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AGE_BLOCK_COOKIE, MIN_AGE, ageFromBirthdate, birthdateFromForm } from "@/lib/age";
import { GAME_KEYS, type GameKey } from "@/lib/games";
import { contactInfoReason } from "@/lib/guardrails";
import { cleanTag, handleProblem, tagProblem } from "@/lib/handles";
import { RETURN_COOKIE, safeReturnPath } from "@/lib/returnTo";
import { INVITE_COOKIE } from "@/lib/invites";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getVerifiedUserId } from "@/lib/supabase/server";
import { getLang, getT } from "@/lib/i18n/server";

export type WelcomeState = { error?: string };

export type HandleCheck = { state: "free" | "taken" | "invalid"; problem?: string; suggestion?: string };

/**
 * Is this handle free? (round 659: the welcome step checks while people type, instead of only after
 * Create.) When it's taken, offers the first free one of a few close variants.
 */
export async function checkHandle(raw: unknown): Promise<HandleCheck> {
  const handle = String(raw ?? "").trim().toLowerCase();
  const problem = handleProblem(handle);
  if (problem) return { state: "invalid", problem };
  if (!(await getVerifiedUserId())) return { state: "invalid" };
  const base = handle.slice(0, 17);
  const candidates = [handle, `${base}_`, `${base}${new Date().getFullYear() % 100}`, `${base}_gg`, `${base}${Math.floor(Math.random() * 90 + 10)}`];
  const { data } = await createAdminClient().from("profiles").select("handle").in("handle", candidates);
  const used = new Set((data ?? []).map((r: { handle: string }) => r.handle));
  if (!used.has(handle)) return { state: "free" };
  const suggestion = candidates.slice(1).find((c) => !used.has(c) && !handleProblem(c));
  return { state: "taken", suggestion };
}

/** Create the profile. If the person turns out to be under 13, delete the new account right away. */
export async function completeProfile(_prev: WelcomeState, formData: FormData): Promise<WelcomeState> {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/signin");

  const [supabase, t] = await Promise.all([createClient(), getT()]);
  // Double-check the account still exists (a browser can hold a login for a deleted account).
  const { error: userError } = await supabase.auth.getUser();
  if (userError) {
    await supabase.auth.signOut();
    redirect(signinErrorPath("again"));
  }

  const cookieStore = await cookies();
  // The birthday is optional: without one, every age rule treats the account as a teen's.
  const born = birthdateFromForm(formData);
  if (born.kind === "partial") return { error: t("people.birthday.partial") };
  if (born.kind === "bad") return { error: t("signin.badDate") };
  const birthdate = born.kind === "date" ? born.date : null;

  if (birthdate && ageFromBirthdate(birthdate) < MIN_AGE) {
    // COPPA: don't keep accounts for under-13s. Delete it and everything tied to it.
    await createAdminClient().auth.admin.deleteUser(userId);
    await supabase.auth.signOut();
    cookieStore.set(AGE_BLOCK_COOKIE, "1", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 });
    redirect("/signin");
  }

  const tag = cleanTag(String(formData.get("tag") ?? ""));
  const homeCity = String(formData.get("home_city") ?? "").trim() || null;
  const regionRaw = String(formData.get("region") ?? "");
  const region = isRegion(regionRaw) ? regionRaw : HOME_REGION;
  const games = formData.getAll("games").map(String).filter((g): g is GameKey => GAME_KEYS.includes(g as GameKey));

  const badTag = tagProblem(tag);
  if (badTag) return { error: badTag };
  if (homeCity && homeCity.length > 60) return { error: t("feed.welcome.err.cityLong") };
  // Everything on a profile is public: no links, phone numbers or other contact info anywhere on it.
  if (contactInfoReason(tag)) return { error: t("feed.welcome.err.tagContact") };
  if (homeCity && contactInfoReason(homeCity)) return { error: t("feed.welcome.err.cityContact") };
  // No game is fine (round 461): spectators and people here for fun don't have to pick one.
  const handle = String(formData.get("handle") ?? "").trim().toLowerCase();
  const badHandle = handleProblem(handle);
  if (badHandle) return { error: badHandle };

  // Private beta: use the invite code (the database refuses a profile without one while invite-only is on).
  const invite = String(formData.get("invite") ?? "").trim();
  // Check the handle first, so a taken handle doesn't use up the code.
  const { data: taken } = await createAdminClient().from("profiles").select("id").eq("handle", handle).maybeSingle();
  if (taken && taken.id !== userId) return { error: t("feed.welcome.err.handleTaken") };
  let redeemedNow = false;
  if (invite) {
    const { data: before } = await createAdminClient().from("invite_redemptions").select("user_id").eq("user_id", userId).maybeSingle();
    const { error: inviteError } = await supabase.rpc("redeem_invite", { p_code: invite });
    if (inviteError) return { error: inviteError.code === "P0001" || inviteError.code === "P0429" ? inviteError.message : t("feed.welcome.err.inviteCheck") };
    if (!before) {
      // A wrong code doesn't raise an error (so the attempt counts toward the hourly limit): check it worked.
      const { data: after } = await createAdminClient().from("invite_redemptions").select("user_id").eq("user_id", userId).maybeSingle();
      if (!after) return { error: t("feed.welcome.err.inviteInvalid") };
    }
    redeemedNow = !before;
  }
  /** If the profile can't be made after all, give the code's use back. */
  const giveCodeBack = async () => {
    if (!redeemedNow) return;
    const db = createAdminClient();
    const { data: r } = await db.from("invite_redemptions").select("code").eq("user_id", userId).maybeSingle();
    await db.from("invite_redemptions").delete().eq("user_id", userId);
    if (r?.code) {
      const { data: c } = await db.from("invite_codes").select("uses").eq("code", r.code).maybeSingle();
      if (c) await db.from("invite_codes").update({ uses: Math.max(0, c.uses - 1) }).eq("code", r.code);
    }
  };

  // The birthday first, when given (it decides the profile's starting privacy).
  const { error: dobError } = birthdate
    ? await supabase.from("private_profile_data").upsert({ user_id: userId, date_of_birth: birthdate }, { onConflict: "user_id", ignoreDuplicates: true })
    : { error: null };
  if (dobError) {
    console.error("welcome: birthdate save failed", dobError.code, dobError.message);
    await giveCodeBack();
    return { error: t("feed.welcome.err.birthdaySave") };
  }

  const { error } = await supabase.from("profiles").insert({ id: userId, tag, home_city: homeCity, games, handle, region, lang: await getLang() });
  if (error?.code === "23505" && /handle/.test(error.message)) {
    await giveCodeBack();
    return { error: t("feed.welcome.err.handleTaken") };
  }
  if (error?.code === "P0001") return { error: error.message }; // e.g. invite-only and no code yet
  // 23505 on the id = profile already exists (e.g. the form was submitted twice): that's fine, carry on.
  if (error && error.code !== "23505") {
    console.error("welcome: profile save failed", error.code, error.message);
    await giveCodeBack();
    return { error: t("feed.welcome.err.profile") };
  }

  cookieStore.delete(INVITE_COOKIE);
  // New account: on to the page that asked them to sign in (e.g. Host an event), else their profile.
  const back = safeReturnPath(cookieStore.get(RETURN_COOKIE)?.value);
  cookieStore.delete(RETURN_COOKIE);
  redirect(back ?? "/profile");
}
