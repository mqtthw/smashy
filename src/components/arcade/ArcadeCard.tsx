"use client";
// The Arcade's advert, in the right-hand column on wide screens (the home page and Play) and in the Feed where
// there's no column. Round 947 made it loud ("the design should appeal to clicks"); round 965 (Matthew: "update and
// upgrade the games card") made it live: today's two puzzles as pips with this browser's streak and the clock to
// the next ones. Round 966 cut the rest back (the glyph row, the description, the shortcuts): the card opens the Arcade page (round 967, Matthew: "Play now should take you to /arcade rather than straight to the major game"); before that it opened
// today's unsolved puzzle, or the Arcade once both are done. It reads only the browser's own record.
import Link from "next/link";
import { useEffect, useState } from "react";
import { Pips } from "@/components/arcade/ArcadeBits";
import { clock, dayNumber, liveStreak, readStats, untilNextPuzzle } from "@/lib/arcade";
import { useT } from "@/lib/i18n/client";
import { useStoredState } from "@/lib/useStoredState";

export function ArcadePromo({ className = "" }: { className?: string }) {
  const t = useT();
  const [majorStored] = useStoredState("arcade.major.stats", "");
  const [playerStored] = useStoredState("arcade.player.stats", "");
  // The day and the clock come from the browser once it's showing the page (the server doesn't know either).
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  const day = now === null ? null : dayNumber(now);
  const daily = [{ href: "/arcade/major", stats: readStats(majorStored) }, { href: "/arcade/player", stats: readStats(playerStored) }];
  const done = day === null ? [] : daily.filter((d) => d.stats.last === day);
  const streak = day === null ? 0 : Math.max(...daily.map((d) => liveStreak(d.stats, day)));
  // Round 966 (Matthew: "Way too wordy, I don't like the cards up top, I do like the daily count"): the name, the
  // one line he asked for in round 947, today's count with the streak and the clock, and one button.
  return (
    <Link href="/arcade" className={`arcade-promo flex flex-col gap-2.5 p-4 ${className}`}>
      <span className="arcade-promo-title">{t("history.arcade.card.title")}</span>
      <span className="text-base font-bold">{t("history.arcade.card.tag")}</span>
      <span className="flex flex-col gap-1 border border-white/25 bg-[rgb(10_8_40/0.5)] p-2.5">
        <span className="flex items-center justify-between gap-2 text-sm font-bold">
          <span className="flex items-center gap-2">
            <Pips results={done.map((d) => d.stats.won)} total={daily.length} />
            {t("history.arcade.card.today", { n: done.length, total: daily.length })}
          </span>
          {streak > 0 && <span>🔥 {streak}</span>}
        </span>
        <span className="text-meta tabular-nums opacity-90">{now === null ? "\u00a0" : t("history.arcade.next", { time: clock(untilNextPuzzle(now)) })}</span>
      </span>
      <span className="arcade-promo-btn self-start">{t("history.arcade.card.play")} →</span>
    </Link>
  );
}

export default function ArcadeCard() {
  return <ArcadePromo className="m-3 xl:hidden" />;
}
