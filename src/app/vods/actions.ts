"use server";

// The VOD library: adding a video link to a set, and taking one back. Everything is checked here
// and written with the server's own access (members can't write the table directly).
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/actionErrors";
import { isSiteAdmin } from "@/lib/scenes";
import { describeSet } from "@/lib/setVods";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { readVodLink, VOD_SOURCES, VODS_PER_DAY, VODS_PER_SET, type VodSource } from "@/lib/vods";
import { getT } from "@/lib/i18n/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireUser() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/signin");
  return userId;
}

/** Add a video of a set (YouTube, Twitch or Streamable). */
export async function addVod(source: VodSource, setId: string, link: string): Promise<ActionResult> {
  const userId = await requireUser();
  const t = await getT();
  if (!VOD_SOURCES.includes(source) || typeof setId !== "string" || !setId || setId.length > 64) return { error: t("media.vods.err.setGone") };
  const vod = readVodLink(typeof link === "string" ? link.slice(0, 400) : "");
  if (!vod) return { error: t("media.vods.err.badLink") };
  const db = createAdminClient();
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const [{ count: today }, { count: onSet }, { data: same }, { data: profile }] = await Promise.all([
    db.from("set_vods").select("id", { count: "exact", head: true }).eq("added_by", userId).gt("created_at", since),
    db.from("set_vods").select("id", { count: "exact", head: true }).eq("source", source).eq("set_id", setId),
    db.from("set_vods").select("id").eq("source", source).eq("set_id", setId).eq("url", vod.url).maybeSingle(),
    db.from("profiles").select("id").eq("id", userId).maybeSingle(),
  ]);
  if (!profile) return { error: t("media.vods.err.noProfile") };
  if (same) return { error: t("media.vods.err.already") };
  if ((onSet ?? 0) >= VODS_PER_SET) return { error: t("media.vods.err.full", { n: VODS_PER_SET }) };
  if ((today ?? 0) >= VODS_PER_DAY) return { error: t("media.vods.err.daily") };
  const set = await describeSet(source, setId);
  if (!set) return { error: t("media.vods.err.setGone") };
  const { error } = await db.from("set_vods").insert({
    source,
    set_id: setId,
    hosted_event_id: set.hostedEventId,
    url: vod.url,
    game: set.game,
    p1_tag: set.p1Tag?.slice(0, 64) ?? null,
    p2_tag: set.p2Tag?.slice(0, 64) ?? null,
    p1_player: set.p1Player,
    p2_player: set.p2Player,
    tournament: set.tournament?.slice(0, 200) ?? null,
    round: set.round?.slice(0, 80) ?? null,
    played_at: set.playedAt,
    added_by: userId,
  });
  if (error) return { error: t(error.code === "23505" ? "media.vods.err.already" : "media.vods.err.add") };
  refresh();
  return {};
}

/** Take a video off a set: whoever added it, or a site admin. */
export async function removeVod(id: string): Promise<ActionResult> {
  const userId = await requireUser();
  if (!UUID.test(id)) return { error: (await getT())("media.vods.err.videoGone") };
  const db = createAdminClient();
  const { data: vod } = await db.from("set_vods").select("added_by").eq("id", id).maybeSingle();
  if (!vod) return {};
  if (vod.added_by !== userId && !(await isSiteAdmin(userId))) return { error: (await getT())("media.vods.err.notYours") };
  const { error } = await db.from("set_vods").delete().eq("id", id);
  if (error) return { error: (await getT())("media.vods.err.remove") };
  refresh();
  return {};
}
