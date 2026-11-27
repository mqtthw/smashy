"use client";
// Higher or lower (the Arcade's endless game), as a chain since round 981 (Matthew: "needs to be relooked to be
// more interesting"). The left card shows its number; the right card's is hidden, and the player says higher or
// lower. A right answer reveals the number, then the right card slides over to the left and a new one comes in.
// Cards are famous players (major wins, top 8s) and big majors (entrants); the topic changes every five right
// answers and the numbers get closer as the streak grows. Rules in src/lib/arcade.ts; the best streak is kept in
// this browser.
import { useEffect, useRef, useState } from "react";
import { GAME_LOOK } from "@/components/arcade/ArcadeArt";
import { Confetti, CountUp, Reveal } from "@/components/arcade/ArcadeBits";
import { showToast } from "@/components/ui/Toaster";
import { hlIsHigher, hlNext, hlStart, hlStats, hlTopic, hlValue, type HlCard, type HlStat } from "@/lib/arcade";
import { GAMES } from "@/lib/games";
import type { MessageKey } from "@/lib/i18n/base";
import { useT } from "@/lib/i18n/client";
import { useStoredState } from "@/lib/useStoredState";

type Start = { stat: HlStat; left: HlCard; right: HlCard };
const QUESTION: Record<HlStat, MessageKey> = { entrants: "history.arcade.hl.q.entrants", wins: "history.arcade.hl.q.wins", top8s: "history.arcade.hl.q.top8s" };
const WORD: Record<HlStat, MessageKey> = { entrants: "history.arcade.hl.entrantsWord", wins: "history.arcade.hl.winsWord", top8s: "history.arcade.hl.top8sWord" };
const SLIDE_MS = 1300; // how long a right answer's number shows before the next card comes in

