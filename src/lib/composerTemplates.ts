// The feed composer's "Share a result" / "I signed up" choices for a linked start.gg player.
import type { HistoryEntry } from "./startgg";

/**
 * Merges the fresh recent list (minutes old) with the cached history (hours old), fresh first, one
 * entry per event. Results: newest first. Sign-ups: not finished, soonest first, from a day ago on,
 * or, for leagues and seasons that run for weeks, from up to ten weeks ago while they're unfinished.
 */
export function composerTemplates(fresh: HistoryEntry[], history: HistoryEntry[], now: number) {
  const byEvent = new Map<string, HistoryEntry>();
  for (const e of [...fresh, ...history]) if (!byEvent.has(e.eventId)) byEvent.set(e.eventId, e);
  const all = [...byEvent.values()];
  return {
    results: all.filter((e) => e.placement !== null).sort((a, b) => b.startAt - a.startAt).slice(0, 10),
    signups: all.filter((e) => e.placement === null && e.startAt > now - (e.running ? 70 * 86400 : 86400)).sort((a, b) => a.startAt - b.startAt).slice(0, 10),
  };
}

/**
 * The first page of a player's history with the fresh list folded in: fresh entries replace their
 * hours-old copies (a placement that just came in) and new ones join, newest first.
 */
export function withFresh(history: HistoryEntry[], fresh: HistoryEntry[]): HistoryEntry[] {
  const freshById = new Map(fresh.map((e) => [e.eventId, e]));
  const merged = history.map((e) => freshById.get(e.eventId) ?? e);
  const known = new Set(history.map((e) => e.eventId));
  const oldest = history.at(-1)?.startAt ?? 0;
  // Only add events at least as new as this page's oldest one, so later pages don't repeat them.
  const added = fresh.filter((e) => !known.has(e.eventId) && e.startAt >= oldest);
  return [...added, ...merged].sort((a, b) => b.startAt - a.startAt);
}
