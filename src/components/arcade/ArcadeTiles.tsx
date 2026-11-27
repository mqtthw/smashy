"use client";
// The Arcade page's game tiles (round 945): each with its own colour and a slanted glyph, and a line that
// knows this browser's record: whether today's puzzle is done, the streak of solved days, the best score.
import Link from "next/link";
import { NextPuzzle } from "@/components/arcade/ArcadeBits";
import { SETS_PER_ROUND, liveStreak, readStats } from "@/lib/arcade";
import type { MessageKey } from "@/lib/i18n/base";
import { useT } from "@/lib/i18n/client";
import { useStoredState } from "@/lib/useStoredState";

type Tile = { href: string; title: MessageKey; blurb: MessageKey; glyph: string; color: string };
const DAILY: (Tile & { stats: string })[] = [
  { href: "/arcade/major", title: "history.arcade.major.title", blurb: "history.arcade.major.blurb", glyph: "8", color: "#ffd447", stats: "arcade.major.stats" },
  { href: "/arcade/player", title: "history.arcade.player.title", blurb: "history.arcade.player.blurb", glyph: "?", color: "#ff6b5e", stats: "arcade.player.stats" },
];
const HL: Tile = { href: "/arcade/higher-lower", title: "history.arcade.hl.title", blurb: "history.arcade.hl.blurb", glyph: "↑↓", color: "#5ad1ff" };
const SETS: Tile = { href: "/arcade/sets", title: "history.arcade.sets.title", blurb: "history.arcade.sets.blurb", glyph: "VS", color: "#7dff9a" };

function TileCard({ tile, kind, status, i }: { tile: Tile; kind: MessageKey; status: React.ReactNode; i: number }) {
  const t = useT();
  return (
    <li className="arcade-pop" style={{ animationDelay: `${i * 80}ms` }}>
      <Link href={tile.href} className="arcade-tile card flex h-full items-start gap-4 p-4" style={{ "--tile": tile.color } as React.CSSProperties}>
        <span aria-hidden="true" className="arcade-glyph">{tile.glyph}</span>
        <span className="flex min-w-0 flex-col gap-1.5">
          <span className="badge self-start border border-line font-normal">{t(kind)}</span>
          <span className="text-lg font-bold">{t(tile.title)}</span>
          <span className="text-sm text-muted">{t(tile.blurb)}</span>
          <span className="text-sm font-semibold">{status}</span>
        </span>
      </Link>
    </li>
  );
}

function DailyTile({ tile, day, i }: { tile: (typeof DAILY)[number]; day: number; i: number }) {
  const t = useT();
  const [stored] = useStoredState(tile.stats, "");
  const stats = readStats(stored);
  const streak = liveStreak(stats, day);
  const today = stats.last === day;
  return (
    <TileCard
      tile={tile}
      kind="history.arcade.daily"
      i={i}
      status={
        <>
          {today ? (stats.won ? <span className="text-success">✓ {t("history.arcade.tile.solved")}</span> : <span className="text-muted">✗ {t("history.arcade.tile.missed")}</span>) : <span className="text-brand">▶ {t("history.arcade.tile.waiting")}</span>}
          {streak > 0 && <span className="ml-3">🔥 {streak}</span>}
        </>
      }
    />
  );
}

export default function ArcadeTiles({ day }: { day: number }) {
  const t = useT();
  const [hlBest] = useStoredState("arcade.hl.best", "0");
  const [setsBest] = useStoredState("arcade.sets.best", "0");
  return (
    <div className="flex flex-col gap-3">
      <ul className="grid gap-3 sm:grid-cols-2">
        {DAILY.map((tile, i) => <DailyTile key={tile.href} tile={tile} day={day} i={i} />)}
        <TileCard tile={HL} kind="history.arcade.endless" i={2} status={Number(hlBest) > 0 ? `⚡ ${t("history.arcade.hl.best", { n: Number(hlBest) })}` : <span className="text-brand">▶ {t("history.arcade.tile.fresh")}</span>} />
        <TileCard tile={SETS} kind="history.arcade.endless" i={3} status={Number(setsBest) > 0 ? `★ ${t("history.arcade.sets.best", { n: Number(setsBest), total: SETS_PER_ROUND })}` : <span className="text-brand">▶ {t("history.arcade.tile.fresh")}</span>} />
      </ul>
      <NextPuzzle className="text-center text-sm font-semibold text-muted" />
    </div>
  );
}