export default function HigherLower({ pool, first }: { pool: HlCard[]; first: Start }) {
  const t = useT();
  const [deal, setDeal] = useState(first);
  const [used, setUsed] = useState<string[]>([first.left.id, first.right.id]);
  const [turn, setTurn] = useState(0);
  const [phase, setPhase] = useState<"guess" | "right" | "lost">("guess");
  const [guess, setGuess] = useState<"higher" | "lower" | null>(null);
  const [streak, setStreak] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const [newTopic, setNewTopic] = useState(false);
  const [bestStored, setBest] = useStoredState("arcade.hl.best", "0");
  const best = Number(bestStored) || 0;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const { stat, left, right } = deal;
  const word = t(WORD[stat]);

  const restart = () => {
    const fresh = hlStart(pool, Math.random) ?? first;
    setDeal(fresh);
    setUsed([fresh.left.id, fresh.right.id]);
    setStreak(0);
    setNewBest(false);
    setNewTopic(false);
    setTurn((x) => x + 1);
    setGuess(null);
    setPhase("guess");
  };

  /** The next pair after `n` right answers: the right card moves over, or a fresh pair on a new topic. */
  const advance = (n: number) => {
    const nextStat = hlTopic(hlStats(pool), stat, n, Math.random);
    const seen = new Set(used);
    const pickFrom = (current: HlCard | null) => hlNext(pool, nextStat, current, seen, n, Math.random) ?? hlNext(pool, nextStat, current, new Set(), n, Math.random);
    const shown = nextStat === stat ? right : pickFrom(null);
    const next = shown && pickFrom(shown);
    if (!shown || !next) return restart();
    setDeal({ stat: nextStat, left: shown, right: next });
    setUsed([...used, shown.id, next.id].slice(-120));
    setNewTopic(nextStat !== stat);
    setTurn((x) => x + 1);
    setGuess(null);
    setPhase("guess");
  };

  const pick = (call: "higher" | "lower") => {
    if (phase !== "guess") return;
    setGuess(call);
    if ((call === "higher") !== hlIsHigher(left, right, stat)) {
      setPhase("lost");
      return;
    }
    const n = streak + 1;
    setStreak(n);
    setPhase("right");
    if (n > best) {
      setBest(String(n));
      setNewBest(true);
    }
    timer.current = setTimeout(() => advance(n), SLIDE_MS);
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(`${t("history.arcade.hl.shareText", { n: streak })}\nhttps://smashy.gg/arcade/higher-lower`);
      showToast(t("ui.copied"));
    } catch {
      showToast(t("ui.shareFailed"));
    }
  };

  const sub = (c: HlCard) => (c.year === null ? t("history.arcade.hl.playerOf", { game: GAMES[c.game].short }) : `${GAMES[c.game].short} · ${c.year}`);
  const number = (c: HlCard, count: boolean) => (
    <span className="flex flex-col items-center leading-tight">
      <span className="text-3xl font-black tabular-nums sm:text-4xl">{count ? <CountUp to={hlValue(c, stat) ?? 0} /> : hlValue(c, stat)}</span>
      <span className="text-meta text-muted">{word}</span>
    </span>
  );
  const revealed = phase !== "guess";
  const rightState = phase === "right" ? "arcade-right" : phase === "lost" ? "arcade-wrong" : "";

  return (
    <div className="relative flex flex-col gap-4" style={{ "--tile": GAME_LOOK.hl.color } as React.CSSProperties}>
      {newBest && phase === "right" && <Confetti key={streak} />}
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold">
        <span className="text-base">
          <span key={streak} className={streak > 0 ? "arcade-bump" : undefined}>{streak >= 3 ? "🔥" : "⚡"}</span> {t("history.arcade.hl.streak", { n: streak })}
        </span>
        <span className="text-muted">{t("history.arcade.hl.best", { n: best })}</span>
        {newBest && <span className="arcade-pop badge border border-success text-success">{t("history.arcade.hl.newBest")}</span>}
      </p>
      <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold">
        {t(QUESTION[stat])}
        {newTopic && phase === "guess" && <span key={turn} className="arcade-pop badge border border-[var(--tile)] text-[var(--tile)]">{t("history.arcade.hl.newTopic")}</span>}
      </h2>
      <div key={turn} className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-1.5 sm:gap-3">
        <div className="arcade-side arcade-pop card flex min-h-40 min-w-0 flex-col items-center justify-center gap-2 p-2.5 text-center sm:p-4">
          <span className="break-words text-base font-bold leading-tight sm:text-lg">{left.name}</span>
          <span className="text-meta text-muted">{sub(left)}</span>
          {number(left, false)}
        </div>
        <span aria-hidden="true" className="arcade-vs">VS</span>
        <div className={`arcade-side arcade-pop card flex min-h-40 min-w-0 flex-col items-center justify-center gap-2 p-2.5 text-center sm:p-4 ${rightState}`}>
          <span className="break-words text-base font-bold leading-tight sm:text-lg">{right.name}</span>
          <span className="text-meta text-muted">{sub(right)}</span>
          {revealed ? (
            number(right, true)
          ) : (
            <span className="flex w-full flex-col gap-1.5 sm:max-w-40">
              <button type="button" onClick={() => pick("higher")} className="btn btn-md btn-inverse w-full">▲ {t("history.arcade.hl.higher")}</button>
              <button type="button" onClick={() => pick("lower")} className="btn btn-md btn-outline w-full">▼ {t("history.arcade.hl.lower")}</button>
            </span>
          )}
          {guess && revealed && <span className="sr-only">{t(guess === "higher" ? "history.arcade.hl.higher" : "history.arcade.hl.lower")}</span>}
        </div>
      </div>
      {phase === "right" && (
        <p className="arcade-pop text-sm font-semibold text-success" role="status">{t("history.arcade.hl.right")}</p>
      )}
      {phase === "lost" && (
        <Reveal className="arcade-pop flex flex-wrap items-center gap-3" role="status">
          <p className="text-sm font-semibold">{streak > 0 ? t("history.arcade.hl.wrong", { n: streak }) : t("history.arcade.hl.wrongZero")}</p>
          <button type="button" onClick={restart} autoFocus className="btn btn-md btn-inverse">{t("history.arcade.hl.again")}</button>
          {streak > 0 && <button type="button" onClick={share} className="btn btn-md btn-outline">{t("history.arcade.share")}</button>}
        </Reveal>
      )}
    </div>
  );
}
