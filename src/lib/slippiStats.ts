// Slippi replay stats (Melee): a player's own numbers across the replays they drop in. The replays
// are read in their browser (slippiRead.ts); this file only adds the games up, so it can be tested.
// Personal stats only: nothing here ranks people.

/** A count over a total, like openings over kills; added up across games by summing both sides. */
export type Ratio = { count: number; total: number };

export type ReplayPlayer = {
  index: number;
  code: string | null; // Slippi connect code, like "ABC#123"
  name: string | null; // netplay display name or nametag
  character: string;
  won: boolean | null; // null when the replay doesn't say (a disconnect, an unfinished game)
  kills: number;
  damage: number;
  openingsPerKill: Ratio;
  damagePerOpening: Ratio;
  neutralWins: Ratio;
  counterHits: Ratio;
  inputsPerMinute: Ratio;
  lCancels: { success: number; fail: number };
};

export type ReplayGame = {
  file: string;
  startAt: string | null;
  stage: string;
  frames: number;
  players: [ReplayPlayer, ReplayPlayer];
};

export type Tally = { games: number; wins: number; losses: number };

export type ReplayTotals = {
  me: string; // the connect code (or name) the totals are for
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
  byCharacter: (Tally & { name: string })[];
  byOpponentCharacter: (Tally & { name: string })[];
  byStage: (Tally & { name: string })[];
  opponents: (Tally & { name: string })[];
};

/** How a player is told apart across games: their connect code, else their name. */
export const playerKey = (p: Pick<ReplayPlayer, "code" | "name">): string | null => p.code?.trim() || p.name?.trim() || null;

/** The players who appear in the most games first: the person dropping in their replays is usually first. */
export function likelyMe(games: ReplayGame[]): { key: string; games: number }[] {
  const counts = new Map<string, number>();
  for (const g of games) for (const key of new Set(g.players.map(playerKey))) if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  return [...counts].map(([key, n]) => ({ key, games: n })).sort((a, b) => b.games - a.games || a.key.localeCompare(b.key));
}

const ratio = (r: Ratio): number | null => (r.total > 0 ? r.count / r.total : null);
const add = (a: Ratio, b: Ratio): Ratio => ({ count: a.count + b.count, total: a.total + b.total });
const ZERO: Ratio = { count: 0, total: 0 };

function tallyInto(map: Map<string, Tally>, name: string, won: boolean | null) {
  const t = map.get(name) ?? { games: 0, wins: 0, losses: 0 };
  t.games++;
  if (won === true) t.wins++;
  if (won === false) t.losses++;
  map.set(name, t);
}
const sorted = (map: Map<string, Tally>) => [...map].map(([name, t]) => ({ name, ...t })).sort((a, b) => b.games - a.games || a.name.localeCompare(b.name));

/**
 * One player's totals across the games they're in. Rates are worked out from the summed counts and
 * totals (all openings over all kills), not an average of each game's rate, so a short game doesn't
 * count as much as a long one.
 */
export function totalsFor(games: ReplayGame[], me: string): ReplayTotals | null {
  let opk = ZERO, dpo = ZERO, neutral = ZERO, counter = ZERO, ipm = ZERO;
  let lSuccess = 0, lFail = 0, kills = 0, frames = 0, n = 0, wins = 0, losses = 0;
  const chars = new Map<string, Tally>(), oppChars = new Map<string, Tally>(), stages = new Map<string, Tally>(), opps = new Map<string, Tally>();
  for (const g of games) {
    const mine = g.players.find((p) => playerKey(p) === me);
    if (!mine) continue;
    const opp = g.players.find((p) => p !== mine)!;
    n++;
    frames += g.frames;
    if (mine.won === true) wins++;
    if (mine.won === false) losses++;
    kills += mine.kills;
    opk = add(opk, mine.openingsPerKill);
    dpo = add(dpo, mine.damagePerOpening);
    neutral = add(neutral, mine.neutralWins);
    counter = add(counter, mine.counterHits);
    ipm = add(ipm, mine.inputsPerMinute);
    lSuccess += mine.lCancels.success;
    lFail += mine.lCancels.fail;
    tallyInto(chars, mine.character, mine.won);
    tallyInto(oppChars, opp.character, mine.won);
    tallyInto(stages, g.stage, mine.won);
    tallyInto(opps, playerKey(opp) ?? "Unknown", mine.won);
  }
  if (!n) return null;
  return {
    me,
    games: n,
    wins,
    losses,
    minutes: frames / 3600,
    kills,
    openingsPerKill: ratio(opk),
    damagePerOpening: ratio(dpo),
    neutralWinRate: ratio(neutral),
    counterHitRate: ratio(counter),
    inputsPerMinute: ratio(ipm),
    lCancelRate: lSuccess + lFail ? lSuccess / (lSuccess + lFail) : null,
    byCharacter: sorted(chars),
    byOpponentCharacter: sorted(oppChars),
    byStage: sorted(stages),
    opponents: sorted(opps),
  };
}
