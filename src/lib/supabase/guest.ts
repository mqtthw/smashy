// Supabase client that is ALWAYS a signed-out guest, no matter who is asking.
// Used for anything shown outside Smashy (link previews in iMessage, Discord, X…): those must only
// ever contain what a guest can see, so teen posts and profiles can never leak into a preview,
// even when a signed-in player is the one whose request generates it.
import { createClient } from "@supabase/supabase-js";
import { timedFetch } from "./timedFetch";

export function createGuestClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    // Pages don't wait forever on a stalled database (see timedFetch.ts).
    global: { fetch: timedFetch() },
  });
}

export const hasSupabase = () => !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
