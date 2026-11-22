"use client";

import { useEffect, useRef } from "react";

/**
 * For pop-up menus: closes on Escape (and puts keyboard focus back on the button that opened it)
 * or on a click outside. Put the returned ref on the element that wraps the button and the menu.
 */
export function useDismiss<T extends HTMLElement = HTMLDivElement>(open: boolean, close: () => void) {
  const ref = useRef<T>(null);
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      closeRef.current();
      // Back to the button that opened it (it has aria-expanded), so keyboard users aren't lost.
      const toggle = ref.current?.querySelector<HTMLElement>("[aria-expanded]") ?? ref.current?.querySelector<HTMLElement>("button, a[href]");
      toggle?.focus();
    };
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return ref;
}
