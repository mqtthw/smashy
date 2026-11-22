import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./client";

export type LiveOptions = {
  /** Don't connect at all for a guest. */
  signedInOnly?: boolean;
  /** Told true when the live connection is up, false when it drops, times out or closes. */
  onStatus?: (connected: boolean) => void;
};

/** The real work behind `subscribeAsUser` (see realtime.ts, which loads this file only when needed). */
export function subscribeNow(build: (supabase: SupabaseClient) => RealtimeChannel, opts: LiveOptions = {}): () => void {
  const supabase = createClient();
  let channel: RealtimeChannel | null = null;
  let cancelled = false;

  (async () => {
    const { data } = await supabase.auth.getSession();
    if (cancelled) return;
    if (!data.session && opts.signedInOnly) return;
    if (data.session) await supabase.realtime.setAuth(data.session.access_token);
    channel = build(supabase).subscribe((status) => {
      if (!cancelled) opts.onStatus?.(status === "SUBSCRIBED");
    });
  })();

  return () => {
    cancelled = true;
    if (channel) supabase.removeChannel(channel);
  };
}
