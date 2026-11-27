"use client";
// Higher or lower (the Arcade's endless game): two majors of one game face each other across a "VS", and a
// question: which had more entrants, or which came first? A right answer adds to the streak; the best streak
// is kept in this browser. Round 945: the numbers count up when revealed, the streak bumps, and a new best
// throws confetti.
import { useState } from "react";
import { GAME_LOOK } from "@/components/arcade/ArcadeArt";
import { Confetti, CountUp } from "@/components/arcade/ArcadeBits";
import { showToast } from "@/components/ui/Toaster";
import { hlAnswer, hlRound, type HlMajor, type HlRound } from "@/lib/arcade";
import { GAMES } from "@/lib/games";
import { useT } from "@/lib/i18n/client";
import { useStoredState } from "@/lib/useStoredState";

export default function HigherLower({ pool, first }: { pool: HlMajor[]; first: HlRound }) {
  const t = useT();
  const [round, setRound] = useState(first);
  const [turn, setTurn] = useState(0);
  const [picked, setPicked] = useState<"a" | "b" | null>(null);
  const [streak, setStreak] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const [bestStored, setBest] = useStoredState("arcade.hl.best", "0");
  const best = Number(bestStored) || 0;
  const right = hlAnswer(round);
  const pick = (side: "a" | "b") => {
    if (picked) return;
    setPicked(side);
    if (side === right) {
      setStreak(streak + 1);
      if (streak + 1 > best) {
        setBest(String(streak + 1));
        setNewBest(true);
      }
    }
  };
  const next = () => {
    if (picked !== right) {
      setStreak(0);
      setNewBest(false);
    }
    setRound(hlRound(pool, Math.random) ?? first);
    setTurn(turn + 1);
    setPicked(null);
  };
  const share = async () => {
    try {
      await navigator.clipboard.writeText(`${t("history.arcade.hl.shareText", { n: streak })}\nhttps://smashy.gg/arcade/higher-lower`);
      showToast(t("ui.copied"));
    } catch {
      showToast(t("ui.shareFailed"));
    }
  };
  const lost = picked !== null && picked !== right;
  const side = (key: "a" | "b", m: HlMajor) => {
    const state = !picked ? "" : key === right ? "arcade-right" : key === picked ? "arcade-wrong" : "";
    return (
      <button type="button" onClick={() => pick(key)} disabled={picked !== null} className={`arcade-side arcade-pop card arcade-answer flex min-h-32 flex-1 flex-col items-center justify-center gap-1 p-4 text-center ${state}`}>
        <span className="text-lg font-bold">{picked && key === right && <span className="text-success">✓ </span>}{m.name}</span>
        <span className="text-meta text-muted">
          {GAMES[m.game].short}
          {(round.question === "entrants" || picked) && ` · ${m.year}`}
        </span>
        {picked && <span className="text-sm font-semibold"><CountUp to={m.entrants} /> {t("history.arcade.hl.entrantsWord")}</span>}
      </button>
    );
  };
  return (
    <div className="relative flex flex-col gap-4" style={{ "--tile": GAME_LOOK.hl.color } as React.CSSProperties}>
      {newBest && picked === right && <Confetti key={streak} />}
      <p className="flex items-center gap-4 text-sm font-semibold">
        <span className="text-base">
          <span key={streak} className={streak > 0 ? "arcade-bump" : undefined}>{streak >= 3 ? "🔥" : "⚡"}</span> {t("history.arcade.hl.streak", { n: streak })}
        </span>
        <span className="text-muted">{t("history.arcade.hl.best", { n: best })}</span>
        {newBest && <span className="arcade-pop badge border border-success text-success">{t("history.arcade.hl.newBest")}</span>}
      </p>
      <h2 className="text-lg font-bold">{t(round.question === "entrants" ? "history.arcade.hl.entrants" : "history.arcade.hl.first")}</h2>
      <div key={turn} className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        {side("a", round.a)}
        <span aria-hidden="true" className="arcade-vs">VS</span>
        {side("b", round.b)}
      </div>
      {picked && (
        <div className="arcade-pop flex flex-wrap items-center gap-3" role="status">
          <p className="text-sm font-semibold">{lost ? t("history.arcade.hl.wrong", { n: streak }) : t("history.arcade.hl.right")}</p>
          <button type="button" onClick={next} autoFocus className="btn btn-md btn-inverse">{t(lost ? "history.arcade.hl.again" : "history.arcade.hl.next")}</button>
          {lost && streak > 0 && <button type="button" onClick={share} className="btn btn-md btn-outline">{t("history.arcade.share")}</button>}
        </div>
      )}
    </div>
  );
}
