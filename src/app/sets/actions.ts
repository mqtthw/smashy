"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getSet, isSource } from "@/lib/brackets";
import { playerName } from "@/lib/brackets/types";
import { POST_MAX_LENGTH } from "@/lib/postConstants";
import { postErrorMessage } from "@/lib/postErrors";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getVerifiedUserId } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";

export type SetPostState = { error?: string; ok?: number; mode?: "comment" | "feed" };

/**
 * Comment on a set, or share it to your feed. The set is loaded from start.gg / parry.gg on the
 * server and its snapshot saved, so a post can't misreport a score.
 */
export async function postAboutSet(_prev: SetPostState, formData: FormData): Promise<SetPostState> {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/signin");
  const source = String(formData.get("source") ?? "");
  const setId = String(formData.get("set_id") ?? "");
  const mode = formData.get("mode") === "feed" ? "feed" : "comment";
  const body = String(formData.get("body") ?? "").replace(/\r\n/g, "\n").trim();
  const t = await getT();
  if (!body) return { error: mode === "feed" ? t("browse.set.err.feedEmpty") : t("browse.set.err.commentEmpty") };
  if (body.length > POST_MAX_LENGTH) return { error: t("browse.set.err.tooLong", { n: POST_MAX_LENGTH }) };
  if (!isSource(source)) return { error: t("browse.set.err.unknownSite") };

  const set = await getSet(source, setId).catch(() => null);
  if (!set) return { error: t("browse.set.err.loadFailed") };

  const [a, b] = set.players;
  const winner = a?.won ? 1 : b?.won ? 2 : null;
  const { data: ref, error: refError } = await createAdminClient()
    .from("set_refs")
    .upsert(
      {
        source,
        external_id: set.id,
        tournament_name: set.event.tournamentName,
        event_name: set.event.eventName,
        game: set.event.game,
        round_label: set.roundLabel,
        p1_name: a ? playerName(a) : null,
        p2_name: b ? playerName(b) : null,
        p1_score: a?.score ?? null,
        p2_score: b?.score ?? null,
        winner,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "source,external_id" },
    )
    .select("id")
    .single();
  if (refError || !ref) {
    console.error("set_refs upsert failed", refError?.message);
    return { error: t("browse.set.err.postFailed") };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("posts").insert({
    author_id: userId,
    body,
    game: set.event.game ?? "general",
    ...(mode === "feed" ? { quote_set_id: ref.id } : { set_ref_id: ref.id }),
  });
  if (error) {
    console.error("postAboutSet failed", error.code, error.message);
    return { error: postErrorMessage(error.message) };
  }
  refresh();
  return { ok: Date.now(), mode };
}
