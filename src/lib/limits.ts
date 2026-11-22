// Limits on things that cost money each time (a paid image check, a paid translation), kept in the
// database so they hold across every server (public.limit_action).
import "server-only";
import { createClient } from "./supabase/server";

/**
 * Counts one more use of `action` for the signed-in person. Returns a message for them when they're
 * over the limit, or null when it's fine to go ahead.
 * If the check itself can't run (say the database function is missing or lost its permission), it
 * lets them through and logs it: a broken limit must never break the feature it guards.
 */
export async function overLimit(action: "avatar_upload" | "translate" | "photo_check"): Promise<string | null> {
  try {
    const { error } = await (await createClient()).rpc("limit_action", { action });
    if (!error) return null;
    if (error.code === "P0429") return error.message;
    console.error("limit_action could not run", action, error.code, error.message);
    return null;
  } catch (e) {
    console.error("limit_action could not run", action, e instanceof Error ? e.message : e);
    return null;
  }
}
