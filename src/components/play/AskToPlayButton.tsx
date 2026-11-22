"use client";

import { useState, useTransition } from "react";
import { askToPlay } from "@/app/play/actions";
import { GAMES } from "@/lib/games";
import type { PlayGame } from "@/lib/playGames";
import { useT } from "@/lib/i18n/client";

/**
 * "Ask to play": sends them a "wants to play now" alert. With more than one game to pick from, a small
 * menu picks the game first.
 */
export default function AskToPlayButton({ to, games, className = "btn btn-sm btn-primary" }: { to: string; games: PlayGame[]; className?: string }) {
  const t = useT();
  const [game, setGame] = useState<PlayGame | undefined>(games[0]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  if (!game) return null;
  if (msg?.ok) return <span className="text-sm text-muted">{msg.text}</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {games.length > 1 && (
        <select value={game} onChange={(e) => setGame(e.target.value as PlayGame)} aria-label={t("playnow.ask.game")} className="rounded-full border border-line bg-field px-2 py-1 text-sm">
          {games.map((g) => <option key={g} value={g}>{GAMES[g].short}</option>)}
        </select>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await askToPlay(to, game);
            setMsg(res.error ? { ok: false, text: res.error } : { ok: true, text: t("playnow.ask.sent") });
          })
        }
        className={className}
      >
        {games.length > 1 ? t("playnow.ask.button") : t("playnow.ask.buttonGame", { game: GAMES[game].short })}
      </button>
      {msg && !msg.ok && <span className="text-sm text-danger">{msg.text}</span>}
    </span>
  );
}
