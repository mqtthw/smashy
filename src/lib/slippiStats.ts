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

/** One combo in a game (round 760): who landed it, with what, for how much. */
export type ReplayCombo = {
  by: number; // the player index (ReplayPlayer.index) of whoever landed it
  moves: string[]; // short move names in order, like "nair", "utilt", "uair"
  damage: number;
  startPercent: number; // the other player's percent before and after
  endPercent: number;
  killed: boolean;
  seconds: number; // how far into the game it started
  timer: string | null; // the same moment on the game's own clock ("06:12"), when the game has one
};

export type ReplayGame = {
  file: string;
  startAt: string | null;
  stage: string;
  frames: number;
  players: [ReplayPlayer, ReplayPlayer];
  /** The game's best combos by either player. Missing for games not read from a replay file (Slippipedia). */
  combos?: ReplayCombo[];
};

/** A combo is three moves or more: fewer is a hit or a follow-up, and there are hundreds of those. */
export const MIN_COMBO_MOVES = 3;
const COMBOS_PER_GAME = 8;
const KILL_BONUS = 25;

/** How combos are ordered: damage dealt, and a kill counts as 25% more. */
export const comboScore = (c: Pick<ReplayCombo, "damage" | "killed">): number => c.damage + (c.killed ? KILL_BONUS : 0);

/** A combo as the Slippi library reports it. Its `playerIndex` is the player being hit; `lastHitBy` is the attacker. */
export type RawCombo = {
  playerIndex: number;
  lastHitBy?: number | null;
  startFrame: number;
  startPercent: number;
  currentPercent: number;
  endPercent?: number | null;
  didKill: boolean;
  moves: { playerIndex: number; moveId: number; damage: number }[];
};

/**
 * The library's combos for one game, cut down to the ones worth showing: three moves or more, all by
 * one player on the other, the best few first. `timer` turns a frame into the game clock (null if none).
 */
export function keepCombos(raw: RawCombo[], moveName: (id: number) => string, timer: (frame: number) => string | null = () => null): ReplayCombo[] {
  const out: ReplayCombo[] = [];
  for (const c of raw) {
    const by = c.lastHitBy ?? c.moves[0]?.playerIndex;
    if (by === undefined || by === null || by === c.playerIndex) continue;
    const moves = c.moves.filter((m) => m.playerIndex === by);
    if (moves.length < MIN_COMBO_MOVES) continue;
    out.push({
      by,
      moves: moves.map((m) => moveName(m.moveId)),
      damage: Math.round(moves.reduce((n, m) => n + m.damage, 0)),
      startPercent: Math.round(c.startPercent),
      endPercent: Math.round(c.endPercent ?? c.currentPercent),
      killed: c.didKill,
      seconds: Math.max(0, Math.round(c.startFrame / 60)),
      timer: timer(c.startFrame),
    });
  }
  return out.sort((a, b) => comboScore(b) - comboScore(a)).slice(0, COMBOS_PER_GAME);
}

export type BestCombo = ReplayCombo & { file: string; startAt: string | null; stage: string; character: string; opponentCharacter: string; opponent: string | null };

/** One player's best combos across their games, best first (see comboScore). */
export function bestCombos(games: ReplayGame[], me: string, limit = 10): BestCombo[] {
  const all: BestCombo[] = [];
  for (const g of games) {
    const mine = g.players.find((p) => playerKey(p) === me);
    if (!mine) continue;
    const opp = g.players.find((p) => p !== mine)!;
    for (const c of g.combos ?? []) {
      if (c.by !== mine.index) continue;
      all.push({ ...c, file: g.file, startAt: g.startAt, stage: g.stage, character: mine.character, opponentCharacter: opp.character, opponent: playerKey(opp) });
    }
  }
  return all.sort((a, b) => comboScore(b) - comboScore(a) || b.moves.length - a.moves.length).slice(0, limit);
}

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
