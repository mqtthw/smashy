// The stream kit: what casters and the "up next" overlay need from a running bracket.
// Plain logic (no database), so it can be tested.
import { playOrder, type EngineSet } from "./bracketEngine";

const both = (s: EngineSet) => !!s.p[0].id && !!s.p[1].id;

export type PathSet = { key: string; opponent: string | null; won: boolean; score: [number, number] };

/**
 * A player's run through this bracket so far: every finished set they played, in the order played,
 * with who they played, whether they won, and the score from their side (-1 = a DQ). Byes are left out.
 */
export function playerPath(sets: EngineSet[], playerId: string): PathSet[] {
  return sets
    .filter((s) => s.state === "done" && s.winner && both(s) && (s.p[0].id === playerId || s.p[1].id === playerId))
    .sort((a, b) => playOrder(a) - playOrder(b) || (a.pool ?? 0) - (b.pool ?? 0) || a.idx - b.idx)
    .map((s) => {
      const me = s.p[0].id === playerId ? 0 : 1;
      return { key: s.key, opponent: s.p[1 - me].id, won: s.winner === me + 1, score: [s.score[me] ?? 0, s.score[1 - me] ?? 0] as [number, number] };
    });
}

/** "3–1 in sets" for a run so far. */
export function pathRecord(path: PathSet[]): { wins: number; losses: number } {
  return { wins: path.filter((p) => p.won).length, losses: path.filter((p) => !p.won).length };
}

/**
 * What's coming up after the set on stream, for the "up next" overlay: the sets that can be played
 * now (both players known, not finished), earliest in the bracket first, leaving out the one on
 * stream. At most `max`.
 */
export function upNext(sets: EngineSet[], onStream: string | null, max = 4): EngineSet[] {
  return sets
    .filter((s) => (s.state === "ready" || s.state === "live") && both(s) && s.key !== onStream)
    .sort((a, b) => playOrder(a) - playOrder(b) || (a.pool ?? 0) - (b.pool ?? 0) || a.idx - b.idx)
    .slice(0, max);
}
