"use client";

// Quick result reporting on a Smashy-run bracket. Players send the set's final score; the TO confirms
// or denies it (TOFinalReview below). Saves the TO typing in every result at a local.
import { Fragment, useState, useTransition, type ReactNode } from "react";
import TitlePrefix from "./TitlePrefix";
import { useT } from "@/lib/i18n/client";
import Icon from "@/components/ui/Icon";
import { confirmAgreedResults, reportFinalScore, reviewFinalScore, withdrawFinalScore } from "@/app/host/live-actions";
import type { FinalReport, PlayerSlot } from "@/lib/liveSet";
import { winsNeeded } from "@/lib/striking";

type Names = [string, string];
const describe = (r: FinalReport, names: Names, t: ReturnType<typeof useT>) => t("setroom.final.won", { name: names[r.winner - 1], w: Math.max(...r.score), l: Math.min(...r.score) });

/** A phrase with one {placeholder} filled by a React node (a bold result): pass MARK as its value. */
const MARK = "\u0001";
function withNode(text: string, node: ReactNode) {
  return <>{text.split(/(\u0001)/).map((part, i) => (part === MARK ? <Fragment key={i}>{node}</Fragment> : part))}</>;
}

/** The scores a best-of-N can end on, winner first: Bo3 → 2–0, 2–1. */
function outcomes(bestOf: number): [number, number][] {
  const need = winsNeeded(bestOf);
  return Array.from({ length: need }, (_, l) => [need, l] as [number, number]);
}

export function PlayerFinalReport({ setId, me, names, bestOf, mine, theirs }: { setId: string; me: PlayerSlot; names: Names; bestOf: number; mine?: FinalReport; theirs?: FinalReport }) {
  const [won, setWon] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const t = useT();
  const opp = names[me === 1 ? 1 : 0];
  const said = (r: FinalReport) => t("setroom.final.won", { name: names[r.winner - 1], w: Math.max(...r.score), l: Math.min(...r.score) });
  const run = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      const res = await fn();
      setError(res.error ?? null);
      if (!res.error) setWon(null);
    });

  if (mine) {
    const differs = theirs && (theirs.winner !== mine.winner || theirs.score.join() !== mine.score.join());
    return (
      <section className="card flex flex-col gap-2 p-4" aria-labelledby="final-report">
        <h2 id="final-report" className="font-bold"><Icon name="clipboard" /> {t("setroom.final.reported")}</h2>
        <p className="text-sm">{withNode(t("setroom.final.youReported", { result: MARK }), <b>{said(mine)}</b>)}</p>
        {theirs && !differs && <p className="text-sm text-muted">{t("setroom.final.same", { name: opp })}</p>}
        {differs && <p className="text-sm text-danger">{t("setroom.final.differs", { name: opp, result: said(theirs) })}</p>}
        <button type="button" className="btn btn-sm btn-outline self-start" disabled={pending} onClick={() => run(() => withdrawFinalScore(setId))}>
          {t("setroom.final.takeBack")}
        </button>
        {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      </section>
    );
  }

  return (
    <details className="card p-4" open={!!theirs}>
      <summary className="cursor-pointer font-bold"><Icon name="clipboard" /> {t("setroom.final.summary")}</summary>
      <div className="mt-2 flex flex-col gap-3">
        {theirs && <p className="text-sm">{withNode(t("setroom.final.theyReported", { name: opp, result: MARK }), <b>{said(theirs)}</b>)}</p>}
        <p className="text-meta text-muted">{t("setroom.final.checked")}</p>
        <div className="flex gap-2" role="group" aria-label={t("setroom.final.didYouWin")}>
          <button type="button" className={`btn btn-sm ${won === true ? "btn-primary" : "btn-outline"}`} aria-pressed={won === true} onClick={() => setWon(true)}>{t("setroom.iWon")}</button>
          <button type="button" className={`btn btn-sm ${won === false ? "btn-primary" : "btn-outline"}`} aria-pressed={won === false} onClick={() => setWon(false)}>{t("setroom.theyWon", { name: opp })}</button>
        </div>
        {won !== null && (
          <div className="flex flex-wrap gap-2" role="group" aria-label={t("setroom.final.score")}>
            {outcomes(bestOf).map(([w, l]) => {
              const winner: PlayerSlot = won ? me : me === 1 ? 2 : 1;
              const score: [number, number] = winner === 1 ? [w, l] : [l, w];
              return (
                <button key={l} type="button" className="btn btn-sm btn-outline" disabled={pending} onClick={() => run(() => reportFinalScore(setId, winner, score))}>
                  {won ? t("setroom.final.iWon", { w, l }) : t("setroom.final.won", { name: opp, w, l })}
                </button>
              );
            })}
          </div>
        )}
        {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      </div>
    </details>
  );
}

/** "Confirm all 4 agreeing results" on the host dashboard. */
export function ConfirmAllAgreed({ eventId, count }: { eventId: string; count: number }) {
  const t = useT();
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="btn btn-sm btn-primary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await confirmAgreedResults(eventId);
            setNote(res.error ? { ok: false, text: res.error } : { ok: true, text: t("hostbracket.review.confirmed", { n: res.confirmed ?? 0 }) });
          })
        }
      >
        {pending ? t("hostbracket.review.confirming") : t("hostbracket.review.confirmAll", { n: count })}
      </button>
      {note && <span className={`text-sm ${note.ok ? "text-muted" : "text-danger"}`} role="status">{note.text}</span>}
    </div>
  );
}

