// Background refresh jobs (majors scan, Reels clips, Texas events) with a database lock:
// only one copy runs at a time and success is recorded only when a run finishes. A run older than
// 10 minutes counts as dead. A failed scheduled or page-view run keeps its lock until then, so the
// next page view doesn't try again straight away (start.gg or Twitch being down shouldn't turn every
// visit into another slow failing request); a run started by hand (everyMinutes = 0) can be retried at once.
import "server-only";
import { createAdminClient } from "./supabase/admin";

export type RefreshJob = "majors" | "reels" | "events";
export type RefreshResult = "ran" | "skipped" | "failed";

/**
 * Runs `work` if the job is due (`everyMinutes` since the last success) and not already running.
 * Pass everyMinutes = 0 to run now unless another run is in progress.
 */
// Page views ask "is it due?" on every visit, but these jobs run every 30 minutes to several hours: a
// server that just asked waits 5 minutes before asking about the same job again (round 566). It was
// one database call per page view (9,163 since 2026-11-07; 67 in one 7-minute busy stretch).
const RECHECK_MS = 5 * 60_000;
const lastAsked = new Map<RefreshJob, number>();

/** Whether this server should ask the database about `job` now. Exported for tests. */
export function shouldAsk(asked: Map<string, number>, job: string, everyMinutes: number, now: number): boolean {
  if (everyMinutes === 0) return true; // started by hand: always
  const last = asked.get(job);
  if (last !== undefined && now - last < RECHECK_MS) return false;
  asked.set(job, now);
  return true;
}

export async function runRefresh(
  job: RefreshJob,
  everyMinutes: number,
  work: () => Promise<unknown>,
  { fromPageView = false }: { fromPageView?: boolean } = {},
): Promise<RefreshResult> {
  // The daily job and admin buttons always ask; page views ask at most every 5 minutes per server.
  if (fromPageView && !shouldAsk(lastAsked, job, everyMinutes, Date.now())) return "skipped";
  const db = createAdminClient();
  const { data: claimed, error } = await db.rpc("claim_refresh", { job, every_minutes: everyMinutes });
  if (error) {
    console.error(`Couldn't start the ${job} refresh:`, error.message);
    return "failed";
  }
  if (!claimed) return "skipped";
  try {
    await work();
    await db.rpc("finish_refresh", { job, ok: true });
    return "ran";
  } catch (e) {
    console.error(`The ${job} refresh failed:`, e);
    if (everyMinutes === 0) await db.rpc("finish_refresh", { job, ok: false });
    return "failed";
  }
}
