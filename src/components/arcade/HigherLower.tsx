"use client";
// Higher or lower (the Arcade's endless game): two majors of one game, and a question: which had more
// entrants, or which came first? A right answer adds to the streak; the best streak is kept in this browser.
import { useState } from "react";
import { showToast } from "@/components/ui/Toaster";
import { hlAnswer, hlRound, type HlMajor, type HlRound } from "@/lib/arcade";
import { GAMES } from "@/lib/games";
import { useT } from "@/lib/i18n/client";
import { useStoredState } from "@/lib/useStoredState";

export default function HigherLower({ pool, first }: { pool: HlMajor[]; first: HlRound }) {
  const t = useT();
  const [round, setRound] = useState(first);
  const [picked, setPicked] = useState<"a" | "b" | null>(null);
  const [streak, setStreak] = useState(0);
  const [bestStored, setBest] = useStoredState("arcade.hl.best", "0");
  const best = Number(bestStored) || 0;
  const right = hlAnswer(round);
  const pick = (side: "a" | "b") => {
    if (picked) return;
    setPicked(side);
    if (side === right) {
      setStreak(streak + 1);
      if (streak + 1 > best) setBest(String(streak + 1));
    }
  };
  const next = () => {
    if (picked !== right) setStreak(0);
    setRound(hlRound(pool, Math.random) ?? first);
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
  const side = (key: "a" | "b", m: HlMajor) => {
    const state = !picked ? "" : key === right ? "border-success" : key === picked ? "border-danger" : "";
    return (
      <button type="button" onClick={() => pick(key)} disabled={picked !== null} className={`card flex min-h-28 flex-1 flex-col items-center justify-center gap-1 p-4 text-center ${picked ? "" : "hover:bg-surface"} ${state}`}>
        <span className="font-bold">{picked && key === right && <span className="text-success">✓ </span>}{m.name}</span>
        <span className="text-meta text-muted">
          {GAMES[m.game].short}
          {(round.question === "entrants" || picked) && ` · ${m.year}`}
        </span>
        {picked && <span className="text-sm font-semibold">{t("history.arcade.entrants", { n: m.entrants })}</span>}
      </button>
    );
  };
  return (
    <div className="flex flex-col gap-4">
      <p className="flex gap-4 text-sm font-semibold">
        <span>{t("history.arcade.hl.streak", { n: streak })}</span>
        <span className="text-muted">{t("history.arcade.hl.best", { n: best })}</span>
      </p>
      <h2 className="text-lg font-bold">{t(round.question === "entrants" ? "history.arcade.hl.entrants" : "history.arcade.hl.first")}</h2>
      <div className="flex flex-col gap-3 sm:flex-row">
        {side("a", round.a)}
        {side("b", round.b)}
      </div>
      {picked && (
        <div className="flex flex-wrap items-center gap-3" role="status">
          <p className="text-sm font-semibold">{picked === right ? t("history.arcade.hl.right") : t("history.arcade.hl.wrong", { n: streak })}</p>
          <button type="button" onClick={next} className="btn btn-md btn-inverse">{t(picked === right ? "history.arcade.hl.next" : "history.arcade.hl.again")}</button>
          {picked !== right && streak > 0 && <button type="button" onClick={share} className="btn btn-md btn-outline">{t("history.arcade.share")}</button>}
        </div>
      )}
    </div>
  );
}
