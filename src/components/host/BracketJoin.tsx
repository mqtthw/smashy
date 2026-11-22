"use client";

import { useState, useTransition } from "react";
import { joinHostedEvent } from "@/app/host/actions";
import { useT } from "@/lib/i18n/client";

/** Sign up for another bracket of the event you're looking at, without leaving the page. */
export default function BracketJoin({ eventId, label, full }: { eventId: string; label: string; full: boolean }) {
  const t = useT();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending || full}
        aria-label={full ? t("event.brackets.isFull", { label }) : t("event.brackets.signUpFor", { label })}
        onClick={() =>
          start(async () => {
            const res = await joinHostedEvent(eventId);
            setError(res.error ?? null);
          })
        }
        className="btn btn-sm btn-primary"
      >
        {full ? t("event.brackets.full") : pending ? t("event.brackets.signingUp") : t("event.brackets.signUp")}
      </button>
      {error && <span role="alert" className="max-w-40 text-right text-meta text-danger">{error}</span>}
    </span>
  );
}
