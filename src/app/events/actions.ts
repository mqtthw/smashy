"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { actionError, type ActionResult } from "@/lib/actionErrors";
import { getExpectedWeekly } from "@/lib/events";
import { weeklyRef, type EventKind } from "@/lib/rsvps";
import { getTournament } from "@/lib/startgg";
import { createClient, getVerifiedUserId } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";

/** Say you're going to a tournament or a weekly (or take it back). Checked against the real event. */
export async function setGoing(kind: EventKind, ref: string, going: boolean): Promise<ActionResult> {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/signin");
  const supabase = await createClient();
  const t = await getT();
  if (!going) {
    const { error } = await supabase.from("event_rsvps").delete().eq("user_id", userId).eq("event_kind", kind).eq("event_ref", ref);
    if (error) return actionError(error);
    refresh();
    return {};
  }
  let name: string;
  let startAt: number;
  let endAt: number | null = null;
  if (kind === "tournament") {
    const found = await getTournament(ref).catch(() => null);
    if (!found) return { error: t("browse.err.notFound") };
    ({ name, startAt, endAt } = found);
  } else if (kind === "weekly") {
    const w = await getExpectedWeekly(ref.split("@")[0]).catch(() => null);
    if (!w || weeklyRef(w.id, w.startAt) !== ref) return { error: t("browse.err.dateChanged") };
    ({ name, startAt } = w);
  } else {
    return { error: t("browse.err.notFound") };
  }
  if ((endAt ?? startAt + 86400) < Date.now() / 1000) return { error: t("browse.err.over") };
  const { error } = await supabase.from("event_rsvps").insert({
    user_id: userId,
    event_kind: kind,
    event_ref: ref,
    event_name: name.slice(0, 200),
    starts_at: new Date(startAt * 1000).toISOString(),
  });
  if (error) return actionError(error);
  refresh();
  return {};
}
