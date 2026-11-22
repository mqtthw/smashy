"use client";

import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { maybeSignedIn } from "./lazy";
import type { LiveOptions } from "./realtimeCore";

/**
 * Subscribe to a live channel AS the signed-in user. Chat and lobbies are members-only,
 * so the login must be loaded before subscribing, or the database treats us as a guest
 * and (correctly) sends nothing.
 * `signedInOnly`: don't connect at all for a guest (things only a member can ever receive, like
 * their own notifications). Without it guests connect too (they can watch a live bracket).
 * The Supabase library is downloaded here, after the page is up, not with the page itself; a guest
 * asking for a `signedInOnly` channel never downloads it.
 * `onStatus` hears whether the live connection is up (so a page can fall back to reloading on a
 * timer while it is not).
 * Returns a cleanup function.
 */
export function subscribeAsUser(build: (supabase: SupabaseClient) => RealtimeChannel, opts: LiveOptions = {}): () => void {
  if (opts.signedInOnly && !maybeSignedIn()) return () => {};
  let cancelled = false;
  let stop: (() => void) | null = null;
  import("./realtimeCore")
    .then((m) => {
      if (!cancelled) stop = m.subscribeNow(build, opts);
    })
    .catch(() => {}); // offline or a new deploy mid-visit: no live updates until the next page load
  return () => {
    cancelled = true;
    stop?.();
  };
}
