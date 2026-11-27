"use client";
// The Arcade's three Melee knowledge quizzes on one screen (round 955; the questions are made in
// lib/frameGames.ts from numbers read from the game). Ten questions a round, one at a time: pick an answer, see
// why, move on; a score out of ten at the end, greeted like Who won this set?, and the best kept in the browser.
// - frames: Which is faster? (two moves)     - move: Guess the move (a frame strip, four choices)
// - kill: Does it kill? (yes or no, then the flight is drawn)
import { useState } from "react";
import { Confetti, Pips } from "@/components/arcade/ArcadeBits";
import { showToast } from "@/components/ui/Toaster";
import { setsRank, setsShare, type SetsRank } from "@/lib/arcade";
import { characterName } from "@/lib/characters";
import { STAGES } from "@/lib/diSurvival";
import { QUIZ_LENGTH, newDuel, newKillQuestion, newMoveGuess, type Duel, type KillQuestion, type MoveGuess } from "@/lib/frameGames";
import type { MessageKey } from "@/lib/i18n/base";
import { useT } from "@/lib/i18n/client";
import type { MoveChar, MoveData, MoveKey } from "@/lib/meleeMoves.data";
import { useStoredState } from "@/lib/useStoredState";

export type QuizKind = "frames" | "move" | "kill";
type Question = { kind: "frames"; q: Duel } | { kind: "move"; q: MoveGuess } | { kind: "kill"; q: KillQuestion };
const MAKE: Record<QuizKind, () => Question> = {
  frames: () => ({ kind: "frames", q: newDuel(Math.random) }),
  move: () => ({ kind: "move", q: newMoveGuess(Math.random) }),
  kill: () => ({ kind: "kill", q: newKillQuestion(Math.random) }),
};
const PATH: Record<QuizKind, string> = { frames: "frames", move: "move", kill: "kill" };
const RANK: Record<SetsRank, MessageKey> = { perfect: "history.arcade.fq.rank.perfect", top8: "history.arcade.sets.rank.top8", pools: "history.arcade.sets.rank.pools", out: "history.arcade.sets.rank.out" };
const MOVE: Record<MoveKey, MessageKey> = {
  jab: "history.arcade.mv.jab", dashAttack: "history.arcade.mv.dashAttack", ftilt: "history.arcade.mv.ftilt", utilt: "history.arcade.mv.utilt", dtilt: "history.arcade.mv.dtilt",
  fsmash: "history.arcade.mv.fsmash", usmash: "history.arcade.mv.usmash", dsmash: "history.arcade.mv.dsmash", nair: "history.arcade.mv.nair", fair: "history.arcade.mv.fair",
  bair: "history.arcade.mv.bair", uair: "history.arcade.mv.uair", dair: "history.arcade.mv.dair", grab: "history.arcade.mv.grab", dashGrab: "history.arcade.mv.dashGrab",
};
const who = (c: string) => characterName("melee", c) ?? c;

/** A move's frames as a row of small boxes: startup, the frames it can hit on, the rest. */
function FrameStrip({ d }: { d: MoveData }) {
  const t = useT();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-px" aria-hidden="true">
        {Array.from({ length: d.total }, (_, i) => {
          const f = i + 1;
          return <span key={f} className="arcade-flip h-5 w-1.5 sm:w-2" style={{ "--i": i * 0.08, background: f < d.start ? "var(--line-strong)" : f <= d.end ? "#ff5a4f" : "#5a5f8f" } as React.CSSProperties} />;
        })}
      </div>
      <p className="text-meta text-muted">{t("history.arcade.fq.strip", { a: d.start, b: d.end, n: d.total, d: d.damage })}</p>
    </div>
  );
}

