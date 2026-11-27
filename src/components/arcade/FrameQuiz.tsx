"use client";
// The Arcade's three Melee knowledge quizzes on one screen (round 955; the questions are made in
// lib/frameGames.ts from numbers read from the game). Ten questions a round, one at a time: pick an answer, see
// why, move on; a score out of ten at the end, greeted like Who won this set?, and the best kept in the browser.
// - frames: Which is faster? (two moves; which comes out sooner)
// - move: Guess the move (the move's frames as a strip, each separate hit with its damage; four choices)
// - kill: Does it kill? (the hit set up on its stage with both characters; yes or no; then the launch is flown);
//   Melee or Ultimate (round 963: Ultimate's rules from the Smash Ultimate Calculator, lib/ultimateKill.ts)
// - shield: Which is safer on shield? (two Ultimate moves hit a shield; which leaves its user less behind)
// Since round 968 Which is faster? and Guess the move can be asked about Ultimate too (lib/ultimateFrames.ts), and
// Which is safer on shield? is Ultimate's own (Matthew picked it over "can they shield-grab it?" and "how minus").
// Round 971 (Matthew, of the old start screen: "feels vibe coded and a user would quickly get disinterested"): the
// start and end screens are a title card like the hub's (its picture, the title over it, one line), big buttons for
// the game and Play, and the how-to and the notes on the numbers folded away.
// Round 958 (Matthew: no "which does more damage" in a game about speed; Guess the move "could use more data" and
// hid the gap between a move's hits; Does it kill? was "boring without any visuals").
import dynamic from "next/dynamic";
import { useState } from "react";
import { QUIZ_LOOK } from "@/components/arcade/ArcadeArt";
import { Confetti, Pips, Reveal } from "@/components/arcade/ArcadeBits";
import { showToast } from "@/components/ui/Toaster";
import { setsRank, setsShare, type SetsRank } from "@/lib/arcade";
import { characterName } from "@/lib/characters";
import { passedTopAlive } from "@/lib/diSurvival";
import { QUIZ_LENGTH, newDuel, newKillQuestion, newMoveGuess, toKillView, type Duel, type MoveGuess } from "@/lib/frameGames";
import { GAMES, type GameKey } from "@/lib/games";
import type { MessageKey } from "@/lib/i18n/base";
import { useT } from "@/lib/i18n/client";
import { stockIconUrl } from "@/lib/mainBadge";
import type { MoveChar, MoveData, MoveKey } from "@/lib/meleeMoves.data";
import type { ShieldDuel, UltMoveData } from "@/lib/ultimateFrames";
import type { KillView } from "@/lib/ultimateKill";
import { useStoredState } from "@/lib/useStoredState";

// Melee's Does it kill? picture (round 1000): the real stage, moves and hit poses, loaded with its data only when a
// Melee question is shown.
const KillScene = dynamic(() => import("@/components/arcade/KillScene"), { ssr: false, loading: () => <div className="card w-full" style={{ aspectRatio: "640 / 340" }} /> });

export type QuizKind = "frames" | "move" | "kill" | "shield";
type Question = { kind: "frames"; q: Duel; game: GameKey } | { kind: "move"; q: MoveGuess; game: GameKey } | { kind: "kill"; q: KillView } | { kind: "shield"; q: ShieldDuel };
/** Melee's questions, made right here (Ultimate's data is fetched when asked for). */
const MAKE: Record<Exclude<QuizKind, "shield">, (hard: boolean) => Question> = {
  frames: () => ({ kind: "frames", q: newDuel(Math.random), game: "melee" }),
  move: () => ({ kind: "move", q: newMoveGuess(Math.random), game: "melee" }),
  kill: (hard) => ({ kind: "kill", q: toKillView(newKillQuestion(Math.random, hard)) }),
};
const NOTE: Record<QuizKind, { melee: MessageKey; ultimate: MessageKey }> = {
  frames: { melee: "history.arcade.fq.frames.note", ultimate: "history.arcade.fq.frames.noteUlt" },
  move: { melee: "history.arcade.fq.move.note", ultimate: "history.arcade.fq.move.noteUlt" },
  kill: { melee: "history.arcade.fq.kill.note", ultimate: "history.arcade.fq.kill.noteUlt" },
  shield: { melee: "history.arcade.fq.shield.note", ultimate: "history.arcade.fq.shield.note" },
};
const RANK: Record<SetsRank, MessageKey> = { perfect: "history.arcade.fq.rank.perfect", top8: "history.arcade.sets.rank.top8", pools: "history.arcade.sets.rank.pools", out: "history.arcade.sets.rank.out" };
const MOVE: Record<MoveKey, MessageKey> = {
  jab: "history.arcade.mv.jab", dashAttack: "history.arcade.mv.dashAttack", ftilt: "history.arcade.mv.ftilt", utilt: "history.arcade.mv.utilt", dtilt: "history.arcade.mv.dtilt",
  fsmash: "history.arcade.mv.fsmash", usmash: "history.arcade.mv.usmash", dsmash: "history.arcade.mv.dsmash", nair: "history.arcade.mv.nair", fair: "history.arcade.mv.fair",
  bair: "history.arcade.mv.bair", uair: "history.arcade.mv.uair", dair: "history.arcade.mv.dair", grab: "history.arcade.mv.grab", dashGrab: "history.arcade.mv.dashGrab",
};
const who = (c: string, game: GameKey = "melee") => characterName(game, c) ?? c;
const icon = (c: string, game: GameKey = "melee") => stockIconUrl({ game, character: c });

