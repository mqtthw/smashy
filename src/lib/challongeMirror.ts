// Copying a finished Smashy bracket to Challonge (so Braacket and other ranking sites can import it):
// the pure part. Challonge builds its own bracket from the same seeds; we report each open match
// with the result of the matching set on Smashy, round by round. Shared by server code and tests.
import { playOrder, type EngineSet } from "./bracketEngine";

/** The played set between these two players that hasn't been copied yet, earliest first (rematches: GF reset). */
export function pickSet(sets: EngineSet[], copied: Set<string>, a: string, b: string): EngineSet | null {
  const pair = (s: EngineSet) => {
    const ids = [s.p[0].id, s.p[1].id];
    return ids.includes(a) && ids.includes(b) && a !== b;
  };
  return (
    sets
      .filter((s) => s.state === "done" && !copied.has(s.key) && pair(s))
      .sort((x, y) => playOrder(x) - playOrder(y) || x.round - y.round || x.idx - y.idx)[0] ?? null
  );
}

/** Challonge's match report for a set: each player's games won (a DQ is -1), the winner advances. */
export function matchReport(set: EngineSet, toChallonge: (id: string) => string): { participant_id: string; score_set: string; rank: number; advancing: boolean }[] {
  if (!set.winner) throw new Error("That set has no result.");
  return ([0, 1] as const).map((i) => {
    const won = set.winner === i + 1;
    const score = set.score[i];
    return { participant_id: toChallonge(set.p[i].id!), score_set: String(score ?? (won ? 1 : 0)), rank: won ? 1 : 2, advancing: won };
  });
}

/** Seeding for Challonge: the bracket's own seed order (seed 1 first), from the first-round sets. */
export function seedsFromBracket(seeded: string[]): { id: string; seed: number }[] {
  return seeded.map((id, i) => ({ id, seed: i + 1 }));
}
