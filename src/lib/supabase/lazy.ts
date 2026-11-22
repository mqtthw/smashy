// The Supabase library is big (about a third of the JavaScript every page used to load first).
// Code that only needs it after the page is up (unread badges, live updates, the "new posts"
// check) gets it through here, so it downloads afterwards, and not at all where it isn't needed.
import type { createClient } from "./client";

export type BrowserClient = ReturnType<typeof createClient>;

/** The browser's Supabase client, downloading the library first if this page hasn't yet. */
export async function loadBrowserClient(): Promise<BrowserClient> {
  const { createClient: make } = await import("./client");
  return make();
}

/**
 * Could this browser be signed in? The login lives in a cookie the page can read, so a guest can be
 * told apart without loading any Supabase code. Says yes when unsure (cookies unreadable), so a
 * signed-in person never loses a feature to this shortcut.
 */
export function maybeSignedIn(): boolean {
  try {
    return document.cookie.includes("-auth-token");
  } catch {
    return true;
  }
}
