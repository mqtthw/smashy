"use server";

// Smash history: members suggest a missing major (docs/archive-plan.md, step A4).
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { HAND_GAME_BLOCKS, type HandProblem } from "@/lib/handMajors";
import { suggestMoment } from "@/lib/historyMoments";
import { reportMistake } from "@/lib/historyReports";
import { addMajorVod } from "@/lib/majorVods";
import { isSiteAdmin } from "@/lib/scenes";
import { suggestLink, suggestManual } from "@/lib/majorSuggestions";
import { getVerifiedUserId } from "@/lib/supabase/server";

export type SuggestState = { ok?: boolean; error?: HandProblem };

export async function suggestMajor(_prev: SuggestState, formData: FormData): Promise<SuggestState> {
  const userId = await getVerifiedUserId();
  if (!userId) redirect(`/signin?next=${encodeURIComponent("/history/suggest")}`);
  const text = (k: string) => String(formData.get(k) ?? "");
  const kind = text("kind");
  const res =
    kind === "moment"
      ? await suggestMoment(userId, { day: text("day"), title: text("title"), note: text("momentNote"), link: text("momentLink"), game: text("momentGame") })
      : kind === "manual"
      ? await suggestManual(
          userId,
          {
            name: text("name"),
            start: text("start"),
            end: text("end"),
            city: text("city"),
            country: text("country"),
            sourceUrl: text("source"),
            games: Array.from({ length: HAND_GAME_BLOCKS }, (_, i) => ({ game: text(`game${i}`), eventName: text(`event${i}`), entrants: text(`entrants${i}`), top8: text(`top8_${i}`) })),
          },
          text("note"),
        )
      : await suggestLink(userId, text("link"), text("note"));
  if (res.ok) refresh();
  return res;
}

/** Report a mistake on a major or a moment (step A4, part 2). */
export async function reportMistakeAction(_prev: SuggestState, formData: FormData): Promise<SuggestState> {
  const userId = await getVerifiedUserId();
  if (!userId) redirect(`/signin?next=${encodeURIComponent("/history")}`);
  const res = await reportMistake(userId, String(formData.get("target") ?? ""), String(formData.get("message") ?? ""), String(formData.get("link") ?? ""));
  return res;
}

/** Add a top 8 VOD to a major: an admin's shows right away, a member's waits for review. */
export async function addMajorVodAction(_prev: SuggestState & { approved?: boolean }, formData: FormData): Promise<SuggestState & { approved?: boolean }> {
  const userId = await getVerifiedUserId();
  if (!userId) redirect(`/signin?next=${encodeURIComponent("/history")}`);
  const text = (k: string) => String(formData.get(k) ?? "");
  const admin = await isSiteAdmin(userId).catch(() => false);
  const res = await addMajorVod(userId, admin, { majorSlug: text("major"), game: text("game"), url: text("url"), label: text("label") });
  if (res.ok) refresh();
  return res;
}
