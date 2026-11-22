// Pick'em for majors: reading members' picks. The table is closed to members; this reads it on the
// server and only shows other people's picks once they're locked (the event has started), so
// nobody can copy. Names follow the viewer's privacy rules (a teen isn't shown to guests). Server-only.
import "server-only";
import { avatarUrl } from "./avatarLinks";
import { rankScores, scorePicks, type PickScore, type Ranked } from "./pickem";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";

export type Pick = { userId: string; champion: string; top8: string[]; tags: Record<string, string>; pickedAt: string };

type Row = { user_id: string; champion: string; top8: string[]; tags: Record<string, string> | null; updated_at: string };
const toPick = (r: Row): Pick => ({ userId: r.user_id, champion: r.champion, top8: r.top8, tags: r.tags ?? {}, pickedAt: r.updated_at });

/** This person's picks for an event (null = none yet). */
export async function getMyPick(eventId: string, userId: string | null): Promise<Pick | null> {
  if (!userId || !/^\d{1,12}$/.test(eventId)) return null;
  const { data } = await createAdminClient().from("pickem_picks").select("user_id, champion, top8, tags, updated_at").eq("event_id", eventId).eq("user_id", userId).maybeSingle();
  return data ? toPick(data as Row) : null;
}

/** How many have made picks for an event (shown before the lock, without anyone's picks). */
export async function countPicks(eventId: string): Promise<number> {
  if (!/^\d{1,12}$/.test(eventId)) return 0;
  const { count } = await createAdminClient().from("pickem_picks").select("event_id", { count: "exact", head: true }).eq("event_id", eventId);
  return count ?? 0;
}

export type BoardRow = Pick & PickScore & { tag: string; handle: string; avatarUrl: string | null; me: boolean; followed: boolean };

/**
 * Everyone's picks for an event once it has started, scored when there are final standings, best
 * first. Call only after the lock. People this viewer can't see (a teen, for a guest) are left out.
 */
export async function getBoard(eventId: string, viewerId: string | null, placements: Map<string, number> | null): Promise<{ rows: Ranked<BoardRow>[]; all: Pick[] }> {
  if (!/^\d{1,12}$/.test(eventId)) return { rows: [], all: [] };
  const { data } = await createAdminClient().from("pickem_picks").select("user_id, champion, top8, tags, updated_at").eq("event_id", eventId).order("updated_at").limit(2000);
  const all = ((data ?? []) as Row[]).map(toPick);
  if (!all.length) return { rows: [], all };
  const supabase = await createClient();
  const ids = all.map((p) => p.userId);
  const people = new Map<string, { tag: string; handle: string; avatar_path: string | null }>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data: profs } = await supabase.from("profiles").select("id, tag, handle, avatar_path").in("id", ids.slice(i, i + 200));
    for (const p of (profs ?? []) as { id: string; tag: string; handle: string; avatar_path: string | null }[]) people.set(p.id, p);
  }
  let followed = new Set<string>();
  if (viewerId) {
    const { data: f } = await supabase.from("follows").select("followee_id").eq("follower_id", viewerId).eq("status", "active").in("followee_id", ids.slice(0, 1000));
    followed = new Set(((f ?? []) as { followee_id: string }[]).map((r) => r.followee_id));
  }
  const rows = all.flatMap((p) => {
    const who = people.get(p.userId);
    if (!who) return [];
    const score = placements ? scorePicks(p, placements) : { points: 0, championRight: false, inTop8: [] };
    return [{ ...p, ...score, tag: who.tag, handle: who.handle, avatarUrl: avatarUrl(who.avatar_path), me: p.userId === viewerId, followed: followed.has(p.userId) }];
  });
  return { rows: rankScores(rows), all };
}

export type MyPickemRow = { eventId: string; eventName: string; tournament: string; locksAt: string; champion: string; tags: Record<string, string> };

/** This person's picks across events, newest first (for "Your picks"). */
export async function getMyPicks(userId: string | null, limit = 20): Promise<MyPickemRow[]> {
  if (!userId) return [];
  const { data } = await createAdminClient().from("pickem_picks").select("event_id, event_name, tournament, locks_at, champion, tags").eq("user_id", userId).order("locks_at", { ascending: false }).limit(limit);
  return ((data ?? []) as { event_id: number; event_name: string; tournament: string; locks_at: string; champion: string; tags: Record<string, string> | null }[]).map((r) => ({
    eventId: String(r.event_id),
    eventName: r.event_name,
    tournament: r.tournament,
    locksAt: r.locks_at,
    champion: r.champion,
    tags: r.tags ?? {},
  }));
}
