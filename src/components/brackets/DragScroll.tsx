"use client";

import { forwardRef, useRef, type ReactNode } from "react";

/**
 * A scroll area you can grab with the mouse and drag around (like a map).
 * Touch screens already swipe-scroll, so this only handles the mouse.
 * A real drag doesn't count as a click, so letting go over a set doesn't open it.
 */
const DragScroll = forwardRef<HTMLDivElement, { className?: string; children: ReactNode; label: string }>(function DragScroll(
  { className = "", children, label },
  ref,
) {
  const drag = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const local = useRef<HTMLDivElement | null>(null);

  return (
    <div
      ref={(el) => {
        local.current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      }}
      role="region"
      aria-label={label}
      tabIndex={0} // arrow keys scroll it too
      className={`cursor-grab select-none overflow-auto overscroll-contain active:cursor-grabbing ${className}`}
      onPointerDown={(e) => {
        if (e.pointerType !== "mouse" || e.button !== 0) return;
        const el = local.current!;
        drag.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop, moved: false };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        if (!d.moved && Math.hypot(dx, dy) < 5) return; // small wiggles still count as clicks
        if (!d.moved) {
          d.moved = true;
          local.current!.setPointerCapture(e.pointerId);
        }
        local.current!.scrollLeft = d.left - dx;
        local.current!.scrollTop = d.top - dy;
      }}
      onPointerUp={(e) => {
        const el = local.current!;
        if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
        // Keep `moved` until the click event fires, then clear it.
        setTimeout(() => (drag.current = null), 0);
      }}
      onPointerCancel={() => (drag.current = null)}
      onClickCapture={(e) => {
        if (drag.current?.moved) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onDragStart={(e) => e.preventDefault()} // stop the browser dragging links/images
    >
      {children}
    </div>
  );
});

export default DragScroll;
