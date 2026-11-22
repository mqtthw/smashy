// Stage striking for an in-person set, following a scene's ruleset. Pure functions (shared, tested).
//
// Game 1: players take turns striking starters in the ruleset's pattern ("1-2-1": A strikes 1, B
// strikes 2, A strikes 1) until one stage is left. After each game the winner bans N stages, then the
// loser picks from what's left, minus stages the loser can't go back to under the ruleset's DSR.
// A ruleset can give its longer sets (often best of 5 from Top 8) their own number of bans.

export type Side = 0 | 1;
export type StrikeRules = {
  starters: string[];
  counterpicks: string[];
  pattern: string | null; // e.g. "1-2-1"
  bans: number; // after each game, the winner bans this many
  dsr: "none" | "standard" | "modified";
  bestOf: number;
  bansLong?: number | null; // the bans in sets longer than bestOf; null or missing = the same as `bans`
  bestOfLong?: number | null; // how long the ruleset's longer sets are, when it has them
};

/** The turns for game 1, e.g. 5 starters + "1-2-1" -> [0, 1, 1, 0]. Falls back to a fair 1-2-2-…-1. */
export function strikeOrder(starterCount: number, pattern: string | null): Side[] {
  const needed = Math.max(0, starterCount - 1);
  const nums = (pattern ?? "").match(/\d+/g)?.map(Number) ?? [];
  const order: Side[] = [];
  if (nums.length && nums.reduce((a, b) => a + b, 0) === needed) {
    nums.forEach((n, i) => {
      for (let k = 0; k < n; k++) order.push((i % 2) as Side);
    });
    return order;
  }
  // 1, then pairs, ending with whoever is due (e.g. 4 strikes -> A, B, B, A; 2 -> A, B).
  for (let i = 0; i < needed; i++) order.push((Math.floor((i + 1) / 2) % 2) as Side);
  return order;
}

export type GameResult = { stage: string; winner: Side };

/** Stages the picking player may choose after the winner's bans (DSR applied). */
export function pickable(rules: StrikeRules, history: GameResult[], banned: string[], picker: Side): string[] {
  const all = [...new Set([...rules.starters, ...rules.counterpicks])];
  const wonByPicker = history.filter((g) => g.winner === picker).map((g) => g.stage);
  const blocked =
    rules.dsr === "standard" ? new Set(wonByPicker)
    : rules.dsr === "modified" && wonByPicker.length ? new Set([wonByPicker[wonByPicker.length - 1]])
    : new Set<string>();
  return all.filter((s) => !banned.includes(s) && !blocked.has(s));
}

/** The winner's bans after each game in a set of this length (the ruleset's longer sets can have their own number). */
export function bansFor(rules: StrikeRules, bestOf: number): number {
  return typeof rules.bansLong === "number" && bestOf > rules.bestOf ? rules.bansLong : rules.bans;
}

/**
 * How many bans the winner gets this time (never so many that the loser has nothing to pick).
 * `bestOf` is the length of the set being played; left out, it's the ruleset's normal length.
 */
export function bansAllowed(rules: StrikeRules, history: GameResult[], loser: Side, bestOf: number = rules.bestOf): number {
  const options = pickable(rules, history, [], loser).length;
  return Math.max(0, Math.min(bansFor(rules, bestOf), options - 1));
}

export function winsNeeded(bestOf: number): number {
  return Math.floor(Math.max(1, bestOf) / 2) + 1;
}

export function score(history: GameResult[]): [number, number] {
  return [history.filter((g) => g.winner === 0).length, history.filter((g) => g.winner === 1).length];
}

/** Read a ruleset's saved rules (from the database) into striking rules, with sensible fallbacks. */
export function rulesFromRuleset(rules: Record<string, unknown>, fallbackStages: string[]): StrikeRules {
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((s): s is string => typeof s === "string" && s.length > 0) : []);
  const starters = list(rules.starters);
  const dsr = rules.dsr === "standard" || rules.dsr === "modified" ? rules.dsr : "none";
  const bans = typeof rules.counterpick_bans === "number" ? rules.counterpick_bans : 2;
  const bestOf = typeof rules.best_of === "number" && rules.best_of >= 1 ? rules.best_of : 3;
  const whole = (v: unknown, max: number) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.round(v))) : null);
  const bestOfLong = whole(rules.best_of_top, 9);
  return {
    starters: starters.length >= 1 ? starters : fallbackStages,
    counterpicks: list(rules.counterpicks).filter((s) => !starters.includes(s)),
    pattern: typeof rules.game1_striking === "string" ? rules.game1_striking : null,
    bans: Math.max(0, Math.min(10, Math.round(bans))),
    dsr,
    bestOf: Math.min(9, Math.round(bestOf)),
    bansLong: whole(rules.counterpick_bans_top, 10),
    bestOfLong: bestOfLong !== null && bestOfLong > Math.min(9, Math.round(bestOf)) ? bestOfLong : null,
  };
}
