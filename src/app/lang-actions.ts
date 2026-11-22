"use server";

// Remember a member's language on their profile, so the alerts and phone pushes Smashy sends them are in
// it. Guests have nothing to save (their choice is the cookie). Never fails the switch itself.
import { isLang } from "@/lib/i18n/core";
import { createClient, getUserId } from "@/lib/supabase/server";

export async function saveLang(lang: string): Promise<void> {
  if (!isLang(lang)) return;
  const userId = await getUserId();
  if (!userId) return;
  const { error } = await (await createClient()).from("profiles").update({ lang }).eq("id", userId);
  if (error) console.error("Saving the language failed", error.message);
}
