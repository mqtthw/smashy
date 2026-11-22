"use client";

import { useSyncExternalStore } from "react";

/**
 * Current time in ms, updated every `stepMs`. Uses the server's time during the first render
 * so the page doesn't flicker or mismatch while loading.
 */
export function useNow(serverNow: number, stepMs = 30000) {
  return useSyncExternalStore(
    (onChange) => {
      const id = setInterval(onChange, stepMs);
      return () => clearInterval(id);
    },
    () => Math.floor(Date.now() / stepMs) * stepMs,
    () => serverNow,
  );
}
