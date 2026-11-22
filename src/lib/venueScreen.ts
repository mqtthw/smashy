// What the venue screen (the TV or projector at a local) shows: which sets to play now and where,
// and which are up next.
import { playOrder, type EngineSet } from "./bracketEngine";
import { isStreamSetup } from "./streamSet";

export type ScreenRow = { set: EngineSet; setup: string | null; live: boolean };

const both = (s: EngineSet) => !!s.p[0].id && !!s.p[1].id;
const byBracket = (a: EngineSet, b: EngineSet) => playOrder(a) - playOrder(b) || (a.pool ?? 0) - (b.pool ?? 0) || a.idx - b.idx;

/**
 * "Play now": every set that has been called to a setup or is already being played. The stream
 * setup comes first, then setups in their natural order ("Setup 2" before "Setup 10"), then sets
 * being played with no setup named.
 * "Up next": sets that are ready (both players known) but have no setup yet, earliest rounds first.
 * Each player is named once: in a round robin every set is ready from the start, so without this a
 * player would be listed against several opponents at the same time. A set is left for later while
 * either player is under "Play now" or already has an earlier set under "Up next". `later` counts
 * those.
 */
export function screenLists(sets: EngineSet[], setups: Record<string, string> = {}): { now: ScreenRow[]; next: ScreenRow[]; later: number } {
  const open = sets.filter((s) => (s.state === "live" || s.state === "ready") && both(s));
  const row = (s: EngineSet): ScreenRow => ({ set: s, setup: setups[s.key]?.trim() || null, live: s.state === "live" });
  const now = open
    .map(row)
    .filter((r) => r.live || r.setup)
    .sort((a, b) => {
      const rank = (r: ScreenRow) => (isStreamSetup(r.setup ?? undefined) ? 0 : r.setup ? 1 : 2);
      return rank(a) - rank(b) || (a.setup ?? "").localeCompare(b.setup ?? "", undefined, { numeric: true, sensitivity: "base" }) || byBracket(a.set, b.set);
    });
  const busy = new Set(now.flatMap((r) => r.set.p.map((x) => x.id)));
  const next: ScreenRow[] = [];
  let later = 0;
  for (const r of open
    .map(row)
    .filter((x) => !x.live && !x.setup)
    .sort((a, b) => byBracket(a.set, b.set))) {
    const ids = r.set.p.map((x) => x.id);
    if (ids.some((x) => busy.has(x))) {
      later++;
      continue;
    }
    ids.forEach((x) => busy.add(x));
    next.push(r);
  }
  return { now, next, later };
}
