"use client";
// Pieces shared by /replays and the replay stats on a profile: number tiles and win–loss lists.
import { useT } from "@/lib/i18n/client";
import type { SavedReplaySummary } from "@/lib/replayProfile";
import type { Tally } from "@/lib/slippiStats";

export const pct = (n: number | null) => (n === null ? "–" : `${Math.round(n * 100)}%`);
export const num = (n: number | null, digits = 1) => (n === null ? "–" : n.toFixed(digits));

export function Tile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg bg-surface-2 p-3">
      <div className="font-mono text-xl font-bold tabular-nums">{value}</div>
      <div className="text-sm font-semibold">{label}</div>
      <div className="text-meta text-muted">{hint}</div>
    </div>
  );
}

export function TallyList({ title, rows, limit = 8 }: { title: string; rows: (Tally & { name: string })[]; limit?: number }) {
  const t = useT();
  if (!rows.length) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-meta font-semibold uppercase tracking-wide text-muted">{title}</h3>
      <ul className="flex flex-col gap-1">
        {rows.slice(0, limit).map((r) => (
          <li key={r.name} className="flex items-center justify-between gap-2 text-body">
            <span className="truncate">{r.name}</span>
            <span className="shrink-0 text-meta text-muted">
              {t("play.replays.games", { n: r.games })} ·{" "}
              <span className={`font-mono tabular-nums ${r.wins > r.losses ? "text-success" : r.wins < r.losses ? "text-danger" : ""}`}>
                {r.wins}–{r.losses}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The record, the six number tiles, and records by character and stage. `own`: the viewer's own numbers
 * ("Your characters"); someone else's say "Characters".
 */
export function SummaryView({ s, listLimit = 8, own = true, children }: { s: SavedReplaySummary; listLimit?: number; own?: boolean; children?: React.ReactNode }) {
  const t = useT();
  return (
    <>
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-display font-bold tabular-nums">
          {s.wins}–{s.losses}
        </span>
        <span className="text-muted">
          {t("play.replays.played", { n: s.games })} · {t("play.replays.minutes", { n: Math.max(1, Math.round(s.minutes)) })}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Tile label={t("play.replays.opk")} value={num(s.openingsPerKill)} hint={t("play.replays.opkHint")} />
        <Tile label={t("play.replays.dpo")} value={num(s.damagePerOpening)} hint={t("play.replays.dpoHint")} />
        <Tile label={t("play.replays.neutral")} value={pct(s.neutralWinRate)} hint={t("play.replays.neutralHint")} />
        <Tile label={t("play.replays.counter")} value={pct(s.counterHitRate)} hint={t("play.replays.counterHint")} />
        <Tile label={t("play.replays.ipm")} value={num(s.inputsPerMinute, 0)} hint={t("play.replays.ipmHint")} />
        <Tile label={t("play.replays.lcancel")} value={pct(s.lCancelRate)} hint={t("play.replays.lcancelHint")} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TallyList title={t(own ? "play.replays.yourChars" : "play.replays.card.characters")} rows={s.byCharacter} limit={listLimit} />
        <TallyList title={t("play.replays.againstChars")} rows={s.byOpponentCharacter} limit={listLimit} />
        <TallyList title={t("play.replays.stages")} rows={s.byStage} limit={listLimit} />
        {children}
      </div>
    </>
  );
}
