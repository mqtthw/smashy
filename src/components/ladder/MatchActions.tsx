"use client";
// A ladder match's buttons: report the score from your side, answer your opponent's report, or call
// the match off. While it waits on the other player, the page checks again every 15 seconds.
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { answerScore, cancelMatch, reportScore } from "@/app/ladder/actions";
import type { ActionResult } from "@/lib/actionErrors";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/base";

type Props = { matchId: string; status: "playing" | "reported" | "disputed"; reportedByMe: boolean; oppTag: string; myScore: number | null; oppScore: number | null };

const OUTCOMES: { label: MessageKey; mine: number; theirs: number }[] = [
  { label: "play.match.won20", mine: 2, theirs: 0 },
  { label: "play.match.won21", mine: 2, theirs: 1 },
  { label: "play.match.lost12", mine: 1, theirs: 2 },
  { label: "play.match.lost02", mine: 0, theirs: 2 },
];

export default function MatchActions({ matchId, status, reportedByMe, oppTag, myScore, oppScore }: Props) {
  const router = useRouter();
  const t = useT();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      setError(null);
      try {
        const res = await fn();
        if (res.error) setError(res.error);
      } catch {
        setError(t("common.offline"));
      }
    });

  const waitingOnThem = status === "playing" || (status === "reported" && reportedByMe);
  useEffect(() => {
    if (!waitingOnThem) return;
    const timer = setInterval(() => router.refresh(), 15_000);
    return () => clearInterval(timer);
  }, [waitingOnThem, router]);

  const answering = status === "reported" && !reportedByMe;
  return (
    <div className="flex flex-col gap-3">
      {answering && (
        <div className="flex flex-col gap-2">
          <p className="font-semibold">
            {t((myScore ?? 0) > (oppScore ?? 0) ? "play.match.theyReportedYouWon" : "play.match.theyReportedTheyWon", { name: oppTag, mine: myScore ?? 0, theirs: oppScore ?? 0 })}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pending} className="btn btn-md btn-primary" onClick={() => run(() => answerScore(matchId, true))}>
              {t("play.match.yesRight")}
            </button>
            <button type="button" disabled={pending} className="btn btn-md btn-outline" onClick={() => run(() => answerScore(matchId, false))}>
              {t("play.match.noWrong")}
            </button>
          </div>
          <p className="text-meta text-muted">{t("play.match.answerNote")}</p>
        </div>
      )}
      {status === "reported" && reportedByMe && (
        <p className="text-muted">
          {t("play.match.youReported", { mine: myScore ?? 0, theirs: oppScore ?? 0, name: oppTag })}
        </p>
      )}
      {(status === "playing" || status === "disputed") && (
        <div className="flex flex-col gap-2">
          <p className="font-semibold">{status === "disputed" ? t("play.match.disputed") : t("play.match.report")}</p>
          <div className="grid grid-cols-2 gap-2">
            {OUTCOMES.map((o) => (
              <button
                key={o.label}
                type="button"
                disabled={pending}
                className={`btn btn-md ${o.mine > o.theirs ? "btn-primary" : "btn-outline"}`}
                onClick={() => run(() => reportScore(matchId, o.mine, o.theirs))}
              >
                {t(o.label)}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={pending}
            className="btn btn-sm btn-ghost self-start"
            onClick={() => window.confirm(t("play.match.callOffConfirm", { name: oppTag })) && run(() => cancelMatch(matchId))}
          >
            {t("play.match.callOff")}
          </button>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
