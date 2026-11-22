"use server";
// Adding a birthday after sign-up (it's optional there). Once only: the database has no way to change it.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { AGE_BLOCK_COOKIE, MIN_AGE, ageFromBirthdate, birthdateFromForm } from "@/lib/age";
import { getT } from "@/lib/i18n/server";
import { safeReturnPath } from "@/lib/returnTo";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getVerifiedUserId } from "@/lib/supabase/server";

export type BirthdayState = { error?: string };

export async function addBirthdate(_prev: BirthdayState, formData: FormData): Promise<BirthdayState> {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/signin");
  const t = await getT();
  const born = birthdateFromForm(formData);
  if (born.kind === "blank" || born.kind === "partial") return { error: t("people.birthday.partial") };
  if (born.kind === "bad") return { error: t("signin.badDate") };

  const supabase = await createClient();
  if (ageFromBirthdate(born.date) < MIN_AGE) {
    // Smashy is 13+: an account found to be under 13 is deleted with everything tied to it.
    await createAdminClient().auth.admin.deleteUser(userId);
    await supabase.auth.signOut();
    (await cookies()).set(AGE_BLOCK_COOKIE, "1", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 });
    redirect("/signin");
  }
  const { error } = await supabase.from("private_profile_data").insert({ user_id: userId, date_of_birth: born.date });
  if (error?.code === "23505") return { error: t("people.birthday.taken") };
  if (error) {
    console.error("addBirthdate failed", error.code, error.message);
    return { error: t("people.birthday.err") };
  }
  // Pages remembered by the browser (Messages, Play, the ladder) would still show "add your birthday".
  refresh();
  redirect(safeReturnPath(formData.get("next")) ?? "/profile");
}
