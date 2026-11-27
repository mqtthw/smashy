"use client";
// Guess the major (the Arcade's daily puzzle): a real top 8, five tries to name the tournament. Each wrong
// guess says whether the answer was later or earlier and bigger or smaller. The guesses and the streak of
// solved days are kept in this browser only, so the day's puzzle is still there after a reload; nothing is
// sent to Smashy. Round 945 made it move: guesses pop in, hints flip, a miss shakes, a win throws confetti.
import Link from "next/link";
import { useMemo, useState } from "react";
import { Confetti, NextPuzzle, Pips } from "@/components/arcade/ArcadeBits";
import { showToast } from "@/components/ui/Toaster";
import { MAJOR_TRIES, addResult, majorHint, matchOptions, readStats, savedGuesses, shareSquares, type Compare, type MajorOption } from "@/lib/arcade";
import type { MessageKey } from "@/lib/i18n/base";
import { useT } from "@/lib/i18n/client";
import { useStoredState } from "@/lib/useStoredState";

const PLACES = [1, 2, 3, 4, 5, 5, 7, 7];
const YEAR: Record<Compare, MessageKey> = { higher: "history.arcade.major.later", lower: "history.arcade.major.earlier", same: "history.arcade.major.sameYear" };
const SIZE: Record<Compare, MessageKey> = { higher: "history.arcade.major.bigger", lower: "history.arcade.major.smaller", same: "history.arcade.major.sameSize" };
const ARROW: Record<Compare, string> = { higher: "↑", lower: "↓", same: "✓" };
const chip = (same: boolean) => `arcade-flip badge border font-normal ${same ? "border-success text-success" : "border-line"}`;
const at = (i: number) => ({ "--i": i }) as React.CSSProperties;

export default function GuessMajor({ day, gameLabel, top8, answer, answerHref, options }: { day: number; gameLabel: string; top8: string[]; answer: MajorOption; answerHref: string; options: MajorOption[] }) {
  const t = useT();
  const [stored, setStored] = useStoredState("arcade.major", "");
  const [statsStored, setStats] = useStoredState("arcade.major.stats", "");
  const [typed, setTyped] = useState("");
  const bySlug = useMemo(() => new Map(options.map((o) => [o.slug, o])), [options]);
  const guesses = useMemo(() => savedGuesses(stored, day).filter((s) => bySlug.has(s)).slice(0, MAJOR_TRIES), [stored, day, bySlug]);
  const rows = guesses.map((s) => bySlug.get(s)!);
  const won = guesses.includes(answer.slug);
  const done = won || guesses.length >= MAJOR_TRIES;
  const stats = readStats(statsStored);
  const matches = matchOptions(options, typed, guesses);
  const guess = (slug: string) => {
    const next = [...guesses, slug];
    setStored(JSON.stringify({ day, guesses: next }));
    if (slug === answer.slug || next.length >= MAJOR_TRIES) setStats(JSON.stringify(addResult(stats, day, slug === answer.slug)));
    setTyped("");
  };
  const share = async () => {
    const text = `${t("history.arcade.major.title")} #${day}\n${shareSquares(guesses.map((s) => s === answer.slug), MAJOR_TRIES)}\nhttps://smashy.gg/arcade/major`;
    try {
      await navigator.clipboard.writeText(text);
      showToast(t("ui.copied"));
    } catch {
      showToast(t("ui.shareFailed"));
    }
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-meta font-semibold text-muted">{t("history.arcade.major.number", { n: day, game: gameLabel })}</p>
          <Pips results={guesses.map((s) => s === answer.slug)} total={MAJOR_TRIES} />
        </div>
        <h2 className="font-bold">{t("history.arcade.major.prompt")}</h2>
        <ol className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {top8.map((name, i) => (
            <li key={`${i}-${name}`} className="arcade-flip flex gap-2" style={at(i * 0.5)}>
              <span className="w-5 shrink-0 text-right font-semibold tabular-nums text-muted">{PLACES[i] ?? i + 1}</span>
              <span className="min-w-0 truncate">{name}</span>
            </li>
          ))}
        </ol>
      </div>

      {rows.length > 0 && (
        <ul className="flex flex-col gap-2">
          {rows.map((g) => {
            const hint = majorHint(g, answer);
            return (
              <li key={g.slug} className={`card flex flex-wrap items-center gap-x-3 gap-y-1 p-3 text-sm ${hint.right ? "arcade-pop arcade-right" : "arcade-shake"}`}>
                <span className="font-semibold">{hint.right ? "🟩" : "🟥"} {g.name}</span>
                {!hint.right && (
                  <span className="flex flex-wrap gap-2 text-meta">
                    <span className={chip(hint.year === "same")} style={at(1)}>{g.year} · {t(YEAR[hint.year])} {ARROW[hint.year]}</span>
                    {hint.entrants && g.entrants !== null && (
                      <span className={chip(hint.entrants === "same")} style={at(2)}>{t("history.arcade.entrants", { n: g.entrants })} · {t(SIZE[hint.entrants])} {ARROW[hint.entrants]}</span>
                    )}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {done ? (
        <div className="arcade-pop card relative flex flex-col gap-3 p-4" role="status">
          {won && <Confetti />}
          <p className="text-lg font-bold">{won ? t("history.arcade.major.won", { n: guesses.length }) : t("history.arcade.major.lost")}</p>
          <p className="text-sm">
            {answer.name.includes(String(answer.year)) ? t("history.arcade.player.answer", { name: answer.name }) : t("history.arcade.major.answer", { name: answer.name, year: answer.year })}{" "}
            <Link href={answerHref} className="link font-semibold">{t("history.arcade.major.see")}</Link>
          </p>
          {stats.streak > 0 && stats.last === day && <p className="text-sm font-semibold"><span className="arcade-bump">🔥</span> {t("history.arcade.streak", { n: stats.streak })} <span className="font-normal text-muted">· {t("history.arcade.streakBest", { n: stats.best })}</span></p>}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={share} className="btn btn-md btn-inverse">{t("history.arcade.share")}</button>
            <Link href="/arcade" className="text-sm font-semibold text-brand">{t("history.arcade.more")}</Link>
          </div>
          <NextPuzzle />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-meta text-muted">{t("history.arcade.major.triesLeft", { n: MAJOR_TRIES - guesses.length })}</span>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} maxLength={60} autoComplete="off" placeholder={t("history.arcade.major.placeholder")} className="field" />
          </label>
          {typed.trim() !== "" &&
            (matches.length ? (
              <ul className="arcade-pop card flex flex-col divide-y divide-line overflow-hidden">
                {matches.map((o) => (
                  <li key={o.slug}>
                    <button type="button" onClick={() => guess(o.slug)} className="w-full px-3 py-2 text-left text-sm hover:bg-surface">{o.name}</button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">{t("history.arcade.major.none")}</p>
            ))}
        </div>
      )}
    </div>
  );
}
