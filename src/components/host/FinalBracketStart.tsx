"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { startFinal } from "@/app/host/actions";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/base";

// The format names the host page passes in (FORMAT_LABEL, in English), in the visitor's language.
const FORMAT_KEYS: Record<string, MessageKey> = { "Single elimination": "format.single_elim", "Double elimination": "format.double_elim" };

/**
 * Host, in an event where pools or Swiss rounds are followed by a final bracket: what the final is,
 * and the button that builds it from the top players once the first part is finished.
 */
export default function FinalBracketStart({ eventId, size, format, ready, first }: { eventId: string; size: number; format: string; ready: boolean; first: "pools" | "Swiss rounds" }) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3">
      <p className="text-sm">
        <b>{t("hostbracket.final.title", { n: size, format: (FORMAT_KEYS[format] ? t(FORMAT_KEYS[format]) : format).toLowerCase() })}</b>{" "}
        {ready
          ? t(first === "pools" ? "hostbracket.final.readyPools" : "hostbracket.final.readySwiss", { n: size })
          : t(first === "pools" ? "hostbracket.final.waitPools" : "hostbracket.final.waitSwiss")}
      </p>
      <button
        type="button"
        disabled={pending || !ready}
        onClick={() =>
          window.confirm(t("hostbracket.final.confirm", { n: size })) &&
          start(async () => {
            const res = await startFinal(eventId);
            setError(res.error ?? null);
            if (!res.error) router.push(`/host/${eventId}/bracket`);
          })
        }
        className="btn btn-md btn-primary self-start"
      >
        {pending ? t("hostbracket.final.building") : t("hostbracket.final.start")}
      </button>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