/**
 * A move's frames as a row of boxes: grey for startup, each hit in its own colour on the frames it is out (with
 * the gaps between separate hits left dark), the rest until the character can act again. Under it, each hit's frames
 * and damage, and the frame the character is free on.
 */
// One colour per hit of a multi-hit move, in turn (round 962, Matthew: "multihit moves should have their different
// hitboxes represented by different colors because these ones tripped me up").
const HIT_COLORS = ["#ff5a4f", "#ffd447", "#5ad1ff", "#7dff9a", "#c58bff", "#ffa040"];
const hitColor = (i: number) => HIT_COLORS[i % HIT_COLORS.length];

function FrameStrip({ d, landing = null }: { d: MoveData; landing?: number | null }) {
  const t = useT();
  /** Which hit is out on a frame (-1: none). */
  const hitOn = (f: number) => d.hits.findIndex(([from, to]) => f >= from && f <= to);
  return (
    <div className="card flex flex-col gap-3 p-3">
      <div aria-hidden="true">
        <div className="flex gap-px">
          {Array.from({ length: d.total }, (_, i) => {
            const f = i + 1;
            return <span key={f} className="arcade-flip h-7 min-w-0 flex-1" style={{ "--i": i * 0.06, background: f < d.start ? "var(--line-strong)" : hitOn(f) >= 0 ? hitColor(hitOn(f)) : "#3d4170" } as React.CSSProperties} />;
          })}
        </div>
        {/* A number under every tenth frame. */}
        <div className="flex gap-px text-[10px] leading-4 text-muted">
          {Array.from({ length: d.total }, (_, i) => <span key={i} className="min-w-0 flex-1 overflow-visible whitespace-nowrap">{(i + 1) % 10 === 0 || i === 0 ? i + 1 : ""}</span>)}
        </div>
      </div>
      <ul className="flex flex-wrap gap-2 text-meta">
        <li className="badge border border-line font-normal"><span className="mr-1 inline-block h-2 w-2 bg-[var(--line-strong)]" />{t("history.arcade.fq.startup", { n: d.start - 1 })}</li>
        {d.hits.map(([from, to, damage], i) => (
          <li key={from} className="badge border border-line font-normal">
            <span className="mr-1 inline-block h-2 w-2" style={{ background: hitColor(i) }} />
            {t(from === to ? "history.arcade.fq.hit1" : "history.arcade.fq.hit", { i: i + 1, a: from, b: to, d: damage })}
          </li>
        ))}
        <li className="badge border border-line font-normal"><span className="mr-1 inline-block h-2 w-2 bg-[#3d4170]" />{t("history.arcade.fq.free", { n: d.total + 1 })}</li>
        {/* Ultimate's aerials: the landing lag, which the strip leaves out. */}
        {landing !== null && <li className="badge border border-line font-normal">{t("history.arcade.fq.landing", { n: landing })}</li>}
      </ul>
    </div>
  );
}

/**
 * Does it kill?: the hit on its stage. Before answering: the blast lines, the stage, both characters and the
 * percent. After: the launch is drawn along its real path with the character riding it, and a KO flash where it
 * crosses the line.
 */
