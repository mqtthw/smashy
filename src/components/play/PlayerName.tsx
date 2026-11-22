"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { playerCard } from "@/app/play/actions";
import type { PlayGame } from "@/lib/playGames";
import { useT } from "@/lib/i18n/client";
import AskToPlayButton from "./AskToPlayButton";

/** A name in room chat: tap it for a small card (their profile, and "Ask to play" in a game's room). */
export default function PlayerName({ id, tag, game, mine }: { id: string; tag: string; game: PlayGame | null; mine: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [card, setCard] = useState<{ tag: string; handle: string } | null | undefined>(undefined);
  const box = useRef<HTMLSpanElement>(null);

  // Close when tapping anywhere else, or on Escape.
  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  if (mine) return <b className="text-brand">{tag}</b>;
  return (
    <span ref={box} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          if (card === undefined) playerCard(id).then(setCard, () => setCard(null));
        }}
        className="font-bold hover:underline"
      >
        {tag}
      </button>
      {open && (
        <span className="absolute left-0 top-full z-20 mt-1 flex w-60 flex-col gap-2 rounded-xl border border-line bg-background p-3 text-sm shadow-lg">
          <span className="font-semibold">{tag}</span>
          {card === undefined ? (
            <span className="text-muted">{t("playnow.card.loading")}</span>
          ) : card === null ? (
            <span className="text-muted">{t("play.err.gone")}</span>
          ) : (
            <>
              <Link href={`/u/${card.handle}`} className="link">{t("playnow.card.profile")}</Link>
              {game && <AskToPlayButton to={id} games={[game]} />}
            </>
          )}
        </span>
      )}
    </span>
  );
}
