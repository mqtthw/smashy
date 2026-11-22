"use client";
// A post's like, repost and save, shared by every copy of that post on the screen (round 638). The
// Feed keeps each game tab loaded but hidden (round 559), so the same post can be on screen several
// times; liking it in "All" used to leave it unliked in "Ultimate" until a reload.
//
// Each change is remembered with what the page said when it was made. While the page still says that,
// every copy shows the change; once the page sends something new (a reload), the page's numbers win.
import { useCallback, useSyncExternalStore } from "react";

type Entry = { base: string; value: unknown };
const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

/** Like useState for one post's toggle (`key`, e.g. "like:<post id>"), shared by every copy of the post. */
export function useSharedPostState<T>(key: string, fromPage: T): [T, (next: T) => void] {
  const base = JSON.stringify(fromPage);
  const entry = useSyncExternalStore(subscribe, () => entries.get(key), () => undefined);
  const value = entry && entry.base === base ? (entry.value as T) : fromPage;
  const set = useCallback(
    (next: T) => {
      entries.set(key, { base, value: next });
      listeners.forEach((fn) => fn());
    },
    [key, base],
  );
  return [value, set];
}

/** For tests: forget every change. */
export function resetSharedPostState() {
  entries.clear();
  listeners.forEach((fn) => fn());
}
