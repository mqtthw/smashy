// Doubles: reading teams. A team is one bracket entry (a hosted_guests row named "A / B") with two
// members in hosted_team_members; a member is a Smashy account or just a name. Server-only.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type TeamMember = { userId: string | null; name: string; handle: string | null };

/**
 * Who is on each team of an event, by team id, in sign-up order. Read as the viewer, so the usual
 * privacy rules apply (a team with a teen isn't shown to someone who isn't signed in). A member
 * with an account shows under their current tag and links to their profile.
 */
export async function getTeamMembers(eventId: string): Promise<Map<string, TeamMember[]>> {
  const out = new Map<string, TeamMember[]>();
  if (!UUID.test(eventId)) return out;
  const supabase = await createClient();
  const { data } = await supabase
    .from("hosted_team_members")
    .select("guest_id, slot, user_id, name, profile:profiles ( tag, handle )")
    .eq("event_id", eventId)
    .order("slot")
    .limit(1200);
  type Row = { guest_id: string; user_id: string | null; name: string; profile: { tag: string; handle: string } | null };
  for (const r of (data ?? []) as unknown as Row[]) {
    const list = out.get(r.guest_id) ?? [];
    list.push({ userId: r.user_id, name: r.profile?.tag ?? r.name, handle: r.profile?.handle ?? null });
    out.set(r.guest_id, list);
  }
  return out;
}

/** The team this person is on in an event (null = none). */
export async function getMyTeamId(eventId: string, userId: string | null): Promise<string | null> {
  if (!userId || !UUID.test(eventId)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("hosted_team_members").select("guest_id").eq("event_id", eventId).eq("user_id", userId).maybeSingle();
  return (data?.guest_id as string | undefined) ?? null;
}

/**
 * The id this person plays under in an event's bracket: their own in singles, their team's in
 * doubles (null = not signed in, or not on a team). Sets, "you're up" and results all go by it.
 */
export async function entryIdFor(event: { id: string; teamSize: number }, userId: string | null): Promise<string | null> {
  if (!userId) return null;
  return event.teamSize === 2 ? getMyTeamId(event.id, userId) : userId;
}

/**
 * Which side of a set this person is on: 1 or 2, as themselves or as a member of the team in that
 * slot (null = neither). Checked with the server's own access, since it decides who may report.
 */
export async function slotInSet(set: { p1_id: string | null; p2_id: string | null }, userId: string): Promise<1 | 2 | null> {
  if (set.p1_id === userId) return 1;
  if (set.p2_id === userId) return 2;
  const sides = [set.p1_id, set.p2_id].filter((id): id is string => !!id);
  if (!sides.length) return null;
  const { data } = await createAdminClient().from("hosted_team_members").select("guest_id").eq("user_id", userId).in("guest_id", sides).limit(1);
  const team = data?.[0]?.guest_id as string | undefined;
  return team === set.p1_id ? 1 : team === set.p2_id ? 2 : null;
}

/**
 * The Smashy accounts behind bracket entries, by entry id: a signed-up player is their own account,
 * a team is its members who have one, a walk-in is nobody. For notifications (an entry without an
 * account can't be notified, and the database refuses a notification addressed to one).
 */
export async function accountsBehind(ids: (string | null | undefined)[], db: SupabaseClient = createAdminClient()): Promise<Map<string, string[]>> {
  const real = [...new Set(ids.filter((id): id is string => !!id))];
  const out = new Map<string, string[]>();
  if (!real.length) return out;
  const [{ data: profiles }, { data: members }] = await Promise.all([
    db.from("profiles").select("id").in("id", real),
    db.from("hosted_team_members").select("guest_id, user_id").in("guest_id", real).not("user_id", "is", null),
  ]);
  for (const p of (profiles ?? []) as { id: string }[]) out.set(p.id, [p.id]);
  for (const m of (members ?? []) as { guest_id: string; user_id: string }[]) out.set(m.guest_id, [...(out.get(m.guest_id) ?? []), m.user_id]);
  return out;
}

/** The teams of an event that have at least one member with an account (they can report from a phone). */
export async function teamsWithAccounts(eventId: string): Promise<Set<string>> {
  if (!UUID.test(eventId)) return new Set();
  const supabase = await createClient();
  const { data } = await supabase.from("hosted_team_members").select("guest_id").eq("event_id", eventId).not("user_id", "is", null).limit(1200);
  return new Set(((data ?? []) as { guest_id: string }[]).map((r) => r.guest_id));
}
