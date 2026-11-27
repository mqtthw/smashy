"use client";
// Guess the player (the Arcade's second daily puzzle): a mystery player from one game's major results, six
// tries. Each guess shows that player's own numbers with an arrow towards the answer's. The guesses and the
// streak of solved days are kept in this browser only. Moves like Guess the major (round 945).
import Link from "next/link";
import { useMemo, useState } from "react";
import { Confetti, NextPuzzle, Pips } from "@/components/arcade/ArcadeBits";
import { showToast } from "@/components/ui/Toaster";
import { PLAYER_TRIES, addResult, matchOptions, playerHint, readStats, savedGuesses, shareSquares, type Compare, type PlayerOption } from "@/lib/arcade";
import { useT } from "@/lib/i18n/client";
import { useStoredState } from "@/lib/useStoredState";

const ARROW: Record<Compare, string> = { higher: "↑", lower: "↓", same: "✓" };
const tone = (same: boolean) => `arcade-flip badge border font-normal ${same ? "border-success text-success" : "border-line"}`;
const at = (i: number) => ({ "--i": i }) as React.CSSProperties;

export default function GuessPlayer({ day, gameLabel, answer, answerHref, options }: { day: number; gameLabel: string; answer: PlayerOption; answerHref: string; options: PlayerOption[] }) {
  const t = useT();
  const [stored, setStored] = useStoredState("arcade.player", "");
  const [statsStored, setStats] = useStoredState("arcade.player.stats", "");
  const [typed, setTyped] = useState("");
  const bySlug = useMemo(() => new Map(options.map((o) => [o.slug, o])), [options]);
  const guesses = useMemo(() => savedGuesses(stored, day).filter((s) => bySlug.has(s)).slice(0, PLAYER_TRIES), [stored, day, bySlug]);
  const won = guesses.includes(answer.slug);
  const done = won || guesses.length >= PLAYER_TRIES;
  const stats = readStats(statsStored);
  const matches = matchOptions(options, typed, guesses);
  const guess = (slug: string) => {
    const next = [...guesses, slug];
    setStored(JSON.stringify({ day, guesses: next }));
    if (slug === answer.slug || next.length >= PLAYER_TRIES) setStats(JSON.stringify(addResult(stats, day, slug === answer.slug)));
    setTyped("");
  };
  const share = async () => {
    const text = `${t("history.arcade.player.title")} #${day}\n${shareSquares(guesses.map((s) => s === answer.slug), PLAYER_TRIES)}\nhttps://smashy.gg/arcade/player`;
    try {
      await navigator.clipboard.writeText(text);
      showToast(t("ui.copied"));
    } catch {
      showToast(t("ui.shareFailed"));
    }
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-meta font-semibold text-muted">{t("history.arcade.major.number", { n: day, game: gameLabel })}</p>
          <Pips results={guesses.map((s) => s === answer.slug)} total={PLAYER_TRIES} />
        </div>
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="arcade-glyph" style={{ "--tile": "#ff6b5e" } as React.CSSProperties}>{done ? "!" : "?"}</span>
          <h2 className="font-bold">{t("history.arcade.player.prompt", { game: gameLabel })}</h2>
        </div>
        <p className="text-meta text-muted">{t("history.arcade.player.legend")}</p>
      </div>

      {guesses.length > 0 && (
        <ul className="flex flex-col gap-2">
          {guesses.map((slug) => {
            const g = bySlug.get(slug)!;
            const hint = playerHint(g, answer);
            return (
              <li key={g.slug} className={`card flex flex-col gap-2 p-3 text-sm ${hint.right ? "arcade-pop arcade-right" : "arcade-shake"}`}>
                <span className="font-semibold">{hint.right ? "🟩" : "🟥"} {g.name}</span>
                {!hint.right && (
                  <span className="flex flex-wrap gap-2 text-meta">
                    <span className={tone(hint.wins === "same")} style={at(1)}>{t("history.arcade.player.wins", { n: g.wins })} {ARROW[hint.wins]}</span>
                    <span className={tone(hint.top8s === "same")} style={at(2)}>{t("history.arcade.player.top8s", { n: g.top8s })} {ARROW[hint.top8s]}</span>
                    <span className={tone(hint.firstYear === "same")} style={at(3)}>{t("history.arcade.player.first", { n: g.firstYear })} {ARROW[hint.firstYear]}</span>
                    <span className={tone(hint.lastYear === "same")} style={at(4)}>{t("history.arcade.player.last", { n: g.lastYear })} {ARROW[hint.lastYear]}</span>
                    {hint.main !== null && g.mainName && (
                      <span className={`${tone(hint.main)} inline-flex items-center gap-1`} style={at(5)}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- a 16px stock icon */}
                        {g.mainIcon && <img src={g.mainIcon} alt="" width={16} height={16} className="h-4 w-4 object-contain" />}
                        {t("history.arcade.player.main", { name: g.mainName })} {hint.main ? "✓" : "✗"}
                      </span>
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
            {t("history.arcade.player.answer", { name: answer.name })}{" "}
            <Link href={answerHref} className="link font-semibold">{t("history.arcade.player.see")}</Link>
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
            <span className="text-meta text-muted">{t("history.arcade.major.triesLeft", { n: PLAYER_TRIES - guesses.length })}</span>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} maxLength={40} autoComplete="off" placeholder={t("history.arcade.player.placeholder")} className="field" />
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
              <p className="text-sm text-muted">{t("history.arcade.player.none")}</p>
            ))}
        </div>
      )}
    </div>
  );
}
