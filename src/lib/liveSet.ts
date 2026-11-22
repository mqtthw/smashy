// A live set on Smashy, played from both players' devices: game 1 strikes in the ruleset's pattern,
// then after each game the winner bans and the loser picks (with the stage clause), and each game's
// result is reported by one player and confirmed by the other. Pure functions (shared, tested); the
// server runs them to check every move before saving it.
import { bansAllowed, pickable, strikeOrder, winsNeeded, type GameResult, type Side, type StrikeRules } from "./striking";

export type PlayerSlot = 1 | 2;
export type LiveState = {
  first: PlayerSlot; // who strikes first in game 1 (a coin flip when the set is called)
  struck: string[]; // game 1 strikes
  banned: string[]; // this game's bans
  stage: string | null; // the stage being played now
  games: { stage: string; winner: PlayerSlot }[];
  report: { by: PlayerSlot; winner: PlayerSlot; disputed?: boolean } | null; // a game result waiting for the other player
  /**
   * Quick reporting: a player sends the set's final score (played without the game-by-game room), and
   * the TO confirms or denies it. One report per player, keyed "1"/"2"; cleared when the TO decides.
   */
  finals?: Partial<Record<"1" | "2", FinalReport>>;
  /** Where the set is played at a local ("Setup 3", "Stream"), set by the TO. */
  station?: string;
  /** When the set was called (both players in): how long it has been waiting, whatever else changed since. */
  calledAt?: string;
  /** When it got its place to play: the no-show clock runs from here. */
  stationAt?: string;
  /** Who tapped "I'm here" at the setup, and when (keyed "1"/"2"). */
  here?: Partial<Record<"1" | "2", string>>;
};

/** The lowest-numbered "Setup N" not in use (for a one-tap suggestion). */
export function nextFreeSetup(inUse: (string | null | undefined)[]): string {
  const taken = new Set(inUse.map((s) => s?.match(/^Setup (\d+)$/)?.[1]).filter(Boolean).map(Number));
  let n = 1;
  while (taken.has(n)) n++;
  return `Setup ${n}`;
}

/** A setup name the TO typed, cleaned up: "3" becomes "Setup 3"; up to 20 characters; null if empty. */
export function cleanStation(raw: string): string | null {
  const t = String(raw ?? "").replace(/\s+/g, " ").trim().slice(0, 20);
  if (!t) return null;
  return /^\d{1,3}$/.test(t) ? `Setup ${t}` : t;
}

/** A player's reported final score: `score` is [player 1 games, player 2 games]. */
export type FinalReport = { winner: PlayerSlot; score: [number, number]; at: string };

/** Why a reported final score can't be right, or null if it's fine (the winner reached the wins needed). */
export function finalScoreProblem(bestOf: number, winner: PlayerSlot, score: [number, number]): string | null {
  const need = winsNeeded(bestOf);
  const [a, b] = score.map(Number) as [number, number];
  if (![a, b].every((n) => Number.isInteger(n) && n >= 0)) return "Enter how many games each player won.";
  const [w, l] = winner === 1 ? [a, b] : [b, a];
  if (w !== need) return `In a best of ${bestOf}, the winner takes ${need} game${need === 1 ? "" : "s"}.`;
  if (l >= need) return "The loser can't have as many wins as the winner.";
  return null;
}

/** Both players reported, and their reports say the same thing. */
export function finalsAgree(finals: LiveState["finals"]): FinalReport | null {
  const a = finals?.["1"], b = finals?.["2"];
  return a && b && a.winner === b.winner && a.score[0] === b.score[0] && a.score[1] === b.score[1] ? a : null;
}

export type LivePhase =
  | { kind: "strike"; turn: PlayerSlot; count: number; options: string[] }
  | { kind: "ban"; turn: PlayerSlot; count: number; options: string[] }
  | { kind: "pick"; turn: PlayerSlot; options: string[] }
  | { kind: "play"; stage: string; game: number }
  | { kind: "done"; winner: PlayerSlot };

export type LiveAction = { type: "strike" | "ban" | "pick"; stage: string } | { type: "report"; winner: PlayerSlot };

export function freshLive(rand: () => number = Math.random): LiveState {
  return { first: rand() < 0.5 ? 1 : 2, struck: [], banned: [], stage: null, games: [], report: null };
}

