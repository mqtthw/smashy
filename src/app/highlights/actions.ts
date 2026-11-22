"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { CHARACTERS } from "@/lib/characters";
import { toEmbed } from "@/lib/embeds";
import { GAME_KEYS, type GameKey } from "@/lib/games";
import { GUIDE_MAX_LENGTH, HIGHLIGHT_TYPES, type HighlightType } from "@/lib/highlightTypes";
import { actionError, type ActionResult } from "@/lib/actionErrors";
import { createClient, getVerifiedUserId } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";

export type HighlightFormState = { error?: string };

export async function createHighlight(_prev: HighlightFormState, formData: FormData): Promise<HighlightFormState> {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/signin");

  const type = String(formData.get("type")) as HighlightType;
  const title = String(formData.get("title") ?? "").trim();
  const game = String(formData.get("game")) as GameKey;
  const character = String(formData.get("character") ?? "") || null;
  const url = String(formData.get("url") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const guideBody = String(formData.get("guide_body") ?? "").replace(/\r\n/g, "\n").trim() || null;

  const t = await getT();
  if (!(type in HIGHLIGHT_TYPES)) return { error: t("media.hl.err.pickType") };
  if (title.length < 3 || title.length > 100) return { error: t("media.hl.err.title") };
  if (!GAME_KEYS.includes(game)) return { error: t("media.err.pickGame") };
  if (character && !CHARACTERS[game].some((c) => c.key === character)) return { error: t("media.hl.err.character") };
  // Matchup ("vs"): only with a character, and a different one from the same game.
  const vsRaw = String(formData.get("vs_character") ?? "");
  const vsCharacter = character && vsRaw && vsRaw !== character && CHARACTERS[game].some((c) => c.key === vsRaw) ? vsRaw : null;
  if (!url && !guideBody) return { error: t("media.hl.err.linkOrGuide") };
  if (url && (url.length > 500 || !toEmbed(url))) return { error: t("media.hl.err.link") };
  if (description && description.length > 300) return { error: t("media.hl.err.description") };
  if (guideBody && guideBody.length > GUIDE_MAX_LENGTH) return { error: t("media.hl.err.guideLength", { n: GUIDE_MAX_LENGTH.toLocaleString() }) };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("highlights")
    .insert({ author_id: userId, type, title, game, character, vs_character: vsCharacter, url, description, guide_body: guideBody })
    .select("id")
    .single();
  // The database's own rule messages (limits, and the under-18 contact-info rule) are written for people.
  if (error) return { error: error.code === "P0001" || error.code === "P0429" ? error.message : t("media.err.couldntSave") };
  redirect(`/h/${data.id}`);
}

export async function toggleVote(highlightId: string, vote: boolean): Promise<ActionResult> {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/signin");
  const supabase = await createClient();
  const { error } = vote
    ? await supabase.from("highlight_votes").upsert({ highlight_id: highlightId, user_id: userId }, { onConflict: "highlight_id,user_id", ignoreDuplicates: true })
    : await supabase.from("highlight_votes").delete().eq("highlight_id", highlightId).eq("user_id", userId);
  if (error) return actionError(error);
  refresh();
  return {};
}

export async function deleteHighlight(id: string) {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/signin");
  const supabase = await createClient();
  const { data: me } = await supabase.from("profiles").select("handle").eq("id", userId).single();
  await supabase.from("highlights").delete().eq("id", id).eq("author_id", userId);
  redirect(`/u/${me?.handle ?? ""}?tab=highlights`);
}
