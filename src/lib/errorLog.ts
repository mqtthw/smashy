// Built-in error log: problems on the live site, recorded in the database and shown in Admin > Health.
// Server-only. Never throws (logging must not cause a second error).
import "server-only";
import { createAdminClient } from "./supabase/admin";

export type ErrorSource = "server" | "browser";

/** Strips ids and numbers so repeats of the same problem land on one row. */
export function errorFingerprint(source: ErrorSource, message: string, path: string | null) {
  const norm = (s: string) =>
    s
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":id")
      .replace(/\d+/g, "#")
      .slice(0, 120);
  const route = (path ?? "").split("?")[0];
  return `${source}|${norm(route)}|${norm(message)}`;
}

export async function logError(source: ErrorSource, message: string, path: string | null, digest: string | null = null) {
  try {
    if (!process.env.SUPABASE_SECRET_KEY) return;
    // Not from `next dev`: a computer running Smashy for testing shares the live database, and its
    // errors (test pages, dev-only warnings) filled Admin > Health. They still show in its terminal.
    if (process.env.NODE_ENV === "development") return;
    const msg = (message || "Unknown error").slice(0, 1000);
    path = path ? path.split("?")[0] : null; // the page only: no search words or other details
    await createAdminClient().rpc("log_error", {
      p_fingerprint: errorFingerprint(source, msg, path),
      p_source: source,
      p_message: msg,
      p_path: path ? path.slice(0, 300) : null,
      p_digest: digest ? digest.slice(0, 100) : null,
    });
  } catch {
    // ignore
  }
}

export type ErrorReport = { id: string; source: ErrorSource; message: string; path: string | null; digest: string | null; count: number; firstSeen: string; lastSeen: string; resolved: boolean };

export async function listErrors(limit = 50): Promise<ErrorReport[]> {
  const { data } = await createAdminClient()
    .from("error_reports")
    .select("id, source, message, path, digest, count, first_seen, last_seen, resolved_at")
    .order("last_seen", { ascending: false })
    .limit(limit);
  return (data ?? []).map((e) => ({
    id: e.id, source: e.source, message: e.message, path: e.path, digest: e.digest, count: e.count,
    firstSeen: e.first_seen, lastSeen: e.last_seen, resolved: !!e.resolved_at,
  }));
}

/** New (unresolved) errors, for the Admin badge. */
export async function countOpenErrors(): Promise<number> {
  const { count } = await createAdminClient().from("error_reports").select("id", { count: "exact", head: true }).is("resolved_at", null);
  return count ?? 0;
}
