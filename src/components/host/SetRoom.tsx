"use client";

import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState, useTransition, type ReactNode } from "react";
import { finishSet, hostRecordGame, liveMove, saveConnectCode } from "@/app/host/live-actions";
import { useT } from "@/lib/i18n/client";
import Scoreboard from "@/components/host/Scoreboard";
import StageDiagram from "@/components/strike/StageDiagram";
import CopyButton from "@/components/ui/CopyButton";
import Icon from "@/components/ui/Icon";
import { livePhase, liveScore, type LiveAction, type LiveState, type PlayerSlot } from "@/lib/liveSet";
import type { StrikeRules } from "@/lib/striking";
import { subscribeAsUser } from "@/lib/supabase/realtime";

const COLORS = ["text-brand", "text-player-2"] as const; // player 1 red, player 2 blue: a theme color, so it follows Smashy's Light/Dark switch

/** A phrase with one {placeholder} filled by a React node (a colored name): pass MARK as its value. */
const MARK = "\u0001";
function withNode(text: string, node: ReactNode) {
  return <>{text.split(/(\u0001)/).map((part, i) => (part === MARK ? <Fragment key={i}>{node}</Fragment> : part))}</>;
}

/**
 * The live set: both players strike, ban and pick stages and report games from their own devices,
 * and everyone watching sees each move as it happens. The server checks every move.
 */
