"use client";
// Client components (they follow the visitor's language); every prop is plain data, so server pages can use them too.
import Link from "next/link";
import GameBadge from "@/components/GameBadge";
import LocalTime from "@/components/ui/LocalTime";
import { useT } from "@/lib/i18n/client";
import type { HeadToHead, PlayerSet, PlayerStats } from "@/lib/playerStats";

const pct = (w: number, l: number) => (w + l ? Math.round((w / (w + l)) * 100) : 0);

/** Record, characters and rivals from a player's last 100 start.gg sets. */
export function PlayerStatsCard({ stats }: { stats: PlayerStats }) {
  const t = useT();
  if (!stats.sets) return null;
  return (
    <section aria-labelledby="stats-heading" className="card flex flex-col gap-4 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="stats-heading" className="font-bold">{t("people.stats.title")}</h2>
        <span className="text-meta text-muted">{t("people.stats.lastSets", { n: stats.sets })}</span>
      </div>
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-display font-bold tabular-nums">{stats.wins}–{stats.losses}</span>
        <span className="text-muted">{t("people.stats.won", { pct: pct(stats.wins, stats.losses) })}</span>
      </div>

      {stats.characters.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-meta font-semibold uppercase tracking-wide text-muted">{t("people.stats.characters")}</h3>
          <ul className="flex flex-col gap-1.5">
            {stats.characters.map((c) => (
              <li key={`${c.game}-${c.name}`} className="flex items-center gap-2 text-body">
                <span className="w-28 shrink-0 truncate">{c.name}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <span className="block h-full rounded-full bg-brand" style={{ width: `${Math.max(3, c.share)}%` }} />
                </span>
                <span className="w-10 shrink-0 text-right font-mono text-meta tabular-nums text-muted">{c.share}%</span>
                {c.game && <GameBadge game={c.game} />}
              </li>
            ))}
          </ul>
          <p className="text-meta text-muted">{t("people.stats.charNote")}</p>
        </div>
      )}

      {stats.rivals.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-meta font-semibold uppercase tracking-wide text-muted">{t("people.stats.mostPlayed")}</h3>
          <ul className="flex flex-col gap-1">
            {stats.rivals.map((r) => (
              <li key={r.playerId} className="flex items-center justify-between gap-2 text-body">
                <Link href={`/players/${r.playerId}`} className="truncate hover:underline">{r.tag}</Link>
                <span className={`font-mono tabular-nums ${r.wins > r.losses ? "text-success" : r.wins < r.losses ? "text-danger" : "text-muted"}`}>
                  {r.wins}–{r.losses}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/**
 * A player's finished singles sets, newest first. The opponent's name opens their player page;
 * the line under it opens the set (games, characters, stages).
 */
export function RecentSetsCard({ sets, initial = 15, total, children }: { sets: PlayerSet[]; initial?: number; total?: number; children?: React.ReactNode }) {
  const t = useT();
  if (!sets.length && total === undefined) return null;
  const games = new Set(sets.map((s) => s.game));
  const row = (s: PlayerSet) => (
    <li key={s.id} className="flex items-center gap-3 py-2 text-body">
      <span className={`w-6 shrink-0 text-center font-bold ${s.dq ? "text-muted" : s.won ? "text-success" : "text-danger"}`}>{s.dq ? "DQ" : s.won ? t("people.sets.win") : t("people.sets.loss")}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="min-w-0 truncate">
            <span className="text-muted">vs </span>
            {s.opp.playerId ? <Link href={`/players/${s.opp.playerId}`} className="font-semibold hover:underline">{s.opp.tag}</Link> : <span className="font-semibold">{s.opp.tag}</span>}
            {(s.myCharacters.length > 0 || s.oppCharacters.length > 0) && <span className="text-meta text-muted"> · {s.myCharacters.join("/") || "?"} vs {s.oppCharacters.join("/") || "?"}</span>}
          </span>
          {games.size > 1 && s.game && <GameBadge game={s.game} />}
        </span>
        <Link href={`/sets/startgg/${s.id}`} className="block truncate text-meta text-muted hover:underline">
          {s.tournamentName}
          {s.round ? ` · ${s.round}` : ""}
          {s.completedAt ? <> · <LocalTime iso={new Date(s.completedAt * 1000).toISOString()} style="date" /></> : null}
        </Link>
      </span>
      {!s.dq && s.myScore !== null && s.oppScore !== null && <span className="shrink-0 font-mono tabular-nums">{s.myScore}–{s.oppScore}</span>}
    </li>
  );
  return (
    <section aria-labelledby="sets-heading" className="card flex flex-col gap-1 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="sets-heading" className="font-bold">{t("people.sets.title")}</h2>
        <span className="text-meta text-muted">{total !== undefined && total !== sets.length ? t("people.sets.countOf", { shown: sets.length, total }) : t("people.sets.count", { n: sets.length })}</span>
      </div>
      {children}
      <ul className="flex flex-col divide-y divide-line">{sets.slice(0, initial).map(row)}</ul>
      {sets.length > initial && (
        <details className="border-t border-line">
          <summary className="cursor-pointer py-2 text-sm font-semibold text-brand">{t("common.showMore", { n: sets.length - initial })}</summary>
          <ul className="flex flex-col divide-y divide-line border-t border-line">{sets.slice(initial).map(row)}</ul>
        </details>
      )}
      <p className="text-meta text-muted">{t("people.sets.note")}</p>
    </section>
  );
}

/** "AZ 9–0 SCents" plus their recent meetings. `left` is the player whose sets were searched. */
export function HeadToHeadCard({ left, right, h2h, title: titleProp }: { left: string; right: string; h2h: HeadToHead; title?: string }) {
  const t = useT();
  const title = titleProp ?? t("people.h2h.title");
  if (!h2h.sets.length) {
    return (
      <section className="card p-4">
        <h2 className="font-bold">{title}</h2>
        <p className="text-meta text-muted">{t("people.h2h.never", { left, right })}</p>
      </section>
    );
  }
  return (
    <section className="card flex flex-col gap-3 p-4">
      <h2 className="font-bold">{title}</h2>
      <div className="flex items-center justify-center gap-4">
        <span className="min-w-0 flex-1 truncate text-right font-semibold">{left}</span>
        <span className="font-mono text-display font-bold tabular-nums">{h2h.wins}–{h2h.losses}</span>
        <span className="min-w-0 flex-1 truncate font-semibold">{right}</span>
      </div>
      <ul className="flex flex-col divide-y divide-line">
        {h2h.sets.slice(0, 5).map((s) => (
          <li key={s.id}>
            <Link href={`/sets/startgg/${s.id}`} className="flex items-center gap-3 py-2 text-body hover:bg-surface">
              <span className={`w-6 shrink-0 text-center font-bold ${s.dq ? "text-muted" : s.won ? "text-success" : "text-danger"}`}>{s.dq ? "DQ" : s.won ? t("people.sets.win") : t("people.sets.loss")}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{s.tournamentName}</span>
                <span className="block truncate text-meta text-muted">
                  {s.round}
                  {s.myCharacters.length || s.oppCharacters.length ? ` · ${s.myCharacters.join("/") || "?"} vs ${s.oppCharacters.join("/") || "?"}` : ""}
                </span>
              </span>
              {!s.dq && <span className="font-mono tabular-nums">{s.myScore}–{s.oppScore}</span>}
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-meta text-muted">{t("people.h2h.note", { left })}</p>
    </section>
  );
}
