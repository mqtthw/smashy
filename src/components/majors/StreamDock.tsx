"use client";

// The one live-stream player (round 718, see lib/streamDock.ts). It sits in the layout, outside the
// pages, so moving between pages never recreates it. On the tournament's page it's laid exactly over
// the page's slot (and scrolls with it); anywhere else it floats above the tab bar with a link back and
// a close button. Only its position changes: moving an iframe in the page would reload it.
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { closeStream, getStreamDock, getStreamDockOnServer, subscribeStreamDock } from "@/lib/streamDock";
import { useT } from "@/lib/i18n/client";

type Box = { top: number; left: number; width: number; height: number };

/** Where the slot is on the page (not the screen), so the player scrolls with it. */
function useSlotBox(slot: HTMLElement | null): Box | null {
  const [box, setBox] = useState<Box | null>(null);
  useEffect(() => {
    if (!slot) return;
    const measure = () => {
      const r = slot.getBoundingClientRect();
      if (!r.width || !r.height) return; // hidden for a moment: keep the last place
      const next = { top: Math.round(r.top + window.scrollY), left: Math.round(r.left + window.scrollX), width: Math.round(r.width), height: Math.round(r.height) };
      setBox((cur) => (cur && cur.top === next.top && cur.left === next.left && cur.width === next.width && cur.height === next.height ? cur : next));
    };
    measure();
    // The slot moves when things above it load or the window changes; the timer catches the rest.
    const ro = new ResizeObserver(measure);
    ro.observe(slot);
    ro.observe(document.body);
    window.addEventListener("resize", measure);
    const timer = setInterval(measure, 1000);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      clearInterval(timer);
    };
  }, [slot]);
  return slot ? box : null;
}

export default function StreamDock() {
  const t = useT();
  const { stream, slot } = useSyncExternalStore(subscribeStreamDock, getStreamDock, getStreamDockOnServer);
  const box = useSlotBox(slot);
  if (!stream) return null;
  const floating = !slot;
  // In its slot but not measured yet: keep it off screen for that instant instead of flashing in a corner.
  const style: React.CSSProperties = floating ? {} : box ? { position: "absolute", ...box } : { position: "absolute", top: -9999, left: 0, width: 320, height: 180 };
  return (
    <div
      style={style}
      className={
        floating
          ? "fixed bottom-[calc(var(--dock-h,4.5rem)+env(safe-area-inset-bottom,0px)+1.25rem)] right-3 z-40 flex w-[min(64vw,20rem)] flex-col overflow-hidden rounded-xl bg-neutral-950 shadow-2xl ring-1 ring-white/15 print:hidden md:bottom-4 md:right-4 md:w-80"
          : "z-[1] overflow-hidden rounded-xl bg-surface print:hidden"
      }
    >
      {floating && (
        <div className="flex items-center gap-1 px-2 py-1 text-xs text-white">
          <Link href={`${stream.eventPath}#watch`} className="min-w-0 flex-1 truncate font-semibold hover:underline">
            {stream.eventName}
          </Link>
          <button type="button" onClick={closeStream} aria-label={t("browse.stream.close")} title={t("browse.stream.close")} className="shrink-0 rounded-full p-1 text-white/80 hover:bg-white/15">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current" strokeWidth={2.5}><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      )}
      <div className={floating ? "aspect-video w-full" : "h-full w-full"}>
        <iframe
          // One iframe per channel: the key keeps it alive while it moves between its slot and the corner.
          key={stream.channel}
          src={`https://player.twitch.tv/?channel=${encodeURIComponent(stream.channel)}&parent=${window.location.hostname}&muted=true`}
          title={t("browse.stream.liveOnTwitch", { name: stream.channel })}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
          className="h-full w-full"
        />
      </div>
    </div>
  );
}
