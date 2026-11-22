// "Help build Smashy" (/help, round 653): suggestions from the community (character resources, missing
// locals, history fixes, feedback). Anyone can send one; only site admins read them (Admin → Suggestions).
import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "./supabase/admin";
import type { CleanSuggestion, SuggestionKind } from "./suggestionForm";

/** How many one person can send: per hour, and for everyone without an account per day (spam guard). */
export const PER_HOUR = { member: 10, guest: 5 } as const;
export const GUESTS_PER_DAY = 300;

/** A guest's IP address, hashed: enough to count their sends, never kept as the address itself. */
export function hashIp(ip: string): string {
  return createHash("sha256").update(`smashy-suggestions:${ip}`).digest("hex");
}

export type CommunitySuggestion = CleanSuggestion & {
  id: string;
  createdAt: string;
  status: "open" | "done" | "dismissed";
  fromMember: boolean;
};

/** Saves a suggestion, unless this person (or guests overall) sent too many lately. */
export async function saveSuggestion(s: CleanSuggestion, who: { userId: string | null; ip: string }): Promise<"ok" | "tooMany" | "failed"> {
  const db = createAdminClient();
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const ipHash = who.userId ? null : hashIp(who.ip);
  const mine = who.userId
    ? db.from("community_suggestions").select("id", { count: "exact", head: true }).eq("user_id", who.userId).gte("created_at", hourAgo)
    : db.from("community_suggestions").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash!).gte("created_at", hourAgo);
  const { count, error } = await mine;
  if (error) {
    console.error("community_suggestions count failed", error.message);
    return "failed";
  }
  if ((count ?? 0) >= (who.userId ? PER_HOUR.member : PER_HOUR.guest)) return "tooMany";
  if (!who.userId) {
    const dayAgo = new Date(Date.now() - 86400_000).toISOString();
    const { count: guests } = await db.from("community_suggestions").select("id", { count: "exact", head: true }).is("user_id", null).gte("created_at", dayAgo);
    if ((guests ?? 0) >= GUESTS_PER_DAY) return "tooMany";
  }
  const { error: insertError } = await db.from("community_suggestions").insert({
    kind: s.kind,
    game: s.game,
    character: s.character,
    link: s.link,
    details: s.details,
    contact: s.contact,
    user_id: who.userId,
    ip_hash: ipHash,
  });
  if (insertError) {
    console.error("community_suggestions insert failed", insertError.message);
    return "failed";
  }
  return "ok";
}

type Row = {
  id: string;
  kind: SuggestionKind;
  game: CleanSuggestion["game"];
  character: string | null;
  link: string | null;
  details: string;
  contact: string | null;
  user_id: string | null;
  status: CommunitySuggestion["status"];
  created_at: string;
};

/** Open suggestions for admins, newest first. */
export async function getOpenSuggestions(limit = 100): Promise<CommunitySuggestion[]> {
  const { data, error } = await createAdminClient()
    .from("community_suggestions")
    .select("id, kind, game, character, link, details, contact, user_id, status, created_at")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`community_suggestions: ${error.message}`);
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    kind: r.kind,
    game: r.game,
    character: r.character,
    link: r.link,
    details: r.details,
    contact: r.contact,
    status: r.status,
    createdAt: r.created_at,
    fromMember: Boolean(r.user_id),
  }));
}

/** How many are waiting (for the admin tab's count). */
export async function countOpenSuggestions(): Promise<number> {
  const { count } = await createAdminClient().from("community_suggestions").select("id", { count: "exact", head: true }).eq("status", "open");
  return count ?? 0;
}

/** An admin marks one done (acted on) or dismissed (not used). */
export async function closeSuggestion(id: string, status: "done" | "dismissed"): Promise<void> {
  const { error } = await createAdminClient()
    .from("community_suggestions")
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "open");
  if (error) throw new Error(`community_suggestions: ${error.message}`);
}
