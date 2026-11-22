"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * A section whose heading folds it shut. A plain <details>, so it works before JavaScript loads and
 * screen readers announce it as expandable. With `id`, the browser remembers a folded section for next
 * time (this device only; private windows may forget). `aside` (a "see all" link, say) sits at the right
 * of the heading row.
 */
export default function Fold({ id, heading, aside, children, className = "" }: { id?: string; heading: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const key = id ? `fold:${id}` : null;

  useEffect(() => {
    if (!key || !ref.current) return;
    try {
      if (localStorage.getItem(key) === "closed") ref.current.open = false;
    } catch {
      // storage blocked: every section just starts open
    }
  }, [key]);

  function remember() {
    if (!key || !ref.current) return;
    try {
      if (ref.current.open) localStorage.removeItem(key);
      else localStorage.setItem(key, "closed");
    } catch {
      // storage blocked: nothing to remember
    }
  }

  return (
    <details ref={ref} open onToggle={remember} className={`group ${className}`}>
      <summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">{heading}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0 -rotate-90 fill-none stroke-current text-muted transition group-open:rotate-0" strokeWidth={2.5}><path d="M6 9l6 6 6-6" /></svg>
        {aside && <span className="ml-auto shrink-0">{aside}</span>}
      </summary>
      <div className="mt-2 flex flex-col gap-2">{children}</div>
    </details>
  );
}