function KillStage({ q, answered, dialLabel }: { q: KillView; answered: boolean; dialLabel: string }) {
  const s = q.stage;
  const stickX = q.stickAngle === null ? 0 : Math.cos((q.stickAngle * Math.PI) / 180);
  const stickY = q.stickAngle === null ? 0 : -Math.sin((q.stickAngle * Math.PI) / 180);
  const pts = q.flight.points.map(([x, y]) => [x, -y] as const);
  const path = `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}`;
  const [ex, ey] = pts.at(-1)!;
  const size = Math.max(24, (s.right - s.left) / 14);
  const secs = Math.min(2.2, Math.max(0.8, q.flight.frames / 60));
  const victim = icon(q.victim, q.game);
  const attacker = icon(q.attacker, q.game);
  return (
    <svg viewBox={`${s.left - 14} ${-s.top - 14} ${s.right - s.left + 28} ${s.top - s.bottom + 28}`} className="arcade-pop card h-56 w-full sm:h-72" role="img" aria-label={s.name}>
      <rect x={s.left} y={-s.top} width={s.right - s.left} height={s.top - s.bottom} fill="rgb(255 90 79 / 0.04)" stroke="#ff5a4f" strokeWidth={2} strokeDasharray="8 6" />
      <path d={`M${-s.edge} 0H${s.edge}L${s.edge - 16} 26H${-s.edge + 16}Z`} fill="rgb(190 200 255 / 0.22)" />
      <rect x={-s.edge} y={0} width={s.edge * 2} height={3} fill="rgb(190 200 255 / 0.8)" />
      <text x={s.left + 8} y={-s.top + 22} fontSize={16} fontWeight={700} fill="rgb(190 200 255 / 0.75)">{s.name}</text>
      {/* The attacker, beside the victim. */}
      {attacker ? <image href={attacker} x={-size * 1.6} y={-size} width={size} height={size} /> : <circle cx={-size} cy={-size / 2} r={size / 2.4} fill="#ff6b5e" />}
      {answered ? (
        <>
          {q.hard && <path d={`M${q.noDi.points.map(([x, y]) => `${x.toFixed(1)} ${(-y).toFixed(1)}`).join("L")}`} fill="none" stroke="rgb(255 255 255 / 0.45)" strokeWidth={2} strokeDasharray="6 7" />}
          <path d={path} pathLength={1} className="arcade-draw" style={{ animationDuration: `${secs}s` }} fill="none" stroke={q.kills ? "#ff5a4f" : "#ffd447"} strokeWidth={3.5} strokeLinecap="round" />
          <g>
            {victim ? <image href={victim} x={-size / 2} y={-size / 2} width={size} height={size} /> : <circle r={size / 2.4} fill="#ffd447" />}
            <animateMotion dur={`${secs}s`} fill="freeze" path={path} calcMode="linear" />
          </g>
          {/* The stick, where it is held for the best DI: after every answer, in both modes (round 964, Matthew:
              "include the stick showing the best DI every time"). In the middle when holding nothing is best. */}
          <g transform={`translate(${s.right - size * 1.9} ${-s.top + size * 1.9})`}>
            <g className="arcade-ko">
              <circle r={size * 1.2} fill="rgb(10 8 40 / 0.7)" stroke="rgb(190 200 255 / 0.6)" strokeWidth={2} />
              <line x1={0} y1={0} x2={stickX * size * 1.05} y2={stickY * size * 1.05} stroke="#ffd447" strokeWidth={5} strokeLinecap="round" />
              <circle cx={stickX * size * 1.05} cy={stickY * size * 1.05} r={size * 0.32} fill="#ffd447" />
              <text y={size * 1.95} fontSize={14} fontWeight={700} textAnchor="middle" fill="rgb(190 200 255 / 0.85)">{dialLabel}</text>
            </g>
          </g>
          {q.kills && (
            <g className="arcade-ko" style={{ animationDelay: `${secs}s` }}>
              <circle cx={ex} cy={ey} r={size} fill="none" stroke="#ff5a4f" strokeWidth={5} />
              <text x={Math.max(s.left + 40, Math.min(s.right - 40, ex))} y={Math.max(-s.top + 46, Math.min(-s.bottom - 16, ey + size * 1.9))} fontSize={34} fontWeight={900} fontStyle="italic" textAnchor="middle" fill="#ff5a4f">KO!</text>
            </g>
          )}
        </>
      ) : (
        <>
          {victim ? <image href={victim} x={-size / 2} y={-size} width={size} height={size} className="arcade-bob" /> : <circle cx={0} cy={-size / 2} r={size / 2.4} fill="#ffd447" />}
          <text x={0} y={-size * 1.35} fontSize={30} fontWeight={900} fontStyle="italic" textAnchor="middle" fill="#ffd447" stroke="#12102e" strokeWidth={5} paintOrder="stroke">{q.percent}%</text>
        </>
      )}
    </svg>
  );
}

