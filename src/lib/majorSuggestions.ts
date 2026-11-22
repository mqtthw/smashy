// Smash history, step A4 (docs/archive-plan.md): members suggest a missing major, a site admin reviews
// it (like Reels clip submissions). A start.gg or parry.gg link (2017 on), or, before start.gg, the
// same facts an admin would type with a source link. Approved majors credit who suggested them.
import "server-only";
import { parseParryggSlug } from "./brackets/parrygg";
import { addHandMajor, checkHandMajor, type HandMajorInput, type HandProblem } from "./handMajors";
import { featureMajor, parseStartggSlug, PARRYGG_PREFIX } from "./majors";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";

export const MAX_SUGGESTIONS_PER_DAY = 5;
export const MAX_PENDING_SUGGESTIONS = 10;
const NOTE_MAX = 500;

export type SuggestionStatus = "pending" | "approved" | "rejected";
export type MajorSuggestion = {
  id: string;
  kind: "link" | "manual";
  link: string | null;
  details: HandMajorInput | null;
  note: string | null;
  status: SuggestionStatus;
  majorSlug: string | null;
  createdAt: string;
  /** What it's about: the major's name, or the link. */
  title: string;
  by?: { handle: string | null; tag: string | null };
};

/** The tournament a start.gg or parry.gg link points at, as a majors slug ("genesis-5", "parrygg/…"). */
export function suggestedSlug(link: string): string | null {
  const s = link.trim();
  if (!/^https:\/\//i.test(s)) return null;
  const parry = parseParryggSlug(s);
  if (parry) return PARRYGG_PREFIX + parry;
  return /start\.gg\/tournament\//i.test(s) ? parseStartggSlug(s) : null;
}

const clean = (note: string) => note.replace(/\s+/g, " ").trim().slice(0, NOTE_MAX) || null;

async function underLimits(userId: string): Promise<HandProblem | null> {
  const db = createAdminClient();
  const dayAgo = new Date(Date.now() - 86400_000).toISOString();
  const [{ count: today }, { count: pending }] = await Promise.all([
    db.from("major_suggestions").select("id", { count: "exact", head: true }).eq("user_id", userId).gt("created_at", dayAgo),
    db.from("major_suggestions").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "pending"),
  ]);
  if ((today ?? 0) >= MAX_SUGGESTIONS_PER_DAY) return { key: "history.suggest.err.perDay", values: { n: MAX_SUGGESTIONS_PER_DAY } };
  if ((pending ?? 0) >= MAX_PENDING_SUGGESTIONS) return { key: "history.suggest.err.pending", values: { n: MAX_PENDING_SUGGESTIONS } };
  return null;
}

/** A member suggests a start.gg or parry.gg tournament. */
export async function suggestLink(userId: string, link: string, note: string): Promise<{ ok?: boolean; error?: HandProblem }> {
  const slug = suggestedSlug(link);
  if (!slug) return { error: { key: "history.suggest.err.link" } };
  const db = createAdminClient();
  const { data: known } = await db.from("majors").select("hidden").eq("slug", slug).maybeSingle();
  if (known && !known.hidden) return { error: { key: "history.suggest.err.already" } };
  const { data: open } = await db.from("major_suggestions").select("id").eq("kind", "link").eq("status", "pending").ilike("link", `%${slug.replace(PARRYGG_PREFIX, "")}%`).limit(1);
  if (open?.length) return { error: { key: "history.suggest.err.waiting" } };
  const limited = await underLimits(userId);
  if (limited) return { error: limited };
  const { error } = await db.from("major_suggestions").insert({ user_id: userId, kind: "link", link: link.trim().slice(0, 300), note: clean(note) });
  return error ? { error: { key: "history.err.saveFailed" } } : { ok: true };
}

/** A member suggests a major from before start.gg, with the same checks as the admin form. */
export async function suggestManual(userId: string, input: HandMajorInput, note: string): Promise<{ ok?: boolean; error?: HandProblem }> {
  const checked = checkHandMajor(input);
  if ("error" in checked) return checked;
  const db = createAdminClient();
  const { data: known } = await db.from("majors").select("slug").eq("slug", checked.slug).maybeSingle();
  if (known) return { error: { key: "history.err.exists" } };
  const limited = await underLimits(userId);
  if (limited) return { error: limited };
  const { error } = await db.from("major_suggestions").insert({ user_id: userId, kind: "manual", details: input, note: clean(note) });
  return error ? { error: { key: "history.err.saveFailed" } } : { ok: true };
}

type Row = { id: string; kind: "link" | "manual"; link: string | null; details: HandMajorInput | null; note: string | null; status: SuggestionStatus; major_slug: string | null; created_at: string };
const COLUMNS = "id, kind, link, details, note, status, major_slug, created_at";

const toSuggestion = (r: Row): MajorSuggestion => ({
  id: r.id,
  kind: r.kind,
  link: r.link,
  details: r.details,
  note: r.note,
  status: r.status,
  majorSlug: r.major_slug,
  createdAt: r.created_at,
  title: r.details?.name || r.link || "",
});

/** The viewer's own suggestions, newest first. */
export async function getMySuggestions(userId: string): Promise<MajorSuggestion[]> {
  const { data, error } = await (await createClient()).from("major_suggestions").select(COLUMNS).eq("user_id", userId).order("created_at", { ascending: false }).limit(20);
  if (error) throw error;
  return ((data ?? []) as Row[]).map(toSuggestion);
}

/** Admin queue: suggestions waiting for review, oldest first, with who sent them. */
export async function getPendingSuggestions(): Promise<MajorSuggestion[]> {
  const { data, error } = await createAdminClient()
    .from("major_suggestions")
    .select(`${COLUMNS}, by:profiles!major_suggestions_user_id_fkey ( handle, tag )`)
    .eq("status", "pending")
    .order("created_at")
    .limit(50);
  if (error) throw error;
  return ((data ?? []) as unknown as (Row & { by: { handle: string | null; tag: string | null } | null })[]).map((r) => ({ ...toSuggestion(r), by: r.by ?? undefined }));
}

/** Admin: approve (adds the major and credits the member) or reject a suggestion. */
export async function reviewSuggestion(id: string, approve: boolean, adminId: string): Promise<{ ok?: boolean; error?: string }> {
  const db = createAdminClient();
  const { data: row } = await db.from("major_suggestions").select(`${COLUMNS}, user_id`).eq("id", id).eq("status", "pending").maybeSingle();
  if (!row) return { error: "That suggestion was already reviewed." };
  const s = row as Row & { user_id: string };
  let slug: string | null = null;
  if (approve) {
    if (s.kind === "link") {
      const res = await featureMajor(s.link ?? "");
      if (!res.ok || !res.slug) return { error: res.error ?? "Couldn't add it." };
      slug = res.slug;
      await db.from("majors").update({ suggested_by: s.user_id }).eq("slug", slug).is("suggested_by", null);
    } else {
      const res = await addHandMajor(s.details!, adminId, s.user_id);
      if (!res.ok || !res.slug) return { error: res.error?.key === "history.err.exists" ? "It's already in Smash history." : "Couldn't add it: its details don't pass the checks." };
      slug = res.slug;
    }
  }
  const { error } = await db
    .from("major_suggestions")
    .update({ status: approve ? "approved" : "rejected", major_slug: slug, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  return error ? { error: "Couldn't save the review." } : { ok: true };
}
