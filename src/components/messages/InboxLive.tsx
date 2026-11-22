"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { liveRefresh } from "@/lib/liveRefresh";
import { subscribeAsUser } from "@/lib/supabase/realtime";

/**
 * Refreshes the inbox when a message arrives in any of your chats. A busy group chat can send many
 * messages a minute: they become one refresh, at most every 3 seconds, and none while the tab is in
 * the background (it catches up when you come back).
 */
export default function InboxLive() {
  const router = useRouter();
  useEffect(() => {
    const live = liveRefresh({ refresh: () => router.refresh(), settleMs: 400, jitterMs: 0, minGapMs: 3_000 });
    const stop = subscribeAsUser(
      (client) => client.channel(`inbox-${Math.random().toString(36).slice(2)}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, live.onChange),
      { onStatus: live.onStatus },
    );
    document.addEventListener("visibilitychange", live.onVisible);
    return () => {
      live.stop();
      document.removeEventListener("visibilitychange", live.onVisible);
      stop();
    };
  }, [router]);
  return null;
}
