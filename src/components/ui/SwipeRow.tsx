"use client";

import { useEffect, useRef } from "react";

/**
 * One row of chips you swipe sideways instead of a wall of wrapped pills (round 498). The page's
 * side padding stays: the row bleeds to the screen edges and pads itself. The chip marked
 * aria-current="page" (the year you picked) is scrolled into view when the row appears. On bigger
 * screens the chips wrap instead: a mouse wheel can't scroll sideways, so later chips were out of reach.
 */
export default function SwipeRow({ label, labelledBy, className = "", children }: { label?: string; labelledBy?: string; className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const row = ref.current;
    const current = row?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!row || !current) return;
    // Center it in the row without moving the page up or down.
    row.scrollLeft = current.offsetLeft - row.clientWidth / 2 + current.clientWidth / 2;
  }, []);
  return (
    <nav ref={ref} aria-label={label} aria-labelledby={labelledBy} className={`relative -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>*]:shrink-0 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 ${className}`}>
      {children}
    </nav>
  );
}
