"use client";
// Guess the player (the Arcade's second daily puzzle): a mystery player from one game's major results, six
// tries. Each guess shows that player's own numbers with an arrow towards the answer's. The guesses are kept
// in this browser only.
import Link from "next/link";
import { useMemo, useState } from "react";
import { showToast } from "@/components/ui/Toaster";
import { PLAYER_TRIES, matchOptions, playerHint, savedGuesses, shareSquares, type Compare, type PlayerOption } from "@/lib/arcade";
import { useT } from "@/lib/i18n/client";
import { useStoredState } from "@/lib/useStoredState";

const ARROW: Record<Compare, string> = { higher: "↑", lower: "↓", same: "✓" };
const tone = (same: boolean) => `badge border font-normal ${same ? "border-success text-success" : "border-line"}`;

export default function GuessPlayer({ day, gameLabel, answer, answerHref, options }: { day: number; gameLabel: string; answer: PlayerOption; answerHref: string; options: PlayerOption[] }) {
  const t = useT();
  const [stored, setStored] = useStoredState("arcade.player", "");
  const [typed, setTyped] = useState("");
  const bySlug = useMemo(() => new Map(options.map((o) => [o.slug, o])), [options]);
  const guesses = useMemo(() => savedGuesses(stored, day).filter((s) => bySlug.has(s)).slice(0, PLAYER_TRIES), [stored, day, bySlug]);
  const won = guesses.includes(answer.slug);
  const done = won || guesses.length >= PLAYER_TRIES;
  const matches = matchOptions(options, typed, guesses);
  const guess = (slug: string) => {
    setStored(JSON.stringify({ day, guesses: [...guesses, slug] }));
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
        <p className="text-meta font-semibold text-muted">{t("history.arcade.major.number", { n: day, game: gameLabel })}</p>
        <h2 className="font-bold">{t("history.arcade.player.prompt", { game: gameLabel })}</h2>
        <p className="text-meta text-muted">{t("history.arcade.player.legend")}</p>
      </div>

      {guesses.length > 0 && (
        <ul className="flex flex-col gap-2">
          {guesses.map((slug) => {
            const g = bySlug.get(slug)!;
            const hint = playerHint(g, answer);
            return (
              <li key={g.slug} className={`card flex flex-col gap-2 p-3 text-sm ${hint.right ? "border-success" : ""}`}>
                <span className="font-semibold">{hint.right ? "🟩" : "🟥"} {g.name}</span>
                {!hint.right && (
                  <span className="flex flex-wrap gap-2 text-meta">
                    <span className={tone(hint.wins === "same")}>{t("history.arcade.player.wins", { n: g.wins })} {ARROW[hint.wins]}</span>
                    <span className={tone(hint.top8s === "same")}>{t("history.arcade.player.top8s", { n: g.top8s })} {ARROW[hint.top8s]}</span>
                    <span className={tone(hint.firstYear === "same")}>{t("history.arcade.player.first", { n: g.firstYear })} {ARROW[hint.firstYear]}</span>
                    <span className={tone(hint.lastYear === "same")}>{t("history.arcade.player.last", { n: g.lastYear })} {ARROW[hint.lastYear]}</span>
                    {hint.main !== null && g.mainName && <span className={tone(hint.main)}>{t("history.arcade.player.main", { name: g.mainName })} {hint.main ? "✓" : "✗"}</span>}
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
            {t("history.arcade.player.answer", { name: answer.name })}{" "}
            <Link href={answerHref} className="link font-semibold">{t("history.arcade.player.see")}</Link>
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
            <span className="text-meta text-muted">{t("history.arcade.major.triesLeft", { n: PLAYER_TRIES - guesses.length })}</span>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} maxLength={40} autoComplete="off" placeholder={t("history.arcade.player.placeholder")} className="field" />
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
              <p className="text-sm text-muted">{t("history.arcade.player.none")}</p>
            ))}
        </div>
      )}
    </div>
  );
}
