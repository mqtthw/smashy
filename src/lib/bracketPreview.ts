// Before a bracket starts: what the first round (or the pools) would look like with the current seeding.
import { buildElimination, buildRoundRobin, buildSwissRound } from "./bracketEngine";

export type Preview =
  | { kind: "elimination"; matches: [string | null, string | null][] } // null = a bye
  | { kind: "pools"; pools: string[][] };

export function bracketPreview(seeds: string[], format: "single_elim" | "double_elim" | "round_robin" | "swiss"): Preview | null {
  if (seeds.length < 2) return null;
  if (format === "swiss") {
    // Round 1 of a Swiss: the top half against the bottom half, and a bye for the last seed if the count is odd.
    const sets = buildSwissRound(seeds.map((id, i) => ({ id, seed: i + 1 })), [], { bestOf: 3 });
    return { kind: "elimination", matches: sets.sort((a, b) => a.idx - b.idx).map((s) => [s.p[0].id, s.p[1].id] as [string | null, string | null]) };
  }
  if (format === "round_robin") {
    const sets = buildRoundRobin(seeds, { bestOf: 3 });
    const pools = new Map<number, Set<string>>();
    for (const s of sets) for (const p of s.p) if (p.id) (pools.get(s.pool ?? 1) ?? pools.set(s.pool ?? 1, new Set()).get(s.pool ?? 1)!).add(p.id);
    return { kind: "pools", pools: [...pools.entries()].sort((a, b) => a[0] - b[0]).map(([, ids]) => seeds.filter((id) => ids.has(id))) };
  }
  const sets = buildElimination(seeds, { double: format === "double_elim", bestOf: 3 });
  const winners = sets.filter((s) => s.bracket === "W");
  const first = Math.min(...winners.map((s) => s.round));
  return {
    kind: "elimination",
    matches: winners
      .filter((s) => s.round === first)
      .sort((a, b) => a.idx - b.idx)
      .map((s) => [s.p[0].id, s.p[1].id] as [string | null, string | null]),
  };
}
