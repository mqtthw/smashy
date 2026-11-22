"use client";

import { useState, useSyncExternalStore } from "react";
import { useT } from "@/lib/i18n/client";

// Spoiler mode is an attribute on <html> (set before the page paints; see app/layout.tsx and the
// Spoiler mode switch on Profile). Components follow it so hidden results are hidden for everyone,
// including keyboard and screen-reader users, not just blurred.
function subscribeMode(cb: () => void) {
  window.addEventListener("smashy:spoiler-toggle", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("smashy:spoiler-toggle", cb);
    window.removeEventListener("storage", cb);
  };
}
const modeOn = () => document.documentElement.hasAttribute("data-spoiler-mode");

/**
 * Hides its contents behind a blur until tapped.
 * - A post the author marked as a spoiler: always hidden at first.
 * - `results` (placements, set scores): hidden only when the reader turned on Spoiler mode. The CSS
 *   in globals.css checks <html data-spoiler-mode>, so results never flash on screen.
 * While hidden, the contents are `inert`: no tabbing into links or buttons, and screen readers skip them.
 */
export default function Spoiler({ children, results = false, label }: { children: React.ReactNode; results?: boolean; label?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const mode = useSyncExternalStore(subscribeMode, modeOn, () => false);
  const hidden = !open && (!results || mode);
  return (
    <div className="spoiler" data-results={results ? "" : undefined} data-open={open ? "" : undefined}>
      <div className="spoiler-content" inert={hidden}>
        {children}
      </div>
      {!open && (
        <button
          type="button"
          className="spoiler-cover"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
        >
          <span className="rounded-full bg-background/90 px-3 py-1 text-sm font-semibold text-foreground shadow">{t("ui.spoilerTap", { label: label ?? t("ui.spoiler") })}</span>
        </button>
      )}
    </div>
  );
}

/** ||Text like this|| inside a post: blacked out until tapped (emoji and links included). */
export function InlineSpoiler({ children }: { children: React.ReactNode }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  if (open) return <span className="spoiler-inline" data-open="">{children}</span>;
  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={t("ui.spoilerInline")}
      className="spoiler-inline"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOpen(true);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setOpen(true);
        }
      }}
    >
      {/* Takes up the text's space but draws nothing (hides colour emoji too) and can't be tabbed into. */}
      <span className="spoiler-inline-text" aria-hidden="true" inert>
        {children}
      </span>
    </span>
  );
}
