"use client";

import { useCallback, useSyncExternalStore } from "react";

// A guest preference saved only in this browser (localStorage). Never sent to our server.
// Falls back to `initial` when storage is unavailable (private mode, blocked cookies).

const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function useStoredState(key: string, initial: string): [string, (value: string) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key) ?? initial,
    () => initial, // server render: no browser storage
  );

  const setValue = useCallback(
    (next: string) => {
      try {
        window.localStorage.setItem(key, next);
      } catch {
        // storage blocked; preference just won't persist
      }
      listeners.forEach((listener) => listener());
    },
    [key],
  );

  return [value, setValue];
}
