"use client";
// Who won this set? (the Arcade): ten real finals sets from majors, one at a time, the two players facing
// each other across a "VS" with the characters they played. Pick the winner, see the score, and get a score
// out of ten at the end, greeted by how it went. "Play again" asks the server for ten more. The best score is
// kept in this browser.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GAME_LOOK } from "@/components/arcade/ArcadeArt";
import { Confetti, Pips, Reveal } from "@/components/arcade/ArcadeBits";
import NewTab from "@/components/ui/NewTab";
import { showToast } from "@/components/ui/Toaster";
import { setsRank, setsShare, type ArcadeSet, type SetSide, type SetsRank } from "@/lib/arcade";
import { GAMES } from "@/lib/games";
import type { MessageKey } from "@/lib/i18n/base";
import { useT } from "@/lib/i18n/client";
import { useStoredState } from "@/lib/useStoredState";

const RANK: Record<SetsRank, MessageKey> = { perfect: "history.arcade.sets.rank.perfect", top8: "history.arcade.sets.rank.top8", pools: "history.arcade.sets.rank.pools", out: "history.arcade.sets.rank.out" };

export default function WhoWon({ sets }: { sets: ArcadeSet[] }) {
  const t = useT();
  const router = useRouter();
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [picked, setPicked] = useState<"a" | "b" | null>(null);
  const [bestStored, setBest] = useStoredState("arcade.sets.best", "0");
  const best = Number(bestStored) || 0;
  const at = Math.min(picked ? answers.length - 1 : answers.length, sets.length - 1);
  const set = sets[at];
  const finished = answers.length >= sets.length && !picked;
  const score = answers.filter(Boolean).length;
  const pick = (side: "a" | "b") => {
    if (picked) return;
    const next = [...answers, side === set.winner];
    setPicked(side);
    setAnswers(next);
    if (next.length >= sets.length && next.filter(Boolean).length > best) setBest(String(next.filter(Boolean).length));
  };
  const share = async () => {
    try {
      await navigator.clipboard.writeText(`${t("history.arcade.sets.title")}\n${setsShare(answers)}\nhttps://smashy.gg/arcade/sets`);
      showToast(t("ui.copied"));
    } catch {
      showToast(t("ui.shareFailed"));
    }
  };
  const again = () => {
    setAnswers([]);
    setPicked(null);
    router.refresh(); // ten new sets
  };
  if (finished) {
    const rank = setsRank(score, answers.length);
    return (
      // Round 972: a score card like the quizzes' end screen.
      <div className="arcade-pop arcade-start relative flex flex-col gap-4 p-4 sm:p-5" role="status" style={{ "--tile": GAME_LOOK.sets.color } as React.CSSProperties}>
        {(rank === "perfect" || rank === "top8") && <Confetti />}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-5xl font-black italic tabular-nums leading-none"><span className="arcade-bump">{score}</span><span className="text-2xl text-muted">/{answers.length}</span></p>
            <p className="mt-1 text-lg font-bold">{t(RANK[rank])}</p>
          </div>
          <Pips results={answers} total={answers.length} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={again} autoFocus className="arcade-promo-btn arcade-start-play">{t("history.arcade.hl.again")} →</button>
          <span className="arcade-start-best">★ {t("history.arcade.sets.best", { n: Math.max(best, score), total: answers.length })}</span>
          <button type="button" onClick={share} className="btn btn-md btn-outline">{t("history.arcade.share")}</button>
        </div>
      </div>
    );
  }
  const side = (key: "a" | "b", s: SetSide) => {
    const state = !picked ? "" : key === set.winner ? "arcade-right" : key === picked ? "arcade-wrong" : "";
    return (
      <button type="button" onClick={() => pick(key)} disabled={picked !== null} className={`arcade-side arcade-pop card arcade-answer flex min-h-28 min-w-0 flex-col items-center justify-center gap-2 p-2.5 text-center sm:min-h-32 sm:p-4 ${state}`}>
        {s.icons.length > 0 && (
          <span className="flex items-center gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element -- small stock icons */}
            {s.icons.map((src) => <img key={src} src={src} alt="" width={28} height={28} className="h-7 w-7 object-contain" />)}
          </span>
        )}
        <span className="break-words text-base font-bold leading-tight sm:text-lg">{picked && key === set.winner && <span className="text-success">✓ </span>}{s.name}</span>
        {s.characters.length > 0 && <span className="text-meta text-muted">{s.characters.join(", ")}</span>}
        {picked && <span className="arcade-bump text-3xl font-black italic tabular-nums">{s.score}</span>}
      </button>
    );
  };
  return (
    <div className="flex flex-col gap-4" style={{ "--tile": GAME_LOOK.sets.color } as React.CSSProperties}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-meta font-semibold text-muted">{t("history.arcade.sets.progress", { n: at + 1, total: sets.length })}</p>
        <Pips results={answers} total={sets.length} />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold">{set.major}{!set.major.includes(String(set.year)) && ` (${set.year})`}</h2>
        <p className="text-sm text-muted">{GAMES[set.game].short} · {set.round}</p>
      </div>
      <div key={set.id} className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-1.5 sm:gap-3">
        {side("a", set.a)}
        <span aria-hidden="true" className="arcade-vs">VS</span>
        {side("b", set.b)}
      </div>
      {picked && (
        <Reveal className="arcade-pop flex flex-wrap items-center gap-3" role="status">
          <p className="text-sm font-semibold">{answers.at(-1) ? t("history.arcade.hl.right") : t("history.arcade.sets.wrong")} {t("history.arcade.sets.thisSet", { winner: set[set.winner].name, round: set.round })}</p>
          <button type="button" onClick={() => setPicked(null)} autoFocus className="btn btn-md btn-inverse">{t(answers.length >= sets.length ? "history.arcade.sets.results" : "history.arcade.hl.next")}</button>
          {/* The tournament itself, to check a result that looks wrong (round 956: a winners final lost by the player
              who went on to win the tournament). A new tab, so the round isn't lost. */}
          <a href={set.href} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand">{t("history.arcade.sets.bracket")} ↗︎<NewTab /></a>
        </Reveal>
      )}
    </div>
  );
}
