// What a quick action (like, repost, upvote, follow…) tells the button when it didn't work.
// The database's own rule messages ("You're doing that too fast…", "Join that scene…") are written
// for people, so they're passed on; anything else becomes a plain "try again".
import { after } from "next/server";

export type ActionResult = { error?: string };

export const GENERIC_ACTION_ERROR = "Couldn't save that. Please try again.";
export const GONE_ERROR = "That isn't available anymore. It may have been deleted.";

export function actionError(error: { code?: string; message: string } | null): ActionResult {
  if (!error) return {};
  if (error.code === "23505") return {}; // already done (double tap): nothing to report
  if (error.code === "P0001" || error.code === "P0429") return { error: error.message };
  if (error.code === "23503") return { error: GONE_ERROR }; // the post/player was deleted meanwhile
  console.error("Action failed", error.code, error.message);
  recordActionFailure(error);
  return { error: GENERIC_ACTION_ERROR };
}

/**
 * An unexpected failure also goes to Smashy's own error log (Admin > Health, round 731): the person only
 * sees "Couldn't save that", and Vercel keeps its logs for about an hour, so the cause used to be lost.
 * Saved after the answer is sent, so the action isn't slowed; never throws.
 */
function recordActionFailure(error: { code?: string; message: string }) {
  const save = async () => {
    const { logError } = await import("./errorLog");
    await logError("server", `Action failed (${error.code ?? "no code"}): ${error.message}`, null);
  };
  try {
    after(() => save().catch(() => {}));
  } catch {
    // Not inside a request (a test, a script): nothing to save to.
  }
}
