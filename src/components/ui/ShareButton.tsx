"use client";

import { useT } from "@/lib/i18n/client";
import { showToast } from "./Toaster";

/** Share a Smashy page: the phone's share sheet when there is one, otherwise copy the link. */
export default function ShareButton({ path, title, className = "", label: labelProp, showLabel = false }: { path: string; title: string; className?: string; label?: string; showLabel?: boolean }) {
  const t = useT();
  const label = labelProp ?? t("ui.share");
  const share = async () => {
    const url = new URL(path, window.location.origin).toString();
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      showToast(t("ui.linkCopied"));
    } catch (e) {
      if ((e as Error).name !== "AbortError") showToast(t("ui.shareFailed"));
    }
  };
  return (
    <button type="button" onClick={share} aria-label={label} title={label} className={className || "-m-2.5 flex items-center gap-1 p-2.5 text-sm text-muted hover:text-foreground"}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current" strokeWidth={2}>
        <path d="M12 3v12M7 8l5-5 5 5M5 13v7h14v-7" />
      </svg>
      {/* The word too where the icon would stand alone on its own line (round 900, event pages). */}
      {showLabel && <span>{label}</span>}
    </button>
  );
}
