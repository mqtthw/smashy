"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { repairSwissRound, startSwissRound } from "@/app/host/actions";
import { useT } from "@/lib/i18n/client";

/**
 * Host, during a Swiss event: where the round stands, the button that pairs and starts the next
 * round once every set has a result, and a way to pair the current round again while nobody has
 * played it (after fixing a result from the round before, or when someone left).
 */
export default function SwissRound({ eventId, round, rounds, open, canRepair }: { eventId: string; round: number; rounds: number; open: number; canRepair: boolean }) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const last = round >= rounds;
  const run = (action: typeof startSwissRound) =>
    start(async () => {
      const res = await action(eventId);
      setError(res.error ?? null);
      if (!res.error) router.refresh();
    });

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3">
      <p className="text-sm">
        <b>{t("hostbracket.swiss.roundOf", { round, rounds })}</b>{" "}
        {open > 0
          ? t("hostbracket.swiss.open", { n: open })
          : last
            ? t("hostbracket.swiss.allIn")
            : t("hostbracket.swiss.allInNext", { n: round + 1 })}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {!last && (
          <button type="button" disabled={pending || open > 0} onClick={() => run(startSwissRound)} className="btn btn-md btn-primary">
            {pending ? t("hostbracket.swiss.pairing") : t("hostbracket.swiss.start", { n: round + 1 })}
          </button>
        )}
        {canRepair && (
          <button
            type="button"
            disabled={pending}
            onClick={() => window.confirm(t("hostbracket.swiss.repairConfirm", { n: round })) && run(repairSwissRound)}
            className="btn btn-sm btn-ghost"
          >
            {t("hostbracket.swiss.repair", { n: round })}
          </button>
        )}
      </div>
      {!last && open > 0 && <p className="text-meta text-muted">{t("hostbracket.swiss.hint")}</p>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
