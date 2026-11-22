"use client";

import { useSyncExternalStore } from "react";
import { sharedLive } from "@/lib/sharedLive";
import { loadBrowserClient, maybeSignedIn } from "@/lib/supabase/lazy";
import { subscribeAsUser } from "@/lib/supabase/realtime";
import { useT } from "@/lib/i18n/client";

// One count for the whole screen: the badge shows in the navigation and on some pages at once, and
// they share a single query and a single live connection. A guest does nothing here (and so never
// downloads the Supabase library just for this badge).
const unread = sharedLive(0, (set) => {
  if (!maybeSignedIn()) return () => {};
  let alive = true;
  void (async () => {
    const supabase = await loadBrowserClient();
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id ?? null;
    if (!userId) return;
    const { count: n } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null);
    if (alive) set(n ?? 0);
  })().catch(() => {});
  const onRead = () => set(0);
  window.addEventListener("smashy:notifications-read", onRead);
  // New notifications arrive live (only your own rows are ever sent to you).
  const stop = subscribeAsUser(
    (client) => client.channel(`my-notifications-${crypto.randomUUID()}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => set((c) => c + 1)),
    { signedInOnly: true },
  );
  return () => {
    alive = false;
    window.removeEventListener("smashy:notifications-read", onRead);
    stop();
  };
});

/** Live unread-notification count (red dot with a number). Renders nothing for guests or when zero. */
export default function NotificationBadge({ className = "" }: { className?: string }) {
  const t = useT();
  const count = useSyncExternalStore(unread.subscribe, unread.get, () => 0);
  if (!count) return null;
  return (
    <span className={`inline-flex min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-bold leading-5 text-on-brand ${className}`} aria-label={t("feed.unreadNotifications", { n: count })}>
      {count > 99 ? "99+" : count}
    </span>
  );
}
