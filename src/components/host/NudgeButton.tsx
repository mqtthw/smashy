"use client";

// Host: "Nudge" both players of a waiting set (a notification and push: "Your set is waiting").
import { useState, useTransition } from "react";
import { nudgeSet } from "@/app/host/actions";
import Icon from "@/components/ui/Icon";
import { useT } from "@/lib/i18n/client";

export default function NudgeButton({ setId }: { setId: string }) {
  const t = useT();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <span className="flex shrink-0 flex-col items-end">
      <button
        type="button"
        className="btn btn-sm btn-ghost px-2 text-meta"
        disabled={pending || sent}
        aria-label={sent ? t("hostrun.nudge.sentLabel") : t("hostrun.nudge.label")}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await nudgeSet(setId);
            if (res.error) setError(res.error);
            else setSent(true);
          })
        }
      >
        {sent ? (
          <>
            <Icon name="check" /> {t("hostrun.nudge.sent")}
          </>
        ) : (
          <>
            <Icon name="bell" /> {t("hostrun.nudge.nudge")}
          </>
        )}
      </button>
      {error && (
        <span role="status" className="max-w-40 text-right text-meta text-danger">
          {error}
        </span>
      )}
    </span>
  );
}