/** The launch drawn on its stage (Does it kill?), after the answer. */
function FlightMap({ q }: { q: KillQuestion }) {
  const s = STAGES[q.stage];
  const pts = q.flight.points.map(([x, y]) => `${x.toFixed(1)},${(-y).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`${s.left - 12} ${-s.top - 12} ${s.right - s.left + 24} ${s.top - s.bottom + 24}`} className="arcade-pop h-44 w-full" aria-hidden="true">
      <rect x={s.left} y={-s.top} width={s.right - s.left} height={s.top - s.bottom} fill="none" stroke="#ff5a4f" strokeWidth={2} strokeDasharray="8 6" />
      <rect x={-s.edge} y={0} width={s.edge * 2} height={6} fill="rgb(190 200 255 / 0.6)" />
      <polyline points={pts} fill="none" stroke={q.kills ? "#ff5a4f" : "#ffd447"} strokeWidth={3} />
      <circle cx={0} cy={-6} r={6} fill="#ffd447" />
    </svg>
  );
}

export default function FrameQuiz({ kind }: { kind: QuizKind }) {
  const t = useT();
  const [question, setQuestion] = useState<Question | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [bestStored, setBest] = useStoredState(`arcade.fq.${kind}.best`, "0");
  const best = Number(bestStored) || 0;
  const mv = (m: MoveKey) => t(MOVE[m]);
  const named = (c: MoveChar, m: MoveKey) => t("history.arcade.fq.of", { char: who(c), move: mv(m) });

  const start = () => {
    setAnswers([]);
    setPicked(null);
    setQuestion(MAKE[kind]());
  };
  const next = () => {
    setPicked(null);
    setQuestion(answers.length >= QUIZ_LENGTH ? null : MAKE[kind]());
  };

  // Not started, or a round just ended.
  if (!question) {
    const over = answers.length >= QUIZ_LENGTH;
    const score = answers.filter(Boolean).length;
    const rank = setsRank(score, QUIZ_LENGTH);
    return (
      <div className="arcade-pop card relative flex flex-col items-start gap-3 p-4" role="status">
        {over ? (
          <>
            {(rank === "perfect" || rank === "top8") && <Confetti />}
            <p className="text-3xl font-black italic tabular-nums"><span className="arcade-bump">{score}</span><span className="text-muted">/{QUIZ_LENGTH}</span></p>
            <p className="text-lg font-bold">{t(RANK[rank])}</p>
            <Pips results={answers} total={QUIZ_LENGTH} />
          </>
        ) : (
          <p className="text-sm">{t(`history.arcade.fq.${kind}.how`)}</p>
        )}
        {best > 0 && <p className="text-meta text-muted">{t("history.arcade.sets.best", { n: best, total: QUIZ_LENGTH })}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={start} autoFocus className="btn btn-md btn-inverse">{t(over ? "history.arcade.hl.again" : "history.arcade.tech.start")}</button>
          {over && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(`${t(`history.arcade.fq.${kind}.title`)}\n${setsShare(answers)}\nhttps://smashy.gg/arcade/${PATH[kind]}`);
                  showToast(t("ui.copied"));
                } catch {
                  showToast(t("ui.shareFailed"));
                }
              }}
              className="btn btn-md btn-outline"
            >
              {t("history.arcade.share")}
            </button>
          )}
        </div>
      </div>
    );
  }

  // The question, worded.
  let prompt = "";
  let options: { key: string; label: string; sub?: string }[] = [];
  let answer = "";
  let explain = "";
  let extra: React.ReactNode = null;
  let after: React.ReactNode = null;
  if (question.kind === "frames") {
    const { q } = question;
    prompt = t(q.kind === "startup" ? "history.arcade.fq.frames.sooner" : "history.arcade.fq.frames.harder");
    const sub = (d: MoveData) => (q.kind === "startup" ? t("history.arcade.fq.frame", { n: d.start }) : `${d.damage}%`);
    options = [{ key: "a", label: named(q.a.char, q.a.move), sub: sub(q.a.data) }, { key: "b", label: named(q.b.char, q.b.move), sub: sub(q.b.data) }];
    answer = q.answer;
  } else if (question.kind === "move") {
    const { q } = question;
    prompt = t("history.arcade.fq.move.q", { char: who(q.char) });
    extra = <FrameStrip d={q.data} />;
    options = q.options.map((m) => ({ key: m, label: mv(m) }));
    answer = q.answer;
    explain = t("history.arcade.fq.move.why", { move: mv(q.answer), a: q.data.start, b: q.data.end, n: q.data.total });
  } else {
    const { q } = question;
    prompt = t("history.arcade.fq.kill.q", { hit: named(q.attacker, q.move), victim: who(q.victim), n: q.percent, stage: STAGES[q.stage].name });
    options = [{ key: "yes", label: t("history.arcade.fq.kill.yes") }, { key: "no", label: t("history.arcade.fq.kill.no") }];
    answer = q.kills ? "yes" : "no";
    explain = t("history.arcade.fq.kill.why", { n: q.killsFrom });
    after = <FlightMap q={q} />;
  }
  const pick = (key: string) => {
    if (picked) return;
    const next = [...answers, key === answer];
    setPicked(key);
    setAnswers(next);
    if (next.length >= QUIZ_LENGTH && next.filter(Boolean).length > best) setBest(String(next.filter(Boolean).length));
  };
  const right = picked === answer;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-meta font-semibold text-muted">{t("history.arcade.fq.progress", { n: answers.length + (picked ? 0 : 1), total: QUIZ_LENGTH })}</p>
        <Pips results={answers} total={QUIZ_LENGTH} />
      </div>
      <div key={answers.length - (picked ? 1 : 0)} className="flex flex-col gap-4">
        <h2 className="arcade-pop text-lg font-bold">{prompt}</h2>
        {extra}
        <div className="grid gap-3 sm:grid-cols-2">
          {options.map((o) => {
            const state = !picked ? "" : o.key === answer ? "arcade-right" : o.key === picked ? "arcade-wrong" : "";
            return (
              <button key={o.key} type="button" onClick={() => pick(o.key)} disabled={picked !== null} className={`arcade-side arcade-pop card flex min-h-20 flex-col items-center justify-center gap-1 p-4 text-center ${state}`}>
                <span className="text-base font-bold">{picked && o.key === answer && <span className="text-success">✓ </span>}{o.label}</span>
                {/* The numbers only show once answered: knowing them is the game. */}
                {o.sub && picked && <span className="text-meta text-muted">{o.sub}</span>}
              </button>
            );
          })}
        </div>
      </div>
      {picked && (
        <div className="arcade-pop flex flex-col gap-3" role="status">
          {after}
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-semibold">{right ? t("history.arcade.hl.right") : t("history.arcade.sets.wrong")} {explain}</p>
            <button type="button" onClick={next} autoFocus className="btn btn-md btn-inverse">{t(answers.length >= QUIZ_LENGTH ? "history.arcade.sets.results" : "history.arcade.hl.next")}</button>
          </div>
        </div>
      )}
      <p className="text-meta text-muted">{t(`history.arcade.fq.${kind}.note`)}</p>
    </div>
  );
}
