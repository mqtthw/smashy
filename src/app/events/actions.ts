"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { actionError, type ActionResult } from "@/lib/actionErrors";
import { getExpectedWeekly } from "@/lib/events";
import { weeklyRef, type EventKind, type RsvpStatus } from "@/lib/rsvps";
import { getTournament } from "@/lib/startgg";
import { createClient, getVerifiedUserId } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";

/**
 * Say you're going to a tournament or a weekly, or interested in it (round 730), or take it back
 * (`status` null). Checked against the real event.
 */
export async function setRsvp(kind: EventKind, ref: string, status: RsvpStatus | null): Promise<ActionResult> {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/signin");
  const supabase = await createClient();
  const t = await getT();
  if (status !== null && status !== "going" && status !== "interested") return { error: t("browse.err.notFound") };
  if (!status) {
    const { error } = await supabase.from("event_rsvps").delete().eq("user_id", userId).eq("event_kind", kind).eq("event_ref", ref);
    if (error) return actionError(error);
    refresh();
    return {};
  }
  // Already answered for this event: only the answer changes (no need to look the event up again).
  const { data: changed, error: changeError } = await supabase
    .from("event_rsvps")
    .update({ status })
    .eq("user_id", userId)
    .eq("event_kind", kind)
    .eq("event_ref", ref)
    .select("status");
  if (changeError) return actionError(changeError);
  if (changed?.length) {
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
    status,
  });
  if (error) return actionError(error);
  refresh();
  return {};
}
