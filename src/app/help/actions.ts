"use server";
// "Help build Smashy" (/help, round 653): saves a suggestion from anyone, signed in or not.
import { headers } from "next/headers";
import { saveSuggestion } from "@/lib/communitySuggestions";
import { readSuggestion, type SuggestionProblem } from "@/lib/suggestionForm";
import { getVerifiedUserId } from "@/lib/supabase/server";

export type HelpState = { sent?: boolean; error?: SuggestionProblem | "tooMany" | "failed" };

export async function sendSuggestion(_prev: HelpState, form: FormData): Promise<HelpState> {
  // A hidden field people never see: bots that fill in every box get a quiet "thanks" and nothing saved.
  if (String(form.get("website") ?? "")) return { sent: true };
  const read = readSuggestion(form);
  if ("error" in read) return { error: read.error };
  const userId = await getVerifiedUserId().catch(() => null);
  const ip = ((await headers()).get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const result = await saveSuggestion(read.ok, { userId, ip });
  return result === "ok" ? { sent: true } : { error: result };
}