export function liveScore(s: LiveState): [number, number] {
  return [s.games.filter((g) => g.winner === 1).length, s.games.filter((g) => g.winner === 2).length];
}

const other = (p: PlayerSlot): PlayerSlot => (p === 1 ? 2 : 1);
const toSide = (p: PlayerSlot): Side => (p - 1) as Side;
const history = (s: LiveState): GameResult[] => s.games.map((g) => ({ stage: g.stage, winner: toSide(g.winner) }));

/** Game 1 strike turns as player slots (who strikes first comes from the coin flip). */
function strikeTurns(rules: StrikeRules, first: PlayerSlot): PlayerSlot[] {
  return strikeOrder(rules.starters.length, rules.pattern).map((x) => (x === 0 ? first : other(first)));
}

/** What happens next, and whose turn it is. */
export function livePhase(rules: StrikeRules, bestOf: number, s: LiveState): LivePhase {
  const [a, b] = liveScore(s);
  const need = winsNeeded(bestOf);
  if (a >= need || b >= need) return { kind: "done", winner: a >= need ? 1 : 2 };
  if (s.stage) return { kind: "play", stage: s.stage, game: s.games.length + 1 };
  if (s.games.length === 0) {
    const turns = strikeTurns(rules, s.first);
    if (turns.length === 0) return { kind: "play", stage: rules.starters[0], game: 1 }; // one starter: nothing to strike
    const turn = turns[s.struck.length];
    let count = 0;
    for (let i = s.struck.length; i < turns.length && turns[i] === turn; i++) count++;
    return { kind: "strike", turn, count, options: rules.starters.filter((st) => !s.struck.includes(st)) };
  }
  const last = s.games[s.games.length - 1];
  const winner = last.winner;
  const loser = other(winner);
  const allowed = bansAllowed(rules, history(s), toSide(loser), bestOf);
  const pool = [...new Set([...rules.starters, ...rules.counterpicks])];
  if (s.banned.length < allowed) return { kind: "ban", turn: winner, count: allowed - s.banned.length, options: pool.filter((st) => !s.banned.includes(st)) };
  return { kind: "pick", turn: loser, options: pickable(rules, history(s), s.banned, toSide(loser)) };
}

/**
 * Apply one player's move, checking it's their turn and a legal choice. Throws a friendly message if
 * not. Reporting: the first report waits; the other player's matching report records the game; a
 * different report marks it disputed for the host to settle.
 */
export function applyLive(rules: StrikeRules, bestOf: number, s: LiveState, by: PlayerSlot, action: LiveAction): LiveState {
  const phase = livePhase(rules, bestOf, s);
  const next: LiveState = { ...s, struck: [...s.struck], banned: [...s.banned], games: [...s.games], report: s.report ? { ...s.report } : null };
  if (phase.kind === "done") throw new Error("This set is over.");

  if (action.type === "report") {
    if (phase.kind !== "play") throw new Error("Pick the stage first.");
    if (action.winner !== 1 && action.winner !== 2) throw new Error("Say who won the game.");
    if (!next.report || next.report.by === by) {
      next.report = { by, winner: action.winner }; // first report (or changing your own)
      return next;
    }
    if (next.report.winner !== action.winner) {
      next.report = { ...next.report, disputed: true };
      return next;
    }
    return recordGame(next, phase.stage, action.winner);
  }

  if (action.type !== phase.kind) {
    const want = phase.kind === "play" ? "report the game" : phase.kind;
    throw new Error(`It's time to ${want}, not ${action.type}.`);
  }
  if ((phase.kind === "strike" || phase.kind === "ban" || phase.kind === "pick") && phase.turn !== by) throw new Error("It's not your turn.");
  if (!("options" in phase) || !phase.options.includes(action.stage)) throw new Error("That stage can't be chosen right now.");

  if (action.type === "strike") {
    next.struck.push(action.stage);
    const left = rules.starters.filter((st) => !next.struck.includes(st));
    if (left.length === 1) next.stage = left[0];
  } else if (action.type === "ban") {
    next.banned.push(action.stage);
  } else {
    next.stage = action.stage;
  }
  return next;
}

/** Record a game (both players agreed, or the host settled it) and move on to the next game. */
export function recordGame(s: LiveState, stage: string, winner: PlayerSlot): LiveState {
  return { ...s, games: [...s.games, { stage, winner }], banned: [], stage: null, report: null };
}
