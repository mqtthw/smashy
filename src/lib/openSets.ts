// A running bracket's open sets (called or being played) and what pages read off them (round 767).
// The rows are read once per page view by `openSets` in hostedBracket.ts; this file is the plain
// logic, so it can be tested.
import { liveScore, type LiveState } from "./liveSet";

/** A set that's been called or is being played, with its live record (setup, games so far, player reports). */
export type OpenSet = { id: string; identifier: string | null; p1_id: string | null; p2_id: string | null; state: "ready" | "live"; updated_at: string; live: LiveState | null };

/** Sets with a player-reported final score waiting for the TO. */
export function reportedOf(open: Pick<OpenSet, "id" | "live">[]): Set<string> {
  return new Set(open.filter((r) => Object.keys(r.live?.finals ?? {}).length > 0).map((r) => r.id));
}

/** Where each open set is played ("Setup 3"), by set id. */
export function stationsOf(open: Pick<OpenSet, "id" | "live">[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of open) if (r.live?.station) out[r.id] = r.live.station;
  return out;
}

/** Game scores of the sets being played right now (a called set that hasn't started has none), by set id. */
export function liveScoresOf(open: Pick<OpenSet, "id" | "state" | "live">[]): Record<string, [number, number]> {
  const out: Record<string, [number, number]> = {};
  for (const r of open) if (r.state === "live" && r.live?.games) out[r.id] = liveScore(r.live);
  return out;
}