/** One-tap confirm from the host dashboard's "Results to confirm" list (agreeing or single reports). */
export function QuickConfirm({ setId }: { setId: string }) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <button
        type="button"
        className="btn btn-sm btn-primary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await reviewFinalScore(setId, "confirm");
            setError(res.error ?? null);
          })
        }
      >
        {pending ? t("common.saving") : t("hostbracket.review.confirmOne")}
      </button>
      {error && <p className="w-full text-sm text-danger" role="alert">{error}</p>}
    </>
  );
}

export function TOFinalReview({ setId, names, finals }: { setId: string; names: Names; finals: Partial<Record<"1" | "2", FinalReport>> }) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const a = finals["1"], b = finals["2"];
  if (!a && !b) return null;
  const agree = a && b && a.winner === b.winner && a.score.join() === b.score.join();
  const decide = (decision: "confirm" | "deny", from?: PlayerSlot) =>
    start(async () => {
      const res = await reviewFinalScore(setId, decision, from);
      setError(res.error ?? null);
    });
  const reports = ([[1, a], [2, b]] as [PlayerSlot, FinalReport | undefined][]).filter(([, r]) => r) as [PlayerSlot, FinalReport][];

  return (
    <section className="card flex flex-col gap-3 border-brand p-4" aria-labelledby="to-review">
      <h2 id="to-review" className="font-bold"><Icon name="clipboard" /> {t("hostbracket.review.title")}</h2>
      {agree ? (
        <>
          <p className="text-sm">{withNode(t("hostbracket.review.agree", { result: MARK }), <b>{describe(a!, names, t)}</b>)}</p>
          <div className="flex gap-2">
            <button type="button" className="btn btn-sm btn-primary" disabled={pending} onClick={() => decide("confirm")}>{t("hostbracket.review.confirm")}</button>
            <button type="button" className="btn btn-sm btn-outline" disabled={pending} onClick={() => decide("deny")}>{t("hostbracket.review.deny")}</button>
          </div>
        </>
      ) : (
        <>
          {reports.length > 1 && <p className="text-sm text-danger">{t("hostbracket.review.differ")}</p>}
          <ul className="flex flex-col gap-2">
            {reports.map(([slot, r]) => (
              <li key={slot} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="min-w-0 flex-1">
                  {withNode(t("hostbracket.review.reported", { name: names[slot - 1], result: MARK }), <b>{describe(r, names, t)}</b>)}
                  {reports.length === 1 && <span className="text-muted">{t("hostbracket.review.notReported", { name: names[slot === 1 ? 1 : 0] })}</span>}
                </span>
                <button type="button" className="btn btn-sm btn-primary" disabled={pending} onClick={() => decide("confirm", slot)}>
                  {reports.length > 1 ? t("hostbracket.review.confirmThis") : t("hostbracket.review.confirmOne")}
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-sm btn-outline self-start" disabled={pending} onClick={() => decide("deny")}>{t("hostbracket.review.denyRereport")}</button>
        </>
      )}
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
    </section>
  );
}

/** Shows how many results are waiting in the browser tab title ("(2) Weekly #4 · Smashy"), for a TO with the page in a background tab. */
/** TO: the number of results waiting, in the tab title ("(2) Weekly #4 · Smashy"). */
export function PendingInTitle({ count }: { count: number }) {
  return <TitlePrefix prefix={count > 0 ? `(${count})` : null} />;
}
