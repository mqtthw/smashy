"use client";

import { useState, useTransition } from "react";
import { fixSet, reportSet, undoSet } from "@/app/host/actions";
import { useT } from "@/lib/i18n/client";

/** Every possible result for the set's best-of, for each player, plus a DQ. */
function ScoreButtons({
  names,
  bestOf,
  pending,
  onPick,
}: {
  names: [string, string];
  bestOf: number;
  pending: boolean;
  onPick: (winner: 1 | 2, score: [number, number], dq: boolean) => void;
}) {
  const t = useT();
  const need = Math.floor(bestOf / 2) + 1;
  return (
    <>
      {([1, 2] as const).map((w) => (
        <div key={w} className="flex flex-col gap-1.5">
          <p className="text-sm font-semibold">{t("setroom.theyWon", { name: names[w - 1] })}</p>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: need }, (_, lose) => (
              <button
                key={lose}
                type="button"
                disabled={pending}
                onClick={() => onPick(w, w === 1 ? [need, lose] : [lose, need], false)}
                className="btn btn-md btn-outline font-mono"
                aria-label={t("hostbracket.report.scoreAria", { name: names[w - 1], w: need, l: lose })}
              >
                {need}–{lose}
              </button>
            ))}
            <button type="button" disabled={pending} onClick={() => onPick(w, w === 1 ? [0, -1] : [-1, 0], true)} className="btn btn-md btn-ghost text-danger">
              {t("hostbracket.report.dq", { name: names[2 - w] })}
            </button>
          </div>
        </div>
      ))}
    </>
  );
}

/**
 * The host's result buttons for one set: every possible score in one tap (2–0, 2–1… for the set's
 * best-of), a DQ for either player. Once it has a result: Undo while no later set has been played,
 * and "Fix the result" any time (a different winner clears the later sets that depended on it).
 */
export default function ReportSet({
  setId,
  names,
  bestOf,
  done,
  canUndo,
  winner = null,
  later = [],
}: {
  setId: string;
  names: [string, string];
  bestOf: number;
  done: boolean;
  canUndo: boolean;
  winner?: 1 | 2 | null;
  later?: string[]; // later played sets that depend on this one ("Winners Semi-Final: A vs B")
}) {
  const t = useT();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (res.error) setError(res.error);
    });
  const dqText = (w: 1 | 2) => t("hostbracket.report.dqConfirm", { loser: names[2 - w], winner: names[w - 1] });

  if (done) {
    const fix = (w: 1 | 2, score: [number, number], dq: boolean) => {
      const moves = w !== winner || dq;
      const msg =
        moves && later.length
          ? t("hostbracket.report.movesConfirm", { n: later.length, list: later.join("\n") })
          : dq
            ? dqText(w)
            : t("hostbracket.report.changeScore");
      if (window.confirm(msg)) run(() => fixSet(setId, w, score));
    };
    return (
      <div className="flex flex-col gap-3">
        {canUndo && (
          <button type="button" disabled={pending} onClick={() => window.confirm(t("hostbracket.report.undoConfirm")) && run(() => undoSet(setId))} className="btn btn-md btn-outline self-start">
            {t("hostbracket.report.undo")}
          </button>
        )}
        <details className="flex flex-col gap-3">
          <summary className="cursor-pointer text-sm font-semibold">{t("hostbracket.report.fix")}</summary>
          <p className="mt-1 text-meta text-muted">
            {later.length ? t("hostbracket.report.fixHint", { n: later.length }) : t("hostbracket.report.pickScore")}
          </p>
          <div className="mt-2 flex flex-col gap-3">
            <ScoreButtons names={names} bestOf={bestOf} pending={pending} onPick={fix} />
          </div>
        </details>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ScoreButtons
        names={names}
        bestOf={bestOf}
        pending={pending}
        onPick={(w, score, dq) => (!dq || window.confirm(dqText(w))) && run(() => reportSet(setId, w, score))}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
