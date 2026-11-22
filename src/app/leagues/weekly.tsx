"use client";
// League step L3: reporting your weekly set, and the organizer settling sets.
import { useState, useTransition } from "react";
import { useT } from "@/lib/i18n/client";
import { deleteLeague, reportLeagueSet, settleLeagueSet, type Settle } from "./actions";

/**
 * "Your set this week": report the score. When your opponent reported first, you confirm it or
 * report what really happened (a different score sends it to the organizer).
 */
export function MyLeagueSet({
  leagueId, setId, bestOf, state, reportedByMe, shownScore, oppTag,
}: {
  leagueId: string; setId: string; bestOf: number; state: string; reportedByMe: boolean;
  shownScore: { mine: number; theirs: number } | null; oppTag: string;
}) {
  const t = useT();
  const need = Math.floor(bestOf / 2) + 1;
  const [mine, setMine] = useState(need);
  const [theirs, setTheirs] = useState(0);
  const [pending, start] = useTransition();
  const [note, setNote] = useState<{ error?: boolean; text: string } | null>(null);
  const send = (a: number, b: number) =>
    start(async () => {
      const res = await reportLeagueSet(leagueId, setId, a, b);
      if (res.error) return setNote({ error: true, text: res.error });
      setNote({ text: t(res.state === "confirmed" ? "league.my.confirmedNote" : res.state === "disputed" ? "league.my.disputedNote" : "league.my.reportedNote") });
    });
  const games = Array.from({ length: need + 1 }, (_, i) => i);
  const settled = state === "confirmed" || state === "no_show" || state === "double_loss";
  const scoreKey = reportedByMe ? "league.my.youReported" : state === "reported" ? "league.my.theyReported" : "league.my.score";
  return (
    <div className="flex flex-col gap-2">
      {shownScore && <p className="text-sm">{t(scoreKey, { tag: oppTag, mine: shownScore.mine, theirs: shownScore.theirs })}</p>}
      {state === "disputed" && <p className="text-sm text-danger">{t("league.my.disputed")}</p>}
      {state === "reported" && !reportedByMe && shownScore && (
        <button type="button" disabled={pending} onClick={() => send(shownScore.mine, shownScore.theirs)} className="btn btn-sm btn-primary self-start">{t("league.my.confirm")}</button>
      )}
      {!settled && state !== "disputed" && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>{t(state === "reported" && !reportedByMe ? "league.my.different" : "league.my.report")}</span>
          <label className="flex items-center gap-1">
            {t("league.my.me")}
            <select value={mine} onChange={(e) => setMine(Number(e.target.value))} className="field w-auto py-1">{games.map((g) => <option key={g} value={g}>{g}</option>)}</select>
          </label>
          <label className="flex items-center gap-1">
            {t("league.my.them", { tag: oppTag })}
            <select value={theirs} onChange={(e) => setTheirs(Number(e.target.value))} className="field w-auto py-1">{games.map((g) => <option key={g} value={g}>{g}</option>)}</select>
          </label>
          <button type="button" disabled={pending} onClick={() => send(mine, theirs)} className="btn btn-sm btn-outline">{t("league.my.send")}</button>
        </div>
      )}
      {note && <p role={note.error ? "alert" : "status"} className={`text-sm ${note.error ? "text-danger" : "text-success"}`}>{note.text}</p>}
    </div>
  );
}

/** The organizer settles one set: a score, a no-show win, a double loss, or back to unplayed. */
export function SettleSet({ leagueId, setId, bestOf, p1, p2 }: { leagueId: string; setId: string; bestOf: number; p1: string; p2: string }) {
  const t = useT();
  const need = Math.floor(bestOf / 2) + 1;
  const [a, setA] = useState(need);
  const [b, setB] = useState(0);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (how: Settle) => start(async () => setError((await settleLeagueSet(leagueId, setId, how)).error ?? null));
  const games = Array.from({ length: need + 1 }, (_, i) => i);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1 text-meta">
        <select value={a} onChange={(e) => setA(Number(e.target.value))} className="field w-auto py-0.5" aria-label={t("league.settle.gamesOf", { tag: p1 })}>{games.map((g) => <option key={g}>{g}</option>)}</select>
        <span aria-hidden="true">–</span>
        <select value={b} onChange={(e) => setB(Number(e.target.value))} className="field w-auto py-0.5" aria-label={t("league.settle.gamesOf", { tag: p2 })}>{games.map((g) => <option key={g}>{g}</option>)}</select>
        <button type="button" disabled={pending} onClick={() => run({ kind: "score", p1: a, p2: b })} className="btn btn-sm btn-outline">{t("league.settle.save")}</button>
        <button type="button" disabled={pending} onClick={() => run({ kind: "no_show", winner: "p1" })} className="btn btn-sm btn-ghost">{t("league.settle.noShowWin", { tag: p1 })}</button>
        <button type="button" disabled={pending} onClick={() => run({ kind: "no_show", winner: "p2" })} className="btn btn-sm btn-ghost">{t("league.settle.noShowWin", { tag: p2 })}</button>
        <button type="button" disabled={pending} onClick={() => run({ kind: "double_loss" })} className="btn btn-sm btn-ghost">{t("league.settle.doubleLoss")}</button>
        <button type="button" disabled={pending} onClick={() => run({ kind: "reset" })} className="btn btn-sm btn-ghost">{t("league.settle.reset")}</button>
      </div>
      {error && <p role="alert" className="text-meta text-danger">{error}</p>}
    </div>
  );
}

/** The organizer deletes the league (after a confirm), from the organizer's page. */
export function DeleteLeague({ id, name }: { id: string; name: string }) {
  const t = useT();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-1 border-t border-line pt-4">
      <button
        type="button"
        disabled={pending}
        onClick={() => confirm(t("league.delete.confirm", { name })) && start(async () => setError((await deleteLeague(id))?.error ?? null))}
        className="btn btn-sm btn-ghost self-start text-danger"
      >
        {t("league.delete.button")}
      </button>
      {error && <p role="alert" className="text-meta text-danger">{error}</p>}
    </div>
  );
}
