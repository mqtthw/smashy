"use client";

// Keeps a hosted event's page current while its bracket runs: when any set changes (called, a game
// reported, a result), the page reloads its data. The timing rules live in lib/liveRefresh.ts:
//  - A burst of changes becomes one reload, and reloads are at least 5 seconds apart. Every strike,
//    ban and game report in every set is a change, so in a busy bracket they arrive constantly.
//  - Viewers reload at slightly different moments (a little random delay), not all at once.
//  - A tab in the background doesn't reload; it catches up when it's looked at again.
//  - While live updates are connected, a quiet bracket reloads nothing (it used to re-download the
//    page every 30 seconds for every viewer); there is one safety reload every 5 minutes.
//  - Without live updates (a dropped connection, a network that blocks them) it refreshes every
//    30 seconds while the page is visible, so a TO never waits on a stale page.
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { liveRefresh } from "@/lib/liveRefresh";
import { subscribeAsUser } from "@/lib/supabase/realtime";

/** `safetyMs`: how often to reload anyway while live updates are connected (default 5 minutes). */
export default function BracketLive({ eventId, safetyMs = 5 * 60_000 }: { eventId: string; safetyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const live = liveRefresh({ refresh: () => router.refresh(), minGapMs: 5_000, connectedEveryMs: safetyMs, offlineEveryMs: Math.min(30_000, safetyMs) });
    const stop = subscribeAsUser(
      (client) =>
        client
          .channel(`hosted-bracket-${eventId}-${Math.random().toString(36).slice(2)}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "hosted_sets", filter: `event_id=eq.${eventId}` }, live.onChange),
      { onStatus: live.onStatus },
    );
    document.addEventListener("visibilitychange", live.onVisible);
    return () => {
      live.stop();
      document.removeEventListener("visibilitychange", live.onVisible);
      stop();
    };
  }, [eventId, router, safetyMs]);
  return null;
}
