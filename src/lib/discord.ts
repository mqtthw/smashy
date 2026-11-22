// Discord for an event: the host connected a channel (a webhook link kept where no member can read
// it), and Smashy posts there when the bracket starts, when sets are called, and the results.
// The messages themselves are plain functions in lib/discordMessages.ts. Server-only.
//
// Everything here is "nice to have": nothing throws, so a slow or broken Discord never gets in the
// way of running the bracket.
import "server-only";
import { callsMessage, postDiscord, resultsMessage, startedMessage, type CalledSet } from "./discordMessages";
import { siteUrl } from "./siteMeta";
import { createAdminClient } from "./supabase/admin";
import { createGuestClient } from "./supabase/guest";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const link = (path: string) => new URL(path, siteUrl()).toString();

export type Hook = { eventId: string; url: string; calls: boolean; announcedAt: string | null; name: string; teams: boolean };

/**
 * The Discord connection an event posts to: its own or, for an extra bracket, its main event's.
 * Null when there isn't one (or the event is hidden). Reads with the server's own access: the link
 * must never be passed on to a page.
 */
export async function getHook(eventId: string): Promise<Hook | null> {
  if (!UUID.test(eventId)) return null;
  const db = createAdminClient();
  const { data: ev } = await db.from("hosted_events").select("id, name, parent_id, team_size, removed_at").eq("id", eventId).maybeSingle();
  if (!ev || ev.removed_at) return null;
  const { data } = await db.from("hosted_webhooks").select("event_id, url, calls, announced_at").eq("event_id", (ev.parent_id as string | null) ?? ev.id).maybeSingle();
  if (!data) return null;
  return { eventId: data.event_id as string, url: data.url as string, calls: !!data.calls, announcedAt: (data.announced_at as string | null) ?? null, name: ev.name as string, teams: ev.team_size === 2 };
}

/** Whether an event has a channel connected, for its host's page (never the link itself). */
export async function getDiscordStatus(eventId: string): Promise<{ connected: boolean; calls: boolean }> {
  if (!UUID.test(eventId)) return { connected: false, calls: true };
  const { data } = await createAdminClient().from("hosted_webhooks").select("calls").eq("event_id", eventId).maybeSingle();
  return { connected: !!data, calls: data ? !!data.calls : true };
}

/** Post, and forget a webhook Discord says no longer exists (it was deleted in the server's settings). */
export async function sendTo(hook: Pick<Hook, "eventId" | "url">, content: string, image?: string): Promise<boolean> {
  const res = await postDiscord(hook.url, content, fetch, image);
  if (!res.ok && res.gone) await createAdminClient().from("hosted_webhooks").delete().eq("event_id", hook.eventId).eq("url", hook.url);
  return res.ok;
}

/**
 * Names as someone who isn't signed in sees them (a Discord channel is public): players whose
 * profile is hidden from guests (teens) aren't named. Walk-ins and teams go by the name in the event.
 */
async function publicTags(ids: (string | null)[]): Promise<Map<string, string>> {
  const real = [...new Set(ids.filter((id): id is string => !!id))];
  const out = new Map<string, string>();
  for (let i = 0; i < real.length; i += 100) {
    const chunk = real.slice(i, i + 100);
    const guest = createGuestClient();
    const [{ data: profiles }, { data: named }] = await Promise.all([guest.from("profiles").select("id, tag").in("id", chunk), guest.from("hosted_guests").select("id, tag").in("id", chunk)]);
    for (const p of [...(profiles ?? []), ...(named ?? [])] as { id: string; tag: string }[]) out.set(p.id, p.tag);
  }
  return out;
}

/** The bracket just started. */
export async function discordStarted(eventId: string, entries: number): Promise<void> {
  try {
    const hook = await getHook(eventId);
    if (hook) await sendTo(hook, startedMessage(hook.name, entries, hook.teams, link(`/host/${eventId}/bracket`)));
  } catch (e) {
    console.error("discord: start post failed", e instanceof Error ? e.message : e);
  }
}

/** Sets were just called (or just got their setup): one message for all of them. */
export async function discordCalls(eventId: string, sets: { identifier: string | null; p1: string | null; p2: string | null; station: string | null }[]): Promise<void> {
  try {
    if (!sets.length) return;
    const hook = await getHook(eventId);
    if (!hook || !hook.calls) return;
    const tags = await publicTags(sets.flatMap((s) => [s.p1, s.p2]));
    const named: CalledSet[] = sets.map((s) => ({ identifier: s.identifier, a: tags.get(s.p1 ?? "") ?? "a player", b: tags.get(s.p2 ?? "") ?? "a player", station: s.station }));
    named.sort((a, b) => (a.identifier ?? "").localeCompare(b.identifier ?? "", undefined, { numeric: true }));
    await sendTo(hook, callsMessage(hook.name, named, link(`/host/${eventId}/bracket`)));
  } catch (e) {
    console.error("discord: set calls failed", e instanceof Error ? e.message : e);
  }
}

/** The bracket just finished: the top 8. */
export async function discordResults(eventId: string, placements: { id: string; place: number }[]): Promise<void> {
  try {
    const hook = await getHook(eventId);
    if (!hook) return;
    const tags = await publicTags(placements.filter((p) => p.place <= 8).map((p) => p.id));
    // With the results graphic (the Top 8 picture), so the post is ready to share as it is.
    await sendTo(hook, resultsMessage(hook.name, placements, (id) => tags.get(id) ?? null, link(`/host/${eventId}`)), link(`/host/${eventId}/top8.png`));
  } catch (e) {
    console.error("discord: results post failed", e instanceof Error ? e.message : e);
  }
}
