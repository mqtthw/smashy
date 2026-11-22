"use client";

import { useSyncExternalStore } from "react";
import { sharedLive } from "@/lib/sharedLive";
import { loadBrowserClient, maybeSignedIn } from "@/lib/supabase/lazy";
import { subscribeAsUser } from "@/lib/supabase/realtime";
import { useT } from "@/lib/i18n/client";

// One count for the whole screen (the badge can show in more than one place): a single query and a
// single live connection, shared. A guest does nothing here (and so never downloads the Supabase
// library just for this badge).
const unread = sharedLive(0, (set) => {
  if (!maybeSignedIn()) return () => {};
  let alive = true;
  const load = async () => {
    try {
      const supabase = await loadBrowserClient();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return alive && set(0);
      const { data } = await supabase.rpc("unread_conversations");
      if (alive) set(typeof data === "number" ? data : 0);
    } catch {
      // offline, or the library failed to download: keep the count we have
    }
  };
  void load();
  // Busy groups can send many messages a minute: recount at most once a second.
  let timer: ReturnType<typeof setTimeout> | null = null;
  const soon = () => {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      void load();
    }, 1000);
  };
  window.addEventListener("smashy:messages-read", soon);
  // Only messages in your own chats are ever sent to you.
  const stop = subscribeAsUser(
    (client) => client.channel(`my-messages-${Math.random().toString(36).slice(2)}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, soon),
    { signedInOnly: true },
  );
  return () => {
    if (timer) clearTimeout(timer);
    alive = false;
    window.removeEventListener("smashy:messages-read", soon);
    stop();
  };
});

/** Live count of chats with unread messages (and waiting requests). Nothing for guests or at zero. */
export default function MessageBadge({ className = "" }: { className?: string }) {
  const count = useSyncExternalStore(unread.subscribe, unread.get, () => 0);
  const t = useT();
  if (!count) return null;
  return (
    <span className={`inline-flex min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-bold leading-5 text-on-brand ${className}`} aria-label={t("play.msg.unreadChats", { n: count })}>
      {count > 99 ? "99+" : count}
    </span>
  );
}
