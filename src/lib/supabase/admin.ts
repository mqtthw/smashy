// Admin client using the SECRET key. It bypasses row-level security,
// so only use it on the server for specific jobs (like deleting an under-13 account).
// The "server-only" import makes the build fail if a "use client" file ever imports this.
import "server-only";
import type { Database } from "./database.types";
import { createClient } from "@supabase/supabase-js";
import { timedFetch } from "./timedFetch";

/**
 * `forPage`: the read is part of showing a page, so it gives up after 10 seconds instead of waiting
 * for a stalled database (round 588; pages show "Try again" or their saved copy instead of a
 * placeholder that never fills in). Background jobs leave it off: their writes can take longer.
 */
export function createAdminClient(opts: { forPage?: boolean } = {}) {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("SUPABASE_SECRET_KEY is missing. Add it to .env.local.");
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
    ...(opts.forPage ? { global: { fetch: timedFetch(10_000) } } : {}),
  });
}
