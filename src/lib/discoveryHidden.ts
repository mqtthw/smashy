// Accounts left out of discovery (Matthew, 2026-11-17): Who to follow, people search (and @mentions
// and new-message search, which use it), the "find people" lists and the Discord bot's /player.
// They still work and their profile pages still open by link. @appreview is the sign-in Apple's and
// Google's reviewers use for every app update (see lib/reviewSignIn.ts), so it stays, out of sight.
export const HIDDEN_FROM_DISCOVERY = ["appreview"] as const;

/** For a Supabase filter: `.not("handle", "in", HIDDEN_HANDLES)`. */
export const HIDDEN_HANDLES = `(${HIDDEN_FROM_DISCOVERY.join(",")})`;
