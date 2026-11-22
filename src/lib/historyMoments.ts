// Smash history, step A6 (docs/archive-plan.md): a timeline of moments. A date, a short factual title in
// the writer's own words, an optional note and game, and a required VOD or source link. Admins add them;
// members suggest them and an admin approves (Matthew, 2026-11-17). Shown on each year of Smash history
// and on /history/timeline. No verdicts ("greatest upset ever"): admins check the wording.
import "server-only";
import { connection } from "next/server";
import { isGameKey, type GameKey } from "./games";
import type { HandProblem } from "./handMajors";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";
import { cleanPublicText } from "./wordFilter";

export const MOMENT_FIRST_YEAR = 1999; // Smash 64
export const MAX_MOMENTS_PER_DAY = 5;
export const MAX_PENDING_MOMENTS = 10;

export type MomentInput = { day: string; title: string; note: string; link: string; game: string };
export type Moment = {
  id: string;
  day: string; // YYYY-MM-DD
  monthOnly: boolean; // only the month is known (stored as the 1st)
  title: string;
  note: string | null;
  link: string;
  game: GameKey | null;
  status: "pending" | "approved" | "rejected";
  suggestedBy: string | null; // handle, when the profile may be shown
};

type Row = { happened_on: string; title: string; note: string | null; link: string; game: GameKey | null };

/** Checks a moment. Returns the row to save, or what's wrong. `today` is YYYY-MM-DD (for "not in the future"). */
export function checkMoment(input: MomentInput, today: string): Row | { error: HandProblem } {
  const day = input.day.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(day))) return { error: { key: "history.err.day" } };
  if (Number(day.slice(0, 4)) < MOMENT_FIRST_YEAR) return { error: { key: "history.err.dayEarly", values: { year: MOMENT_FIRST_YEAR } } };
  if (day > today) return { error: { key: "history.err.future" } };
  const title = cleanPublicText(input.title.replace(/\s+/g, " "));
  if (title.flagged) return { error: { key: "history.err.wording" } };
  if (title.text.length < 3 || title.text.length > 140) return { error: { key: "history.err.title" } };
  const note = cleanPublicText(input.note.replace(/\s+/g, " "));
  if (note.flagged) return { error: { key: "history.err.wording" } };
  let link: URL;
  try {
    link = new URL(input.link.trim());
  } catch {
    return { error: { key: "history.err.link" } };
  }
  if (link.protocol !== "https:") return { error: { key: "history.err.link" } };
  if (input.game && !isGameKey(input.game)) return { error: { key: "history.err.pickGame", values: { n: 1 } } };
  return { happened_on: day, title: title.text, note: note.text.slice(0, 280) || null, link: link.toString(), game: input.game ? (input.game as GameKey) : null };
}

const todayUtc = () => new Date().toISOString().slice(0, 10);

/** Admin: add a moment (shown right away). */
export async function addMoment(input: MomentInput, adminId: string): Promise<{ ok?: boolean; error?: HandProblem }> {
  const row = checkMoment(input, todayUtc());
  if ("error" in row) return row;
  const { error } = await createAdminClient()
    .from("history_moments")
    .insert({ ...row, status: "approved", added_by: adminId, reviewed_at: new Date().toISOString() });
  return error ? { error: { key: "history.err.saveFailed" } } : { ok: true };
}

/** A member suggests a moment (an admin reviews it first). */
export async function suggestMoment(userId: string, input: MomentInput): Promise<{ ok?: boolean; error?: HandProblem }> {
  const row = checkMoment(input, todayUtc());
  if ("error" in row) return row;
  const db = createAdminClient();
  const dayAgo = new Date(Date.now() - 86400_000).toISOString();
  const [{ count: today }, { count: pending }] = await Promise.all([
    db.from("history_moments").select("id", { count: "exact", head: true }).eq("suggested_by", userId).gt("created_at", dayAgo),
    db.from("history_moments").select("id", { count: "exact", head: true }).eq("suggested_by", userId).eq("status", "pending"),
  ]);
  if ((today ?? 0) >= MAX_MOMENTS_PER_DAY) return { error: { key: "history.suggest.err.perDay", values: { n: MAX_MOMENTS_PER_DAY } } };
  if ((pending ?? 0) >= MAX_PENDING_MOMENTS) return { error: { key: "history.suggest.err.pending", values: { n: MAX_PENDING_MOMENTS } } };
  const { error } = await db.from("history_moments").insert({ ...row, status: "pending", suggested_by: userId });
  return error ? { error: { key: "history.err.saveFailed" } } : { ok: true };
}

const COLUMNS = "id, happened_on, month_only, title, note, link, game, status";
type DbMoment = Row & { id: string; month_only?: boolean | null; status: Moment["status"]; suggester?: { handle: string | null } | null };
const toMoment = (r: DbMoment): Moment => ({
  id: r.id,
  day: r.happened_on,
  monthOnly: r.month_only === true,
  title: r.title,
  note: r.note,
  link: r.link,
  game: r.game,
  status: r.status,
  suggestedBy: r.suggester?.handle ?? null,
});

/** Approved moments, oldest first: one year's, or all of them. Who suggested each follows profile privacy. */
export async function getMoments(year: number | null = null): Promise<Moment[]> {
  let q = (await createClient())
    .from("history_moments")
    .select(`${COLUMNS}, suggester:profiles!history_moments_suggested_by_fkey ( handle )`)
    .eq("status", "approved");
  if (year !== null) q = q.gte("happened_on", `${year}-01-01`).lte("happened_on", `${year}-12-31`);
  const { data, error } = await q.order("happened_on").limit(1000);
  if (error) throw error;
  return ((data ?? []) as unknown as DbMoment[]).map(toMoment);
}

/** The viewer's own suggested moments, newest first. */
export async function getMyMoments(userId: string): Promise<Moment[]> {
  const { data, error } = await (await createClient()).from("history_moments").select(COLUMNS).eq("suggested_by", userId).order("created_at", { ascending: false }).limit(20);
  if (error) throw error;
  return ((data ?? []) as DbMoment[]).map(toMoment);
}

/** Admin: moments waiting for review (oldest first), and the latest approved ones. */
export async function getMomentsForAdmin(): Promise<{ pending: Moment[]; recent: Moment[] }> {
  await connection();
  const db = createAdminClient();
  const sel = `${COLUMNS}, suggester:profiles!history_moments_suggested_by_fkey ( handle )`;
  const [pending, recent] = await Promise.all([
    db.from("history_moments").select(sel).eq("status", "pending").order("created_at").limit(50),
    db.from("history_moments").select(sel).eq("status", "approved").order("reviewed_at", { ascending: false }).limit(20),
  ]);
  if (pending.error) throw pending.error;
  if (recent.error) throw recent.error;
  return {
    pending: ((pending.data ?? []) as unknown as DbMoment[]).map(toMoment),
    recent: ((recent.data ?? []) as unknown as DbMoment[]).map(toMoment),
  };
}

/** Admin: approve or reject a suggested moment, or take an approved one down (`approve` = false). */
export async function reviewMoment(id: string, approve: boolean, adminId: string) {
  const { error } = await createAdminClient()
    .from("history_moments")
    .update({ status: approve ? "approved" : "rejected", added_by: adminId, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** Moments grouped by year, in the order given. */
export function byYear(moments: Moment[]): { year: number; moments: Moment[] }[] {
  const out: { year: number; moments: Moment[] }[] = [];
  for (const m of moments) {
    const year = Number(m.day.slice(0, 4));
    if (out.at(-1)?.year !== year) out.push({ year, moments: [] });
    out.at(-1)!.moments.push(m);
  }
  return out;
}
