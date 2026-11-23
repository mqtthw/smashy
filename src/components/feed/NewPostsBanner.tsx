"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { urlGame } from "./FeedPanes";
import { useEffect, useState } from "react";
import { loadBrowserClient } from "@/lib/supabase/lazy";
import { useT } from "@/lib/i18n/client";

/**
 * "3 new posts" at the top of the feed: checks every minute (while the tab is open) for posts made
 * since the page loaded. Tapping it reloads the feed and scrolls to the top.
 */
export default function NewPostsBanner({ since, game, following = false, viewerId = null }: { since: string; game?: string; following?: boolean; viewerId?: string | null }) {
  const router = useRouter();
  const t = useT();
  const [count, setCount] = useState(0);
  const [from, setFrom] = useState(since);
  // Game tabs switch without a server trip (round 559): read the tab from the address (round 630).
  const tab = urlGame(useSearchParams());
  const shown = tab ? (tab === "all" ? undefined : tab) : game;

  useEffect(() => {
    let alive = true;
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      // Guests (round 748): a small shared answer instead of downloading the database library to count
      // rows; it lists when the newest public posts were made (up to 20).
      if (!viewerId && !following) {
        const res = await fetch(`/api/feed/latest${shown ? `?game=${encodeURIComponent(shown)}` : ""}`).catch(() => null);
        if (!res?.ok || !alive) return;
        const { at } = (await res.json().catch(() => ({ at: [] }))) as { at?: string[] };
        if (alive) setCount((at ?? []).filter((time) => Date.parse(time) > Date.parse(from)).length);
        return;
      }
      // Members: the first check is a minute after the page loads; the library downloads then.
      const supabase = await loadBrowserClient().catch(() => null);
      if (!supabase || !alive) return;
      // Count only what this feed would show: new top-level posts (not clip/set/ruleset talk), in this
      // game tab and view, not your own.
      let q = supabase
        .from(following ? "following_feed_items" : "feed_items")
        .select("post_id", { count: "exact", head: true })
        .eq("kind", "post")
        .is("ruleset_id", null)
        .is("set_ref_id", null)
        .is("reel_clip_id", null)
        .gt("at", from);
      if (shown) q = q.eq("game", shown);
      if (viewerId) q = q.neq("actor_id", viewerId);
      const { count: n } = await q;
      if (alive) setCount(n ?? 0);
    };
    const t = setInterval(check, 60_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      alive = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", check);
    };
  }, [from, shown, following, viewerId]);

  if (!count) return null;
  return (
    <div className="sticky top-12 z-10 flex justify-center py-1">
      <button
        type="button"
        onClick={() => {
          setCount(0);
          setFrom(new Date().toISOString());
          window.scrollTo({ top: 0, behavior: "smooth" });
          router.refresh();
        }}
        className="btn btn-sm btn-primary shadow"
      >
        {t("feed.newPosts", { n: count })}
      </button>
    </div>
  );
}
