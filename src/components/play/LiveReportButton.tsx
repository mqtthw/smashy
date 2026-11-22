"use client";

import { useState, useTransition } from "react";
import { useT } from "@/lib/i18n/client";
import { useDismiss } from "@/lib/useDismiss";
import { reportLive } from "@/app/play/actions";

const REASONS = [
  { value: "spam", label: "report.spam" },
  { value: "harassment", label: "report.harassment" },
  { value: "inappropriate", label: "report.inappropriate" },
  { value: "off_topic", label: "report.offTopic" },
  { value: "other", label: "report.other" },
] as const;

/**
 * Small "Report" control for chat messages, lobbies, clips and more. `above`: open the reasons upward
 * and to the right (for a button low on the screen at the left of a menu, like the ⋯ menu on a Reels clip).
 */
export default function LiveReportButton({
  kind,
  targetId,
  className = "text-xs text-muted hover:text-brand",
  above = false,
}: {
  kind: "chat" | "lobby" | "highlight" | "reel" | "message" | "profile" | "event";
  targetId: string;
  className?: string;
  above?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const box = useDismiss<HTMLSpanElement>(open, () => setOpen(false));
  const [pending, startTransition] = useTransition();
  const t = useT();

  if (done) return <span className="text-xs text-muted">{done}</span>;
  return (
    <span ref={box} className="relative">
      <button type="button" onClick={() => setOpen(!open)} className={className} aria-expanded={open}>
        {t("report.button")}
      </button>
      {open && (
        // Its own text colour: inside a dark menu (Reels) it used to inherit white text on the page's white background.
        <span className={`absolute z-20 flex flex-col gap-1 rounded-xl border border-line bg-background p-2 text-xs text-foreground shadow-lg ${above ? "bottom-full left-0 mb-1 w-52" : "right-0 mt-1 w-56"}`}>
          {REASONS.map((r) => (
            <label key={r.value} className="flex items-center gap-2">
              <input type="radio" name={`r-${targetId}`} checked={reason === r.value} onChange={() => setReason(r.value)} />
              {t(r.label)}
            </label>
          ))}
          <span className="mt-1 flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="text-muted">{t("common.cancel")}</button>
            <button
              type="button"
              disabled={!reason || pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await reportLive(kind, targetId, reason, "");
                  setDone(res.ok ? t("report.done") : res.error ?? t("report.failed"));
                })
              }
              className="btn btn-sm btn-inverse"
            >
              {t("report.button")}
            </button>
          </span>
        </span>
      )}
    </span>
  );
}
