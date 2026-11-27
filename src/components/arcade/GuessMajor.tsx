"use client";
// Guess the major (the Arcade's daily puzzle): a real top 8, five tries to name the tournament. Each wrong
// guess says whether the answer was later or earlier and bigger or smaller. The guesses are kept in this
// browser only, so the day's puzzle is still there after a reload; nothing is sent to Smashy.
import Link from "next/link";
import { useMemo, useState } from "react";
import { showToast } from "@/components/ui/Toaster";
import { MAJOR_TRIES, majorHint, matchOptions, savedGuesses, shareSquares, type Compare, type MajorOption } from "@/lib/arcade";
import type { MessageKey } from "@/lib/i18n/base";
import { useT } from "@/lib/i18n/client";
import { useStoredState } from "@/lib/useStoredState";

const PLACES = [1, 2, 3, 4, 5, 5, 7, 7];
const YEAR: Record<Compare, MessageKey> = { higher: "history.arcade.major.later", lower: "history.arcade.major.earlier", same: "history.arcade.major.sameYear" };
const SIZE: Record<Compare, MessageKey> = { higher: "history.arcade.major.bigger", lower: "history.arcade.major.smaller", same: "history.arcade.major.sameSize" };
const ARROW: Record<Compare, string> = { higher: "↑", lower: "↓", same: "✓" };

export default function GuessMajor({ day, gameLabel, top8, answer, answerHref, options }: { day: number; gameLabel: string; top8: string[]; answer: MajorOption; answerHref: string; options: MajorOption[] }) {
  const t = useT();
  const [stored, setStored] = useStoredState("arcade.major", "");
  const [typed, setTyped] = useState("");
  const bySlug = useMemo(() => new Map(options.map((o) => [o.slug, o])), [options]);
  const guesses = useMemo(() => savedGuesses(stored, day).filter((s) => bySlug.has(s)).slice(0, MAJOR_TRIES), [stored, day, bySlug]);
  const rows = guesses.map((s) => bySlug.get(s)!);
  const won = guesses.includes(answer.slug);
  const done = won || guesses.length >= MAJOR_TRIES;
  const matches = matchOptions(options, typed, guesses);
  const guess = (slug: string) => {
    setStored(JSON.stringify({ day, guesses: [...guesses, slug] }));
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
        <p className="text-meta font-semibold text-muted">{t("history.arcade.major.number", { n: day, game: gameLabel })}</p>
        <h2 className="font-bold">{t("history.arcade.major.prompt")}</h2>
        <ol className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {top8.map((name, i) => (
            <li key={`${i}-${name}`} className="flex gap-2">
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
              <li key={g.slug} className={`card flex flex-wrap items-center gap-x-3 gap-y-1 p-3 text-sm ${hint.right ? "border-success" : ""}`}>
                <span className="font-semibold">{hint.right ? "🟩" : "🟥"} {g.name}</span>
                {!hint.right && (
                  <span className="flex flex-wrap gap-2 text-meta text-muted">
                    <span className="badge border border-line font-normal">{g.year} · {t(YEAR[hint.year])} {ARROW[hint.year]}</span>
                    {hint.entrants && g.entrants !== null && (
                      <span className="badge border border-line font-normal">{t("history.arcade.entrants", { n: g.entrants })} · {t(SIZE[hint.entrants])} {ARROW[hint.entrants]}</span>
                    )}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {done ? (
        <div className="card flex flex-col gap-3 p-4" role="status">
          <p className="font-bold">{won ? t("history.arcade.major.won", { n: guesses.length }) : t("history.arcade.major.lost")}</p>
          <p className="text-sm">
            {answer.name.includes(String(answer.year)) ? t("history.arcade.player.answer", { name: answer.name }) : t("history.arcade.major.answer", { name: answer.name, year: answer.year })}{" "}
            <Link href={answerHref} className="link font-semibold">{t("history.arcade.major.see")}</Link>
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={share} className="btn btn-md btn-inverse">{t("history.arcade.share")}</button>
            <Link href="/arcade" className="text-sm font-semibold text-brand">{t("history.arcade.more")}</Link>
          </div>
          <p className="text-meta text-muted">{t("history.arcade.tomorrow")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-meta text-muted">{t("history.arcade.major.triesLeft", { n: MAJOR_TRIES - guesses.length })}</span>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} maxLength={60} autoComplete="off" placeholder={t("history.arcade.major.placeholder")} className="field" />
          </label>
          {typed.trim() !== "" &&
            (matches.length ? (
              <ul className="card flex flex-col divide-y divide-line overflow-hidden">
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
