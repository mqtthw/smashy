// Smash history, step A4 (part 2, docs/archive-plan.md): "Report a mistake" on a major or a moment.
// A signed-in member says what's wrong (and can link a source); site admins fix or hide it and mark the
// report done on Admin → Majors.
import "server-only";
import { connection } from "next/server";
import type { HandProblem } from "./handMajors";
import { createAdminClient } from "./supabase/admin";
import { cleanPublicText } from "./wordFilter";

export const MAX_REPORTS_PER_DAY = 5;

/** What a report points at: "major:<slug>" or "moment:<id>" (the form's picker sends one of these). */
export function parseTarget(value: string): { majorSlug: string } | { momentId: string } | null {
  const [kind, ...rest] = value.split(":");
  const ref = rest.join(":");
  if (kind === "major" && ref && ref.length <= 200) return { majorSlug: ref };
  if (kind === "moment" && /^[0-9a-f-]{36}$/i.test(ref)) return { momentId: ref };
  return null;
}

/** Checks a report's text and link. */
export function checkReport(message: string, link: string): { message: string; link: string | null } | { error: HandProblem } {
  const text = cleanPublicText(message.replace(/\s+/g, " "));
  if (text.flagged) return { error: { key: "history.err.wording" } };
  if (text.text.length < 5 || text.text.length > 500) return { error: { key: "history.report.err.message" } };
  const l = link.trim();
  if (!l) return { message: text.text, link: null };
  try {
    const url = new URL(l);
    if (url.protocol !== "https:") return { error: { key: "history.err.sourceHttps" } };
    return { message: text.text, link: url.toString() };
  } catch {
    return { error: { key: "history.err.sourceHttps" } };
  }
}

/** A member reports a mistake. */
export async function reportMistake(userId: string, target: string, message: string, link: string): Promise<{ ok?: boolean; error?: HandProblem }> {
  const what = parseTarget(target);
  if (!what) return { error: { key: "history.report.err.pick" } };
  const checked = checkReport(message, link);
  if ("error" in checked) return checked;
  const db = createAdminClient();
  // It has to exist and be shown (a hidden major or a moment that isn't approved can't be reported).
  const exists =
    "majorSlug" in what
      ? (await db.from("majors").select("slug").eq("slug", what.majorSlug).eq("hidden", false).maybeSingle()).data
      : (await db.from("history_moments").select("id").eq("id", what.momentId).eq("status", "approved").maybeSingle()).data;
  if (!exists) return { error: { key: "history.report.err.pick" } };
  const { count } = await db
    .from("history_reports")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gt("created_at", new Date(Date.now() - 86400_000).toISOString());
  if ((count ?? 0) >= MAX_REPORTS_PER_DAY) return { error: { key: "history.report.err.perDay", values: { n: MAX_REPORTS_PER_DAY } } };
  const { error } = await db.from("history_reports").insert({
    user_id: userId,
    major_slug: "majorSlug" in what ? what.majorSlug : null,
    moment_id: "momentId" in what ? what.momentId : null,
    message: checked.message,
    link: checked.link,
  });
  return error ? { error: { key: "history.err.saveFailed" } } : { ok: true };
}

export type HistoryReport = {
  id: string;
  message: string;
  link: string | null;
  createdAt: string;
  by: string | null;
  major: { slug: string; name: string; hidden: boolean } | null;
  moment: { id: string; title: string; day: string; status: string } | null;
};

/** Admin: open reports, oldest first, with what they point at and who sent them. */
export async function getOpenReports(): Promise<HistoryReport[]> {
  await connection();
  const { data, error } = await createAdminClient()
    .from("history_reports")
    .select(
      "id, message, link, created_at, by:profiles!history_reports_user_id_fkey ( handle ), major:majors ( slug, name, hidden ), moment:history_moments ( id, title, happened_on, status )",
    )
    .eq("status", "open")
    .order("created_at")
    .limit(50);
  if (error) throw error;
  type Row = {
    id: string;
    message: string;
    link: string | null;
    created_at: string;
    by: { handle: string | null } | null;
    major: { slug: string; name: string; hidden: boolean } | null;
    moment: { id: string; title: string; happened_on: string; status: string } | null;
  };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    message: r.message,
    link: r.link,
    createdAt: r.created_at,
    by: r.by?.handle ?? null,
    major: r.major,
    moment: r.moment ? { id: r.moment.id, title: r.moment.title, day: r.moment.happened_on, status: r.moment.status } : null,
  }));
}

/** Admin: mark a report done. */
export async function resolveReport(id: string) {
  const { error } = await createAdminClient().from("history_reports").update({ status: "done", resolved_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}
