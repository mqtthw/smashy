"use client";
// Who won this set? (the Arcade): ten real finals sets from majors, one at a time. Pick the winner, see the
// score, and get a score out of ten at the end. "Play again" asks the server for ten more.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { showToast } from "@/components/ui/Toaster";
import { setsShare, type ArcadeSet, type SetSide } from "@/lib/arcade";
import { GAMES } from "@/lib/games";
import { useT } from "@/lib/i18n/client";

export default function WhoWon({ sets }: { sets: ArcadeSet[] }) {
  const t = useT();
  const router = useRouter();
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [picked, setPicked] = useState<"a" | "b" | null>(null);
  const at = Math.min(picked ? answers.length - 1 : answers.length, sets.length - 1);
  const set = sets[at];
  const finished = answers.length >= sets.length && !picked;
  const pick = (side: "a" | "b") => {
    if (picked) return;
    setPicked(side);
    setAnswers([...answers, side === set.winner]);
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
    return (
      <div className="card flex flex-col gap-3 p-4" role="status">
        <p className="text-lg font-bold">{t("history.arcade.sets.result", { n: answers.filter(Boolean).length, total: answers.length })}</p>
        <p aria-hidden="true">{setsShare(answers).split(" ")[0]}</p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={again} className="btn btn-md btn-inverse">{t("history.arcade.hl.again")}</button>
          <button type="button" onClick={share} className="btn btn-md btn-outline">{t("history.arcade.share")}</button>
        </div>
      </div>
    );
  }
  const side = (key: "a" | "b", s: SetSide) => {
    const state = !picked ? "" : key === set.winner ? "border-success" : key === picked ? "border-danger" : "";
    return (
      <button type="button" onClick={() => pick(key)} disabled={picked !== null} className={`card flex min-h-24 flex-1 flex-col items-center justify-center gap-1 p-4 text-center ${picked ? "" : "hover:bg-surface"} ${state}`}>
        <span className="font-bold">{picked && key === set.winner && <span className="text-success">✓ </span>}{s.name}</span>
        {s.characters.length > 0 && <span className="text-meta text-muted">{s.characters.join(", ")}</span>}
        {picked && <span className="text-xl font-bold tabular-nums">{s.score}</span>}
      </button>
    );
  };
  return (
    <div className="flex flex-col gap-4">
      <p className="text-meta font-semibold text-muted">{t("history.arcade.sets.progress", { n: at + 1, total: sets.length })}</p>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold">{set.major}{!set.major.includes(String(set.year)) && ` (${set.year})`}</h2>
        <p className="text-sm text-muted">{GAMES[set.game].short} · {set.round}</p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        {side("a", set.a)}
        {side("b", set.b)}
      </div>
      {picked && (
        <div className="flex flex-wrap items-center gap-3" role="status">
          <p className="text-sm font-semibold">{answers.at(-1) ? t("history.arcade.hl.right") : t("history.arcade.sets.wrong")}</p>
          <button type="button" onClick={() => setPicked(null)} className="btn btn-md btn-inverse">{t(answers.length >= sets.length ? "history.arcade.sets.results" : "history.arcade.hl.next")}</button>
        </div>
      )}
    </div>
  );
}
