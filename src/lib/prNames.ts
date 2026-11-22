// Names on the PR: the name a scene's ranking (on Braacket) already uses for a player, set by a host
// before copying a finished bracket to Challonge, and remembered for that host's next events. Members
// are matched by account, walk-ins by tag (any capitals). Server-only; players never see these.
import "server-only";
import { createAdminClient } from "./supabase/admin";

export type PrRow = { id: string; tag: string; prName: string | null };
type Player = { tag: string; handle: string };

const guestKey = (tag: string) => tag.trim().toLowerCase();
/** A tag as an exact (any capitals) ILIKE pattern: % and _ match themselves. */
const likeExact = (tag: string) => tag.trim().replace(/[\\%_]/g, (c) => "\\" + c);

/** A host's PR names for these bracket players (a member has a handle; a walk-in has only a tag). */
export async function getPrNames(hostId: string, players: Map<string, Player>): Promise<Map<string, string>> {
  const members = [...players].filter(([, p]) => p.handle).map(([id]) => id);
  const guests = [...players].filter(([, p]) => !p.handle);
  const db = createAdminClient();
  const [{ data: m }, { data: g }] = await Promise.all([
    members.length ? db.from("pr_names").select("user_id, pr_name").eq("host_id", hostId).in("user_id", members) : Promise.resolve({ data: [] }),
    guests.length ? db.from("pr_names").select("guest_tag, pr_name").eq("host_id", hostId).not("guest_tag", "is", null) : Promise.resolve({ data: [] }),
  ]);
  const out = new Map<string, string>();
  for (const r of (m ?? []) as { user_id: string; pr_name: string }[]) out.set(r.user_id, r.pr_name);
  const byTag = new Map(((g ?? []) as { guest_tag: string; pr_name: string }[]).map((r) => [guestKey(r.guest_tag), r.pr_name]));
  for (const [id, p] of guests) {
    const name = byTag.get(guestKey(p.tag));
    if (name) out.set(id, name);
  }
  return out;
}

/** The rows to show a host: every bracket player, with their remembered PR name (if any), by tag. */
export async function prRows(hostId: string, players: Map<string, Player>): Promise<PrRow[]> {
  const names = await getPrNames(hostId, players);
  return [...players]
    .map(([id, p]) => ({ id, tag: p.tag, prName: names.get(id) ?? null }))
    .sort((a, b) => a.tag.localeCompare(b.tag, undefined, { sensitivity: "base" }));
}

/** Set (or clear, with an empty name) a player's PR name for this host. */
export async function savePrName(hostId: string, who: { userId: string } | { guestTag: string }, name: string): Promise<void> {
  const db = createAdminClient();
  const clean = name.trim().replace(/\s+/g, " ").slice(0, 60);
  const match = "userId" in who ? db.from("pr_names").delete().eq("host_id", hostId).eq("user_id", who.userId) : db.from("pr_names").delete().eq("host_id", hostId).ilike("guest_tag", likeExact(who.guestTag));
  const { error: delError } = await match;
  if (delError) throw delError;
  if (!clean) return;
  const row: { host_id: string; pr_name: string; user_id: string | null; guest_tag: string | null } =
    "userId" in who ? { host_id: hostId, pr_name: clean, user_id: who.userId, guest_tag: null } : { host_id: hostId, pr_name: clean, user_id: null, guest_tag: who.guestTag.trim().slice(0, 30) };
  const { error } = await db.from("pr_names").insert(row);
  if (error) throw error;
}

/** The name to send to Challonge: the PR name when set, else the tag. */
export const nameForCopy = (tag: string, prName: string | undefined) => (prName?.trim() ? prName.trim() : tag);
