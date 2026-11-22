"use server";

// Pick'em for majors: saving and clearing a member's picks. Only before the event starts, only
// players among its top seeds; written with the server's own access (the table is closed to members).
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/actionErrors";
import { checkPicks } from "@/lib/pickem";
import { getPickemEvent } from "@/lib/pickemStartgg";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/core";

async function requireUser() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/signin");
  return userId;
}

/** Why picks for this event can't be made now, or null if they can. */
function closed(event: Awaited<ReturnType<typeof getPickemEvent>>): MessageKey | null {
  if (!event || !event.game || !event.singles) return "play.pickem.err.notMajor";
  if (event.state !== "CREATED" || !event.startAt || event.startAt * 1000 <= Date.now()) return "play.pickem.err.locked";
  if (event.seeds.length < 8) return "play.pickem.err.notSeeded";
  return null;
}

export async function savePicks(eventId: string, champion: string, top8: string[]): Promise<ActionResult> {
  const userId = await requireUser();
  const t = await getT();
  if (typeof eventId !== "string" || !/^\d{1,12}$/.test(eventId)) return { error: t("play.pickem.err.unavailable") };
  const event = await getPickemEvent(eventId).catch(() => null);
  const why = closed(event);
  if (why) return { error: t(why) };
  const picks = checkPicks(champion, top8, event!.seeds);
  if ("error" in picks) return { error: t(picks.error) };
  const db = createAdminClient();
  const { data: profile } = await db.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (!profile) return { error: t("play.pickem.err.finishProfile") };
  const tags = Object.fromEntries(event!.seeds.filter((s) => picks.top8.includes(s.playerId)).map((s) => [s.playerId, s.tag]));
  const { error } = await db.from("pickem_picks").upsert({
    event_id: Number(eventId),
    user_id: userId,
    champion: picks.champion,
    top8: picks.top8,
    tags,
    event_name: event!.name.slice(0, 200),
    tournament: event!.tournament.slice(0, 200),
    tournament_slug: event!.tournamentSlug,
    game: event!.game,
    locks_at: new Date(event!.startAt! * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: t("play.pickem.err.saveFailed") };
  refresh();
  return {};
}

export async function clearPicks(eventId: string): Promise<ActionResult> {
  const userId = await requireUser();
  const t = await getT();
  if (typeof eventId !== "string" || !/^\d{1,12}$/.test(eventId)) return { error: t("play.pickem.err.unavailable") };
  const event = await getPickemEvent(eventId).catch(() => null);
  if (event?.startAt && event.startAt * 1000 <= Date.now()) return { error: t("play.pickem.err.locked") };
  const { error } = await createAdminClient().from("pickem_picks").delete().eq("event_id", Number(eventId)).eq("user_id", userId);
  if (error) return { error: t("play.pickem.err.clearFailed") };
  refresh();
  return {};
}
