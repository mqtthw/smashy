"use client";
// The Arcade's advert, in the right-hand column on wide screens (the home page and Play) and in the Feed where
// there's no column. Round 947 made it loud ("the design should appeal to clicks"); round 965 (Matthew: "update and
// upgrade the games card") brought it up to date with what the Arcade now holds and made it live: today's two
// puzzles as pips with this browser's streak, the clock to the next ones, and three ways straight in (today's
// puzzle, Does it kill?, the tech-chase trainer) beside the main button. It reads only the browser's own record.
import Link from "next/link";
import { useEffect, useState } from "react";
import { Pips } from "@/components/arcade/ArcadeBits";
import { clock, dayNumber, liveStreak, readStats, untilNextPuzzle } from "@/lib/arcade";
import { useT } from "@/lib/i18n/client";
import { useStoredState } from "@/lib/useStoredState";

const GLYPHS: [string, string][] = [["8", "#ffd447"], ["?", "#ff6b5e"], ["↑↓", "#5ad1ff"], ["VS", "#7dff9a"], ["KO", "#9dff6a"], ["⚡", "#ffa040"], ["DI", "#c58bff"]];

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
  const next = daily.find((d) => d.stats.last !== day)?.href ?? "/arcade";
  return (
    <div className={`arcade-promo flex flex-col gap-2.5 p-4 ${className}`}>
      <span aria-hidden="true" className="flex flex-wrap items-center gap-1">
        {GLYPHS.map(([glyph, color], i) => (
          <span key={glyph} className="arcade-glyph arcade-mini" style={{ "--tile": color, animationDelay: `${i * 120}ms` } as React.CSSProperties}>{glyph}</span>
        ))}
      </span>
      <Link href="/arcade" className="arcade-promo-title after:absolute after:inset-0">{t("history.arcade.card.title")}</Link>
      <span className="text-base font-bold">{t("history.arcade.card.tag")}</span>
      <span className="text-sm opacity-90">{t("history.arcade.card.text")}</span>
      {/* Today, from this browser's record. Above the card-wide link, so its own links can be clicked. */}
      <div className="relative z-[1] flex flex-col gap-2 border border-white/25 bg-[rgb(10_8_40/0.5)] p-2.5">
        <div className="flex items-center justify-between gap-2 text-sm font-bold">
          <span className="flex items-center gap-2">
            <Pips results={done.map((d) => d.stats.won)} total={daily.length} />
            {t("history.arcade.card.today", { n: done.length, total: daily.length })}
          </span>
          {streak > 0 && <span>🔥 {streak}</span>}
        </div>
        <p className="text-meta tabular-nums opacity-90">{now === null ? "\u00a0" : t("history.arcade.next", { time: clock(untilNextPuzzle(now)) })}</p>
        <div className="flex flex-wrap gap-1.5">
          <Link href={next} className="arcade-promo-chip">{t(done.length < daily.length ? "history.arcade.hero.cta" : "history.arcade.hero.keep")}</Link>
          <Link href="/arcade/kill" className="arcade-promo-chip">{t("history.arcade.fq.kill.title")}</Link>
          <Link href="/arcade/tech-chase" className="arcade-promo-chip">{t("history.arcade.tech.title")}</Link>
        </div>
      </div>
      <span aria-hidden="true" className="arcade-promo-btn self-start">{t("history.arcade.card.play")} →</span>
    </div>
  );
}

export default function ArcadeCard() {
  return <ArcadePromo className="m-3 xl:hidden" />;
}
