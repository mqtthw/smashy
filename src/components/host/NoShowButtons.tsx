"use client";

import { useState, useTransition } from "react";
import { reportSet } from "@/app/host/actions";
import { imHere } from "@/app/host/live-actions";
import { useT } from "@/lib/i18n/client";

/** A player at their setup says so, which stops the no-show clock for their side. */
export function HereButton({ setId }: { setId: string }) {
  const t = useT();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await imHere(setId);
            setError(res.error ?? null);
          })
        }
        className="btn btn-md btn-primary self-start"
      >
        {pending ? t("common.saving") : t("entering.imHere")}
      </button>
      {error && <span role="alert" className="text-sm text-danger">{error}</span>}
    </span>
  );
}

/** TO: the no-show clock ran out. One tap disqualifies the side that never turned up (after a confirm). */
export function NoShowDq({ setId, slot, name, other }: { setId: string; slot: 1 | 2; name: string; other: string }) {
  const t = useT();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          window.confirm(t("hostrun.noshow.confirm", { name, other })) &&
          start(async () => {
            // The other side wins; -1 marks the disqualification.
            const res = await reportSet(setId, slot === 1 ? 2 : 1, slot === 1 ? [-1, 0] : [0, -1]);
            setError(res.error ?? null);
          })
        }
        className="btn btn-sm btn-ghost px-2 text-danger"
      >
        {pending ? t("common.saving") : t("hostrun.noshow.dq", { name })}
      </button>
      {error && <span role="alert" className="text-meta text-danger">{error}</span>}
    </span>
  );
}
