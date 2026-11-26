"use client";

import { useSyncExternalStore } from "react";

const KEY = "smashy.teaser.dismissed";
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const read = () => {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

/**
 * Wraps the Feed's "You're up" bar with a close button (round 916, Matthew: it "should be dismissable").
 * Closing it hides the bar for that one set (`id`) in this browser; the next set, or the next call, has
 * another id and shows again. `glow` adds the pulsing gold halo for "you're up".
 */
export default function DismissableTeaser({ id, label, glow, children }: { id: string; label: string; glow?: boolean; children: React.ReactNode }) {
  const dismissed = useSyncExternalStore(subscribe, read, () => null);
  if (dismissed === id) return null;
  return (
    <div className={`relative mx-4 mt-3 ${glow ? "teaser-glow" : ""}`}>
      {children}
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={() => {
          try {
            window.localStorage.setItem(KEY, id);
          } catch {}
          listeners.forEach((fn) => fn());
        }}
        // On the gold "you're up" bar the × is dark, like the bar's text.
        className={`absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-lg leading-none opacity-70 hover:bg-black/15 hover:opacity-100 ${glow ? "text-[#1a1200]" : ""}`}
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}
