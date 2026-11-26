// A character's measured numbers as lines for their page (round 925): the value, where it ranks among the
// characters that have that number (1 = highest), and a 0–1 share for the bar. The numbers themselves are
// in characterStats.ts, made from KuroganeHammer's tables.
import { ULTIMATE_STATS, type CharacterStats } from "./characterStats";

export const STAT_FIELDS = ["weight", "fallSpeed", "gravity", "runSpeed", "walkSpeed", "airSpeed", "dashSpeed"] as const satisfies readonly (keyof CharacterStats)[];
export type StatLine = { field: (typeof STAT_FIELDS)[number]; value: number; rank: number; total: number; share: number };

/** Up to three decimals, without trailing zeros: 1.397792 -> 1.398, 133 -> 133. */
const tidy = (n: number) => Math.round(n * 1000) / 1000;

export function statLines(character: string, all: Record<string, CharacterStats> = ULTIMATE_STATS): StatLine[] {
  const mine = all[character];
  if (!mine) return [];
  return STAT_FIELDS.flatMap((field) => {
    const value = mine[field];
    if (value === undefined) return [];
    const values = Object.values(all).flatMap((s) => (s[field] === undefined ? [] : [s[field]!]));
    const min = Math.min(...values);
    const max = Math.max(...values);
    return [{
      field,
      value: tidy(value),
      // Ties share a place: everyone with the same number is the same rank.
      rank: 1 + values.filter((v) => v > value).length,
      total: values.length,
      share: max > min ? (value - min) / (max - min) : 1,
    }];
  });
}