export default function FrameQuiz({ kind }: { kind: QuizKind }) {
  const t = useT();
  const [question, setQuestion] = useState<Question | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  // Does it kill? has a hard mode, with a best score of its own.
  const [hardStored, setHardStored] = useStoredState("arcade.fq.kill.hard", "");
  const hard = kind === "kill" && hardStored === "1";
  // ... and each can be asked about Ultimate (Does it kill? since round 963, the other two since 968), with best scores
  // of their own. Which is safer on shield? is only Ultimate's.
  const choosesGame = kind !== "shield";
  const [gameStored, setGameStored] = useStoredState(`arcade.fq.${kind}.game`, "melee");
  const ultimate = !choosesGame || gameStored === "ultimate";
  const [loading, setLoading] = useState(false);
  const [bestStored, setBest] = useStoredState(`arcade.fq.${kind}${ultimate && choosesGame ? ".ult" : ""}${hard ? ".hard" : ""}.best`, "0");
  const best = Number(bestStored) || 0;
  const mv = (m: MoveKey) => t(MOVE[m]);
  const named = (c: MoveChar | string, m: MoveKey, game: GameKey = "melee") => t("history.arcade.fq.of", { char: who(c, game), move: mv(m) });
  // Ultimate's maths and data (tens of KB) are only fetched when an Ultimate round is played.
  const make = async (): Promise<Question> => {
    if (!ultimate && choosesGame) return MAKE[kind as Exclude<QuizKind, "shield">](hard);
    setLoading(true);
    try {
      if (kind === "kill") {
        const { newUltKillQuestion } = await import("@/lib/ultimateKill");
        return { kind: "kill", q: newUltKillQuestion(Math.random, hard) };
      }
      const f = await import("@/lib/ultimateFrames");
      if (kind === "frames") return { kind: "frames", q: f.newUltDuel(Math.random), game: "ultimate" };
      if (kind === "move") return { kind: "move", q: f.newUltMoveGuess(Math.random), game: "ultimate" };
      return { kind: "shield", q: f.newShieldDuel(Math.random) };
    } finally {
      setLoading(false);
    }
  };

  const start = async () => {
    setAnswers([]);
    setPicked(null);
    setQuestion(await make());
  };
  const next = async () => {
    setPicked(null);
    setQuestion(answers.length >= QUIZ_LENGTH ? null : await make());
  };

  const look = QUIZ_LOOK[kind];
  const note = t(NOTE[kind][ultimate ? "ultimate" : "melee"]);

  // Not started, or a round just ended: the quiz's title card.
  if (!question) {
    const over = answers.length >= QUIZ_LENGTH;
    const score = answers.filter(Boolean).length;
    const rank = setsRank(score, QUIZ_LENGTH);
    return (
      <div className="arcade-pop arcade-start relative" style={{ "--tile": look.color } as React.CSSProperties}>
        {over && (rank === "perfect" || rank === "top8") && <Confetti />}
        <div className="arcade-start-art">
          {look.art}
          <h1 className="arcade-start-title">{t(look.title)}</h1>
        </div>
        <div className="flex flex-col gap-4 p-4 sm:p-5">
          {over ? (
            <div className="flex flex-wrap items-end justify-between gap-3" role="status">
              <div>
                <p className="text-5xl font-black italic tabular-nums leading-none"><span className="arcade-bump">{score}</span><span className="text-2xl text-muted">/{QUIZ_LENGTH}</span></p>
                <p className="mt-1 text-lg font-bold">{t(RANK[rank])}</p>
              </div>
              <Pips results={answers} total={QUIZ_LENGTH} />
            </div>
          ) : (
            <p className="text-lg font-bold">{t(look.line)}</p>
          )}
          {choosesGame && (
            <div className="flex flex-wrap items-center gap-3">
              {choosesGame && (
                <div className="arcade-seg" role="group" aria-label={t("history.arcade.fq.gameLabel")}>
                  {(["melee", "ultimate"] as const).map((g) => (
                    <button key={g} type="button" onClick={() => { setGameStored(g); setAnswers([]); }} aria-pressed={(g === "ultimate") === ultimate}>{GAMES[g].short}</button>
                  ))}
                </div>
              )}
              {kind === "kill" && (
                <button type="button" className="arcade-toggle" aria-pressed={hard} onClick={() => { setHardStored(hard ? "" : "1"); setAnswers([]); }} title={t("history.arcade.fq.kill.hardHow")}>
                  <span aria-hidden="true" className="arcade-toggle-dot" />
                  {t("history.arcade.fq.kill.hard")}
                </button>
              )}
            </div>
          )}
          {hard && <p className="-mt-2 text-sm text-muted">{t("history.arcade.fq.kill.hardHow")}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={start} disabled={loading} autoFocus className="arcade-promo-btn arcade-start-play">{t(over ? "history.arcade.hl.again" : "history.arcade.fq.play")} →</button>
            {best > 0 && <span className="arcade-start-best">★ {t("history.arcade.sets.best", { n: best, total: QUIZ_LENGTH })}</span>}
            {over && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(`${t(look.title)}${hard ? ` (${t("history.arcade.fq.kill.hard")})` : ""}\n${setsShare(answers)}\nhttps://smashy.gg/arcade/${kind}`);
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
          <details className="arcade-start-how">
            <summary>{t("history.arcade.fq.howTo")}</summary>
            <p className="mt-2 text-sm">{t(`history.arcade.fq.${kind}.how`)}</p>
            <p className="mt-2 text-meta text-muted">{note}</p>
          </details>
        </div>
      </div>
    );
  }

  // The question, worded.
  let prompt = "";
  let options: { key: string; label: string; sub?: string; icon?: string | null }[] = [];
  let answer = "";
  let explain = "";
  let extra: React.ReactNode = null;
  let overTop = "";
  if (question.kind === "frames") {
    const { q, game } = question;
    prompt = t("history.arcade.fq.frames.sooner");
    options = [
      { key: "a", label: named(q.a.char, q.a.move, game), sub: t("history.arcade.fq.frame", { n: q.a.data.start }), icon: icon(q.a.char, game) },
      { key: "b", label: named(q.b.char, q.b.move, game), sub: t("history.arcade.fq.frame", { n: q.b.data.start }), icon: icon(q.b.char, game) },
    ];
    answer = q.answer;
  } else if (question.kind === "move") {
    const { q, game } = question;
    prompt = t("history.arcade.fq.move.q", { char: who(q.char, game) });
    extra = <FrameStrip d={q.data} landing={(q.data as Partial<UltMoveData>).landing ?? null} />;
    options = q.options.map((m) => ({ key: m, label: mv(m) }));
    answer = q.answer;
    explain = t("history.arcade.fq.move.why", { move: named(q.char, q.answer, game) });
  } else if (question.kind === "shield") {
    const { q } = question;
    const on = (n: number) => t("history.arcade.fq.shield.on", { n: n > 0 ? `+${n}` : String(n) });
    prompt = t("history.arcade.fq.shield.q");
    options = [
      { key: "a", label: named(q.a.char, q.a.move, "ultimate"), sub: on(q.a.data.shield!), icon: icon(q.a.char, "ultimate") },
      { key: "b", label: named(q.b.char, q.b.move, "ultimate"), sub: on(q.b.data.shield!), icon: icon(q.b.char, "ultimate") },
    ];
    answer = q.answer;
    explain = t("history.arcade.fq.shield.why", { n: Math.abs(q.a.data.shield! - q.b.data.shield!) });
  } else {
    const { q } = question;
    prompt = t(q.hard ? "history.arcade.fq.kill.qHard" : "history.arcade.fq.kill.q", { hit: named(q.attacker, q.move, q.game), victim: who(q.victim, q.game), n: q.percent });
    extra = q.game === "melee" && q.stageKey ? <KillScene q={q} answered={picked !== null} dialLabel={t("history.arcade.fq.kill.bestDi")} /> : <KillStage q={q} answered={picked !== null} dialLabel={t("history.arcade.fq.kill.bestDi")} />;
    options = [{ key: "yes", label: t("history.arcade.fq.kill.yes") }, { key: "no", label: t("history.arcade.fq.kill.no") }];
    answer = q.kills ? "yes" : "no";
    // On hard: when it kills whatever is held there is no direction to name; when they live, the one that saved them.
    // Over the top line and alive: say why, or it looks like a mistake.
    if (passedTopAlive(q.flight, q.stage)) overTop = t(q.game === "ultimate" ? "history.arcade.fq.kill.overTopUlt" : "history.arcade.fq.kill.overTop", { who: who(q.victim, q.game) });
    explain = !q.hard ? `${t("history.arcade.fq.kill.why", { n: q.killsFrom })} ${t("history.arcade.fq.kill.whyDi", { n: q.diFrom })}` : q.kills ? t("history.arcade.fq.kill.whyHardDead", { n: q.killsFrom, m: q.noDiFrom }) : q.stickAngle === null ? t("history.arcade.fq.kill.whyHardNone", { n: q.killsFrom }) : t("history.arcade.fq.kill.whyHard", { n: q.killsFrom, m: q.noDiFrom });
  }
  const pick = (key: string) => {
    if (picked) return;
    const next = [...answers, key === answer];
    setPicked(key);
    setAnswers(next);
    if (next.length >= QUIZ_LENGTH && next.filter(Boolean).length > best) setBest(String(next.filter(Boolean).length));
  };
  const right = picked === answer;
  const moveIcon = question.kind === "move" ? icon(question.q.char, question.game) : null;

  return (
    <div className="arcade-quiz flex flex-col gap-4" style={{ "--tile": look.color } as React.CSSProperties}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="arcade-game-title" style={{ color: look.color }}>{t(look.title)}</h1>
          <p className="text-meta font-semibold text-muted">{t("history.arcade.fq.progress", { n: answers.length + (picked ? 0 : 1), total: QUIZ_LENGTH })}</p>
        </div>
        <Pips results={answers} total={QUIZ_LENGTH} />
      </div>
      <div key={answers.length - (picked ? 1 : 0)} className="flex flex-col gap-4">
        <h2 className="arcade-pop flex items-center gap-2 text-lg font-bold">
          {/* eslint-disable-next-line @next/next/no-img-element -- a small stock icon */}
          {moveIcon && <img src={moveIcon} alt="" width={28} height={28} className="h-7 w-7 object-contain" />}
          {prompt}
        </h2>
        {extra}
        {/* Two a row on a phone too (round 980), so all the answers fit on the screen. */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {options.map((o) => {
            const state = !picked ? "" : o.key === answer ? "arcade-right" : o.key === picked ? "arcade-wrong" : "";
            return (
              <button key={o.key} type="button" onClick={() => pick(o.key)} disabled={picked !== null} className={`arcade-side arcade-pop card arcade-answer flex min-h-20 flex-col items-center justify-center gap-1.5 p-3 text-center sm:min-h-28 sm:gap-2 sm:p-4 ${state}`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- a small stock icon */}
                {o.icon && <img src={o.icon} alt="" width={48} height={48} className="h-12 w-12 object-contain" />}
                <span className="text-base font-black italic leading-tight sm:text-lg">{picked && o.key === answer && <span className="text-success">✓ </span>}{o.label}</span>
                {/* The numbers only show once answered: knowing them is the game. */}
                {o.sub && picked && <span className="arcade-bump text-sm font-semibold">{o.sub}</span>}
              </button>
            );
          })}
        </div>
      </div>
      {picked && (
        <Reveal className="arcade-pop flex flex-wrap items-center gap-3" role="status">
          <p className="text-sm font-semibold">{right ? t("history.arcade.hl.right") : t("history.arcade.sets.wrong")} {explain}</p>
          {overTop && <p className="basis-full text-sm text-muted">{overTop}</p>}
          <button type="button" onClick={next} disabled={loading} autoFocus className="btn btn-md btn-inverse">{t(answers.length >= QUIZ_LENGTH ? "history.arcade.sets.results" : "history.arcade.hl.next")}</button>
        </Reveal>
      )}
      <details className="arcade-start-how">
        <summary>{t("history.arcade.fq.about")}</summary>
        <p className="mt-2 text-meta text-muted">{note}</p>
      </details>
    </div>
  );
}
