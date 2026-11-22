// Slippi replay stats saved to a profile: the summary a member chooses to keep. Built from the totals
// /replays works out in their browser, minus anything about other people (opponents' names and connect
// codes) and the member's own connect code. Also checks what a browser sends before it's saved.
import type { ReplayTotals, Tally } from "./slippiStats";

type Row = Tally & { name: string };

export type SavedReplaySummary = {
  games: number;
  wins: number;
  losses: number;
  minutes: number;
  kills: number;
  openingsPerKill: number | null;
  damagePerOpening: number | null;
  neutralWinRate: number | null;
  counterHitRate: number | null;
  inputsPerMinute: number | null;
  lCancelRate: number | null;
  byCharacter: Row[];
  byOpponentCharacter: Row[];
  byStage: Row[];
};

const LIST_MAX = 12;
const keepRows = (rows: Row[]) => rows.slice(0, LIST_MAX).map(({ name, games, wins, losses }) => ({ name, games, wins, losses }));

/** What gets saved from a set of totals (no opponents, no connect code). */
export function toSavedSummary(t: ReplayTotals): SavedReplaySummary {
  return {
    games: t.games, wins: t.wins, losses: t.losses, minutes: Math.round(t.minutes), kills: t.kills,
    openingsPerKill: t.openingsPerKill, damagePerOpening: t.damagePerOpening, neutralWinRate: t.neutralWinRate,
    counterHitRate: t.counterHitRate, inputsPerMinute: t.inputsPerMinute, lCancelRate: t.lCancelRate,
    byCharacter: keepRows(t.byCharacter), byOpponentCharacter: keepRows(t.byOpponentCharacter), byStage: keepRows(t.byStage),
  };
}

const int = (v: unknown, max: number): number | null => (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max ? v : null);
const rate = (v: unknown, max: number): number | null | undefined =>
  v === null ? null : typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max ? Math.round(v * 1000) / 1000 : undefined;

function rows(v: unknown): Row[] | null {
  if (!Array.isArray(v) || v.length > LIST_MAX) return null;
  const out: Row[] = [];
  for (const r of v as Record<string, unknown>[]) {
    if (!r || typeof r !== "object") return null;
    const name = typeof r.name === "string" ? r.name.trim().slice(0, 40) : "";
    const games = int(r.games, 100000);
    const wins = int(r.wins, 100000);
    const losses = int(r.losses, 100000);
    if (!name || /[<>@#]/.test(name) || games === null || wins === null || losses === null || wins + losses > games) return null;
    out.push({ name, games, wins, losses });
  }
  return out;
}

/** A summary sent by a browser, checked and cleaned; null if anything doesn't fit. */
export function readSavedSummary(raw: unknown): SavedReplaySummary | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  const games = int(s.games, 100000);
  const wins = int(s.wins, 100000);
  const losses = int(s.losses, 100000);
  const minutes = int(s.minutes, 10_000_000);
  const kills = int(s.kills, 10_000_000);
  if (!games || wins === null || losses === null || minutes === null || kills === null || wins + losses > games) return null;
  const rates = {
    openingsPerKill: rate(s.openingsPerKill, 1000),
    damagePerOpening: rate(s.damagePerOpening, 1000),
    neutralWinRate: rate(s.neutralWinRate, 1),
    counterHitRate: rate(s.counterHitRate, 1),
    inputsPerMinute: rate(s.inputsPerMinute, 10000),
    lCancelRate: rate(s.lCancelRate, 1),
  };
  if (Object.values(rates).some((r) => r === undefined)) return null;
  const [byCharacter, byOpponentCharacter, byStage] = [rows(s.byCharacter), rows(s.byOpponentCharacter), rows(s.byStage)];
  if (!byCharacter || !byOpponentCharacter || !byStage) return null;
  return { games, wins, losses, minutes, kills, ...(rates as { [K in keyof typeof rates]: number | null }), byCharacter, byOpponentCharacter, byStage };
}
