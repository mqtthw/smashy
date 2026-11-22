// Hosted events, phase 4: saving final placements when a bracket finishes (with a "You placed 3rd"
// notification for every player), and day-before reminders for people signed up. Server-only.
import "server-only";
import { finalPlacements, type EngineSet } from "./bracketEngine";
import { pageAll } from "./pageAll";
import { createAdminClient } from "./supabase/admin";
import { accountsBehind } from "./hostedTeams";
import { langsFor, trFor } from "./i18n/recipients";
import { placeIn } from "./i18n/core";


// The placements themselves are plain bracket logic (lib/bracketEngine); pages import them from here.
export { finalPlacements };

/** The bracket just finished: save placements and tell each player how they did. */
export async function recordResults(eventId: string, sets: EngineSet[]) {
  const db = createAdminClient();
  const placements = finalPlacements(sets);
  // Saved one place at a time (everyone tied for 5th in one request), in batches of 100, instead of
  // two requests per player all at once. Walk-ins get their placement too (an id only ever matches
  // a row in one of the two tables).
  const byPlace = new Map<number, string[]>();
  for (const p of placements) byPlace.set(p.place, [...(byPlace.get(p.place) ?? []), p.id]);
  // The accounts behind each entry (the ones who can be notified): the player, or a team's members.
  const accounts = new Map<string, string[]>();
  for (const [place, ids] of byPlace) {
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100);
      const [entrants, guests, behind] = await Promise.all([
        db.from("hosted_entrants").update({ placement: place }).eq("event_id", eventId).in("user_id", chunk),
        db.from("hosted_guests").update({ placement: place }).eq("event_id", eventId).in("id", chunk),
        accountsBehind(chunk, db),
      ]);
      if (entrants.error || guests.error) console.error("saving placements failed", (entrants.error ?? guests.error)!.message);
      for (const [id, users] of behind) accounts.set(id, users);
    }
  }
  const { data: ev } = await db.from("hosted_events").select("name").eq("id", eventId).maybeSingle();
  const name = (ev?.name as string | undefined) ?? "the event";
  // Once per player per event (a bracket finished, undone and finished again doesn't notify twice).
  const { data: sent } = await db.from("notifications").select("user_id").eq("type", "event_result").eq("event_href", `/host/${eventId}`);
  const already = new Set((sent ?? []).map((n) => n.user_id as string));
  const langs = await langsFor([...accounts.values()].flat()); // each in their own language
  // Only people with an account: walk-ins have none, and neither does someone who deleted theirs
  // mid-event (one missing account used to make the whole batch fail, so nobody was told).
  const rows = placements.flatMap((p) =>
    (accounts.get(p.id) ?? [])
      .filter((user) => !already.has(user))
      .map((user_id) => ({
        user_id,
        actor_id: null,
        type: "event_result",
        event_name: trFor(langs.get(user_id) ?? "en")("alert.ev.placedAt", { place: placeIn(langs.get(user_id) ?? "en", p.place), event: name }).slice(0, 200),
        event_href: `/host/${eventId}`,
      })),
  );
  if (rows.length) {
    const { error } = await db.from("notifications").insert(rows);
    if (error) console.error("event_result notifications failed", error.message);
  }
}

/** A finished bracket was undone (the host fixed a result): placements go until it finishes again. */
export async function clearResults(eventId: string) {
  const db = createAdminClient();
  await db.from("hosted_entrants").update({ placement: null }).eq("event_id", eventId);
  await db.from("hosted_guests").update({ placement: null }).eq("event_id", eventId);
}

/**
 * "Tomorrow: <event>" for everyone signed up to a hosted event starting in the next 36 hours (run by
 * the daily job). Each person is reminded once per event.
 */
export async function sendHostedReminders(): Promise<number> {
  const db = createAdminClient();
  const now = Date.now();
  const { data: events } = await db
    .from("hosted_events")
    .select("id, name, parent_id")
    .is("removed_at", null)
    .in("status", ["open", "closed"])
    .gt("starts_at", new Date(now).toISOString())
    .lt("starts_at", new Date(now + 36 * 3600_000).toISOString())
    .limit(500);
  let sent = 0;
  // Main events first: someone in an event and one of its extra brackets is reminded once, about the event.
  const list = ((events ?? []) as { id: string; name: string; parent_id: string | null }[]).sort((a, b) => Number(!!a.parent_id) - Number(!!b.parent_id));
  for (const e of list) {
    const href = `/host/${e.id}`;
    const entrants = await pageAll<{ user_id: string }>((a, b) => db.from("hosted_entrants").select("user_id").eq("event_id", e.id).order("user_id").range(a, b));
    const hrefs = e.parent_id ? [href, `/host/${e.parent_id}`] : [href];
    const { data: already } = await db.from("notifications").select("user_id").eq("type", "event_reminder").in("event_href", hrefs);
    const done = new Set((already ?? []).map((r) => r.user_id as string));
    const rows = entrants.filter((x) => !done.has(x.user_id)).map((x) => ({ user_id: x.user_id, actor_id: null, type: "event_reminder", event_name: e.name, event_href: href }));
    if (!rows.length) continue;
    const { error } = await db.from("notifications").insert(rows);
    if (error) console.error("hosted reminders failed", error.message);
    else sent += rows.length;
  }
  return sent;
}
