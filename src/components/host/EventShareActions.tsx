"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { runHostedAgain, shareHostedResult } from "@/app/host/actions";
import Icon from "@/components/ui/Icon";
import { useT } from "@/lib/i18n/client";

/** On a finished event: share the results (host) or your placement (player); hosts can run it again. */
export default function EventShareActions({ eventId, canShare, shareLabel, canRunAgain }: { eventId: string; canShare: boolean; shareLabel: string; canRunAgain: boolean }) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (!canShare && !canRunAgain) return null;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        {canShare && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await shareHostedResult(eventId);
                if (res.error) setError(res.error);
                else if (res.postId) router.push(`/post/${res.postId}`);
              })
            }
            className="btn btn-md btn-outline"
          >
            <Icon name="megaphone" /> {shareLabel}
          </button>
        )}
        {canRunAgain && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await runHostedAgain(eventId);
                if (res.error) setError(res.error);
                else if (res.id) router.push(`/host/${res.id}/edit`);
              })
            }
            className="btn btn-md btn-outline"
          >
            <Icon name="repeat" /> {t("hostrun.share.runAgain")}
          </button>
        )}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