export default function SetRoom({
  setId,
  eventId,
  me,
  isHost,
  names,
  codes,
  live,
  rules,
  bestOf,
}: {
  setId: string;
  eventId: string;
  me: PlayerSlot | null;
  isHost: boolean;
  names: [string, string];
  codes: [string | null, string | null] | null; // null = this event has no connect codes (doubles)
  live: LiveState;
  rules: StrikeRules;
  bestOf: number;
}) {
  const router = useRouter();
  const t = useT();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState(me && codes ? (codes[me - 1] ?? "") : "");

  // Live updates: refresh when this set changes (the other player moved, or the host stepped in).
  useEffect(() => {
    const stop = subscribeAsUser((client) =>
      client
        .channel(`hosted-set-${setId}-${Math.random().toString(36).slice(2)}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "hosted_sets", filter: `id=eq.${setId}` }, () => router.refresh()),
    );
    return stop;
  }, [setId, router]);

  const run = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (res.error) {
        setError(res.error);
        router.refresh();
      }
    });
  const move = (action: LiveAction) => run(() => liveMove(setId, action));

  const phase = livePhase(rules, bestOf, live);
  const [s1, s2] = liveScore(live);
  // All games played: the bracket normally records the set within a second or two. If this room is
  // still showing 5 seconds later, offer "Finish the set" (see the last branch below).
  const over = phase.kind === "done";
  const started = live.struck.length > 0 || live.games.length > 0 || !!live.stage;
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    if (!over) return;
    const t = setTimeout(() => setStuck(true), 5000);
    return () => clearTimeout(t);
  }, [over]);
  const name = (p: PlayerSlot) => <b className={COLORS[p - 1]}>{p === me ? t("setroom.you") : names[p - 1]}</b>;
  const waiting = (p: PlayerSlot) => (!myTurn(p) && me ? t("setroom.waitingSuffix") : "");
  const myTurn = (p: PlayerSlot) => me === p;
  const pool = [...new Set([...rules.starters, ...rules.counterpicks])];

  const tiles = (all: string[], options: string[], onPick: ((st: string) => void) | null, marked: string[]) => (
    <ul className="grid grid-cols-2 gap-2">
      {all.map((st) => {
        const out = marked.includes(st);
        const can = !!onPick && options.includes(st);
        return (
          <li key={st}>
            <button
              type="button"
              disabled={!can || pending}
              onClick={() => onPick?.(st)}
              className={`relative flex w-full flex-col items-center gap-1 rounded-xl border-2 px-2 pt-2 pb-2.5 text-center font-semibold transition ${
                out ? "border-line text-muted opacity-60" : can ? "border-line-strong hover:bg-surface active:scale-[0.98]" : "border-line opacity-70"
              }`}
            >
              <StageDiagram name={st} className="h-14 w-28" />
              <span className="leading-tight">{st}</span>
              {out && <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-5xl font-black text-danger/70">✕</span>}
              {out && <span className="sr-only">{t("setroom.struckOrBanned")}</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );

  let body: React.ReactNode;
  if (phase.kind === "strike") {
    body = (
      <>
        {live.struck.length === 0 && <p className="text-sm text-muted">{withNode(t(live.first === me ? "setroom.coinFlipMe" : "setroom.coinFlip", { name: MARK }), name(live.first))}</p>}
        <p className="text-lg">{withNode(t("setroom.strike", { name: MARK, n: phase.count }), name(phase.turn))}{waiting(phase.turn)}</p>
        {tiles(rules.starters, phase.options, myTurn(phase.turn) ? (st) => move({ type: "strike", stage: st }) : null, live.struck)}
      </>
    );
  } else if (phase.kind === "ban") {
    body = (
      <>
        <p className="text-lg">{withNode(t(phase.turn === me ? "setroom.banMe" : "setroom.ban", { name: MARK, game: live.games.length, n: phase.count }), name(phase.turn))}{waiting(phase.turn)}</p>
        {tiles(pool, phase.options, myTurn(phase.turn) ? (st) => move({ type: "ban", stage: st }) : null, live.banned)}
      </>
    );
  } else if (phase.kind === "pick") {
    body = (
      <>
        <p className="text-lg">{withNode(t("setroom.pick", { name: MARK, game: live.games.length + 1 }), name(phase.turn))}{waiting(phase.turn)}</p>
        {tiles(pool, phase.options, myTurn(phase.turn) ? (st) => move({ type: "pick", stage: st }) : null, live.banned)}
        {rules.dsr !== "none" && <p className="text-meta text-muted">{t("setroom.dsrGreyed")}</p>}
      </>
    );
  } else if (phase.kind === "play") {
    const r = live.report;
    const them: PlayerSlot | null = me ? (me === 1 ? 2 : 1) : null;
    body = (
      <>
        <div className="rounded-xl border-2 border-foreground p-4 text-center">
          <p className="text-meta uppercase tracking-wide text-muted">{t("setroom.game", { n: phase.game })}</p>
          <StageDiagram name={phase.stage} className="mx-auto my-1 h-20 w-40" />
          <p className="text-2xl font-bold">{phase.stage}</p>
        </div>
        {r?.disputed ? (
          <p className="rounded-lg bg-surface p-3 text-sm">
            {t(isHost ? "setroom.disputedHost" : "setroom.disputed", { game: phase.game })}
          </p>
        ) : me && them ? (
          r && r.by !== me ? (
            <div className="flex flex-col gap-2">
              <p className="text-center">
                {r.winner === me
                  ? t("setroom.saysYouWon", { name: names[r.by - 1] })
                  : r.winner === r.by
                    ? t("setroom.saysTheyWon", { name: names[r.by - 1] })
                    : t("setroom.saysOtherWon", { name: names[r.by - 1], winner: names[r.winner - 1] })}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" disabled={pending} onClick={() => move({ type: "report", winner: r.winner })} className="btn btn-lg btn-primary">{t("common.yes")}</button>
                <button type="button" disabled={pending} onClick={() => move({ type: "report", winner: r.winner === 1 ? 2 : 1 })} className="btn btn-lg btn-outline">{t("common.no")}</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-center">{r ? t("setroom.waitingConfirm", { name: names[them - 1] }) : t("setroom.whoWonGame")}</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" disabled={pending} onClick={() => move({ type: "report", winner: me })} aria-pressed={r?.winner === me} className="btn btn-lg btn-outline">{t("setroom.iWon")}</button>
                <button type="button" disabled={pending} onClick={() => move({ type: "report", winner: them })} aria-pressed={r?.winner === them} className="btn btn-lg btn-outline">{t("setroom.theyWon", { name: names[them - 1] })}</button>
              </div>
            </div>
          )
        ) : (
          <p className="text-center text-sm text-muted">{r ? t("setroom.reportedWaiting", { name: names[r.by - 1] }) : t("setroom.inProgress")}</p>
        )}
        {isHost && (
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3 text-sm">
            <span className="text-muted">{t("hostbracket.set.recordGame", { n: phase.game })}</span>
            {([1, 2] as const).map((p) => (
              <button key={p} type="button" disabled={pending} onClick={() => run(() => hostRecordGame(setId, p))} className="btn btn-sm btn-outline">{names[p - 1]}</button>
            ))}
          </div>
        )}
      </>
    );
  } else {
    body = (
      <>
        <p className="rounded-xl border-2 border-foreground p-4 text-center text-xl font-bold"><Icon name="trophy" /> {t("setroom.wins", { name: names[phase.winner - 1], a: Math.max(s1, s2), b: Math.min(s1, s2) })}</p>
        {/* This room only shows while the bracket hasn't recorded the set. If it's still here a few
            seconds after the last game, that save was interrupted: let a player or the TO finish it. */}
        {stuck && (me || isHost) && (
          <div className="flex flex-col items-center gap-2 text-center text-sm">
            <p className="text-muted">{t("setroom.notInBracket")}</p>
            <button type="button" disabled={pending} onClick={() => run(() => finishSet(setId))} className="btn btn-md btn-primary">
              {t("setroom.finish")}
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4" aria-live="polite">
      {/* Live only once someone has made a move here; a set reported as a final score never is. */}
      <Scoreboard
        status={over ? "final" : started ? "live" : Object.keys(live.finals ?? {}).length > 0 ? "reported" : "ready"}
        statusText={phase.kind === "play" ? t("setroom.game", { n: phase.game }) : started && !over ? t("setroom.picking") : undefined}
        left={{ name: names[0], score: s1 }}
        right={{ name: names[1], score: s2 }}
        winner={phase.kind === "done" ? phase.winner : null}
      />

      {(me || isHost) && codes && (
        <section className="card flex flex-col gap-2 p-3 text-sm" aria-label={t("setroom.codes")}>
          {([1, 2] as const).filter((p) => p !== me).map((p) => (
            <div key={p} className="flex items-center gap-2">
              <span className="text-muted">{t("setroom.theirCode", { name: names[p - 1] })}</span>
              {codes[p - 1] ? (
                <>
                  <code className="font-mono font-semibold">{codes[p - 1]}</code>
                  <CopyButton text={codes[p - 1]!} />
                </>
              ) : (
                <span className="text-muted">{t("setroom.noCode")}</span>
              )}
            </div>
          ))}
          {me && (
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                run(() => saveConnectCode(eventId, code));
              }}
            >
              <label className="text-muted" htmlFor="my-code">{t("setroom.yourCode")}</label>
              <input id="my-code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={40} placeholder={t("setroom.codeExample")} className="field min-w-0 flex-1 py-1 font-mono" />
              <button disabled={pending || code === (codes[me - 1] ?? "")} className="btn btn-sm btn-outline">{t("common.save")}</button>
            </form>
          )}
        </section>
      )}

      {body}

      {live.games.length > 0 && (
        <ol className="flex flex-col gap-1 text-sm text-muted">
          {live.games.map((g, i) => (
            <li key={i}>{t("setroom.gameLine", { n: i + 1, stage: g.stage, name: names[g.winner - 1] })}</li>
          ))}
        </ol>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
