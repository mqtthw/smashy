import type { MessageKey } from "./i18n/core";
// Pick'em for majors: checking a member's picks, and scoring them from the final standings.
// Plain logic (no database, no start.gg), so it can be tested.

export const CHAMPION_POINTS = 5;
export const TOP8_POINTS = 1;
export const MAX_POINTS = CHAMPION_POINTS + 8 * TOP8_POINTS;
/** How many of the top seeds can be picked from. */
export const PICKABLE_SEEDS = 32;

export type Seed = { playerId: string; tag: string; prefix: string | null; seed: number };

/**
 * A member's picks as sent from the form, checked against the players who can be picked: the
 * champion and up to 8 for the top 8 (the champion always counts as one of them), no repeats,
 * everyone among the event's top seeds. Returns the picks tidied, or why they can't be saved.
 */
/** `error`: a phrase key; the action shows it in the player's language. */
export function checkPicks(champion: unknown, top8: unknown, seeds: Seed[]): { champion: string; top8: string[] } | { error: MessageKey } {
  const allowed = new Set(seeds.map((s) => s.playerId));
  const champ = typeof champion === "string" ? champion : "";
  if (!allowed.has(champ)) return { error: "play.pickem.err.champion" };
  const list = Array.isArray(top8) ? top8.filter((x): x is string => typeof x === "string") : [];
  if (list.some((id) => !allowed.has(id))) return { error: "play.pickem.err.top8List" };
  const unique = [champ, ...list.filter((id) => id !== champ)].filter((id, i, all) => all.indexOf(id) === i);
  if (unique.length > 8) return { error: "play.pickem.err.top8Count" };
  return { champion: champ, top8: unique };
}

export type PickScore = { points: number; championRight: boolean; inTop8: string[] };

/**
 * Points for a set of picks, from the final standings (player id -> placement): 5 for the
 * champion, 1 for each player picked for the top 8 who finished in it (placements 1 to 8; start.gg
 * places a top 8 as 1, 2, 3, 4, 5, 5, 7, 7).
 */
export function scorePicks(pick: { champion: string; top8: string[] }, placements: Map<string, number>): PickScore {
  const championRight = placements.get(pick.champion) === 1;
  const inTop8 = pick.top8.filter((id) => {
    const place = placements.get(id);
    return place !== undefined && place <= 8;
  });
  return { points: (championRight ? CHAMPION_POINTS : 0) + inTop8.length * TOP8_POINTS, championRight, inTop8 };
}

export type Ranked<T> = T & { rank: number };

/** Best score first; equal scores share a rank (1, 2, 2, 4), then the earlier pick first. */
export function rankScores<T extends { points: number; pickedAt: string }>(rows: T[]): Ranked<T>[] {
  const sorted = [...rows].sort((a, b) => b.points - a.points || a.pickedAt.localeCompare(b.pickedAt));
  const out: Ranked<T>[] = [];
  sorted.forEach((r, i) => out.push({ ...r, rank: i > 0 && sorted[i - 1].points === r.points ? out[i - 1].rank : i + 1 }));
  return out;
}

/** How many picked each player for the top 8 and as champion, most picked first: what the crowd thinks. */
export function crowdPicks(picks: { champion: string; top8: string[] }[]): { playerId: string; champion: number; top8: number }[] {
  const tally = new Map<string, { playerId: string; champion: number; top8: number }>();
  for (const p of picks) {
    for (const id of p.top8) {
      const t = tally.get(id) ?? { playerId: id, champion: 0, top8: 0 };
      t.top8++;
      if (id === p.champion) t.champion++;
      tally.set(id, t);
    }
  }
  return [...tally.values()].sort((a, b) => b.champion - a.champion || b.top8 - a.top8);
}
