// "I'm going" to tournaments and weeklies, add-to-calendar files, and day-before reminders. Server-only.
import { dedupeRsvps } from "./rsvpDedupe";
import "server-only";
import { avatarUrl } from "./avatarLinks";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";
import { pageAll } from "./pageAll";

export type EventKind = "tournament" | "weekly";
/** "going", or "interested" (round 730): thinking about it, counted separately. */
export type RsvpStatus = "going" | "interested";
export type Going = { total: number; interested: number; mine: RsvpStatus | null; friends: { tag: string; handle: string; avatarUrl: string | null }[] };

/** A weekly's RSVP is for one date: "<series id>@<start time>". */
export const weeklyRef = (id: string, startAt: number) => `${id}@${startAt}`;
export const eventHref = (kind: EventKind, ref: string) => (kind === "tournament" ? `/events/${ref}` : `/events/weekly/${ref.split("@")[0]}`);

/** How many are going and how many are interested, which one you said, and which of your mutuals are going (same age group). */
export async function getGoing(kind: EventKind, ref: string, userId: string | null): Promise<Going> {
  const supabase = await createClient();
  const [{ data }, mine] = await Promise.all([
    supabase.rpc("event_going", { kind, ref }),
    userId
      ? supabase.from("event_rsvps").select("status").eq("user_id", userId).eq("event_kind", kind).eq("event_ref", ref).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const row = (data as { total: number; interested: number; friends: { tag: string; handle: string; avatar_path: string | null }[] }[] | null)?.[0];
  return {
    total: Number(row?.total ?? 0),
    interested: Number(row?.interested ?? 0),
    mine: mine.data ? (mine.data.status === "interested" ? "interested" : "going") : null,
    friends: (row?.friends ?? []).map((f) => ({ tag: f.tag, handle: f.handle, avatarUrl: avatarUrl(f.avatar_path) })),
  };
}

/** Events you said you're going to or interested in that haven't finished, soonest first (for Profile). */
export async function getMyUpcomingRsvps(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("event_rsvps")
    .select("event_kind, event_ref, event_name, starts_at")
    .eq("user_id", userId)
    .gte("starts_at", new Date(Date.now() - 12 * 3600_000).toISOString())
    .order("starts_at")
    .limit(10);
  return dedupeRsvps((data ?? []) as { event_kind: string; event_ref: string; event_name: string; starts_at: string }[]).map((r) => ({ name: r.event_name as string, startsAt: r.starts_at as string, href: eventHref(r.event_kind as EventKind, r.event_ref as string) }));
}

/**
 * Notifies people about events they're going to that start in the next 48 hours (once each). The job
 * runs once a day at 11:00 UTC, so an evening event in Texas (around 00:00-02:00 UTC) is ~37-39 hours
 * away on the day before; a 48-hour window reaches it then.
 */
export async function sendEventReminders(): Promise<number> {
  const db = createAdminClient();
  const now = Date.now();
  const due = await pageAll<{ user_id: string; event_kind: string; event_ref: string; event_name: string; starts_at: string }>((a, b) =>
    db
      .from("event_rsvps")
      .select("user_id, event_kind, event_ref, event_name, starts_at")
      .is("reminded_at", null)
      .gt("starts_at", new Date(now).toISOString())
      .lt("starts_at", new Date(now + 48 * 3600_000).toISOString())
      .order("starts_at")
      .range(a, b),
  );
  let sent = 0;
  const keep = new Set(dedupeRsvps(due));
  for (const r of due) {
    if (!keep.has(r)) {
      // The same event, RSVP'd twice (expected weekly, then the posted tournament): remind once.
      await db.from("event_rsvps").update({ reminded_at: new Date().toISOString() })
        .eq("user_id", r.user_id).eq("event_kind", r.event_kind).eq("event_ref", r.event_ref);
      continue;
    }
    const { error } = await db.from("notifications").insert({
      user_id: r.user_id,
      actor_id: null,
      type: "event_reminder",
      event_name: r.event_name,
      event_href: eventHref(r.event_kind as EventKind, r.event_ref as string),
      created_at: new Date().toISOString(),
    });
    if (error) {
      console.error("event reminder failed", error.message);
      continue;
    }
    await db.from("event_rsvps").update({ reminded_at: new Date().toISOString() })
      .eq("user_id", r.user_id).eq("event_kind", r.event_kind).eq("event_ref", r.event_ref);
    sent++;
  }
  return sent;
}

export type CalendarEvent = { uid: string; name: string; startAt: number; endAt: number | null; location: string | null; url: string; description?: string };

/** A calendar file (.ics) for one event. Times are UTC; calendar apps show them in local time. */
export function calendarFile(e: CalendarEvent) {
  return calendarFeed(null, [e]);
}

/**
 * A calendar with several events: a feed people subscribe to (`name` is what their calendar app calls
 * it; apps are asked to check back every few hours). Times are UTC; calendar apps show them in local time.
 */
export function calendarFeed(name: string | null, events: CalendarEvent[]) {
  const stamp = (unix: number) => new Date(unix * 1000).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  // Escape per RFC 5545 and fold long lines.
  const text = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (c) => `\\${c}`);
  // Lines over 75 bytes are folded, without splitting a character (emoji and accents take several bytes).
  const fold = (line: string) => {
    const parts: string[] = [];
    let cur = "";
    let bytes = 0;
    for (const ch of Array.from(line)) {
      const n = new TextEncoder().encode(ch).length;
      if (bytes + n > (parts.length ? 74 : 75)) {
        parts.push(cur);
        cur = "";
        bytes = 0;
      }
      cur += ch;
      bytes += n;
    }
    parts.push(cur);
    return parts.join("\r\n ");
  };
  const now = stamp(Math.floor(Date.now() / 1000));
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Smashy//Events//EN",
    "CALSCALE:GREGORIAN",
    ...(name ? [`X-WR-CALNAME:${text(name)}`, "REFRESH-INTERVAL;VALUE=DURATION:PT6H", "X-PUBLISHED-TTL:PT6H"] : []),
    ...events.flatMap((e) => {
      const end = e.endAt && e.endAt > e.startAt ? e.endAt : e.startAt + 4 * 3600;
      return [
        "BEGIN:VEVENT",
        `UID:${e.uid}@smashy`,
        `DTSTAMP:${now}`,
        `DTSTART:${stamp(e.startAt)}`,
        `DTEND:${stamp(end)}`,
        `SUMMARY:${text(e.name)}`,
        ...(e.location ? [`LOCATION:${text(e.location)}`] : []),
        `URL:${e.url}`,
        `DESCRIPTION:${text(`${e.description ? `${e.description}\n` : ""}${e.url}`)}`,
        "END:VEVENT",
      ];
    }),
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
