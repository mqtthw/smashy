// Swiss: everyone plays a set number of rounds, each round against someone with the same record,
// and nobody is knocked out. This file is the rules, with no database or network in it:
// who plays whom next (swissPairings), the standings (swissStandings), and how many rounds a field
// of a given size needs (swissRounds).
//
// The rules, in plain words:
//   - Round 1 pairs by seed: the top half plays the bottom half (1 v 5, 2 v 6, ... with 8 players).
//   - Later rounds pair players with the same number of wins, again top half against bottom half,
//     and never the same two players twice if that can be avoided.
//   - With an odd number of players, one gets a bye (a free win): the lowest player who hasn't had
//     one yet.
//   - Standings: most wins, then fewest losses, then the strongest opponents (their wins added up),
//     then games won minus games lost, then the original seed.

/** A player in the event. `seed` 1 is the best seed; seeds are unique. */
export type SwissPlayer = { id: string; seed: number };

/**
 * One set. `b` null is a bye for `a`. `winner` null means it hasn't finished (it counts for "these
 * two have met" but not for anyone's record). Games are optional (a DQ has none).
 */
export type SwissSet = { a: string; b: string | null; winner: string | null; aGames?: number | null; bGames?: number | null };

export type SwissStanding = {
  id: string;
  seed: number;
  wins: number;
  losses: number;
  byes: number;
  /** The wins of everyone they played, added up: beating (or losing to) strong players ranks higher. */
  opponentWins: number;
  /** Games won minus games lost. */
  gameDiff: number;
  /** 1 is first. No ties: the seed settles what the rest can't. */
  rank: number;
};

/** Rounds a Swiss of `players` needs for one undefeated player: 2 players -> 1, 8 -> 3, 9-16 -> 4, 33 -> 6. */
export function swissRounds(players: number): number {
  return players < 2 ? 0 : Math.ceil(Math.log2(players));
}

/** The most rounds a field can play without anyone meeting twice (everyone has met everyone after this). */
export function swissMaxRounds(players: number): number {
  return players < 2 ? 0 : players % 2 === 0 ? players - 1 : players;
}

/** Everyone's record and place. Players who left still show (with what they played); pass them in `players`. */
export function swissStandings(players: SwissPlayer[], sets: SwissSet[]): SwissStanding[] {
  const row = new Map(players.map((p) => [p.id, { id: p.id, seed: p.seed, wins: 0, losses: 0, byes: 0, opponentWins: 0, gameDiff: 0, rank: 0 }]));
  const opponents = new Map<string, string[]>(players.map((p) => [p.id, []]));
  for (const s of sets) {
    const a = row.get(s.a);
    if (!a) continue;
    if (s.b === null) {
      if (s.winner === s.a) {
        a.wins++;
        a.byes++;
      }
      continue;
    }
    const b = row.get(s.b);
    if (!b || !s.winner) continue;
    opponents.get(a.id)!.push(b.id);
    opponents.get(b.id)!.push(a.id);
    const [won, lost] = s.winner === a.id ? [a, b] : [b, a];
    won.wins++;
    lost.losses++;
    const diff = (s.aGames ?? 0) - (s.bGames ?? 0);
    a.gameDiff += diff;
    b.gameDiff -= diff;
  }
  for (const r of row.values()) r.opponentWins = opponents.get(r.id)!.reduce((sum, id) => sum + row.get(id)!.wins, 0);
  const sorted = [...row.values()].sort((x, y) => y.wins - x.wins || x.losses - y.losses || y.opponentWins - x.opponentWins || y.gameDiff - x.gameDiff || x.seed - y.seed);
  sorted.forEach((r, i) => (r.rank = i + 1));
  return sorted;
}

export type SwissRound = {
  /** Who plays whom, best table first. Each pair is [higher seed, lower seed]. */
  pairs: [string, string][];
  /** The player sitting this round out with a free win, when the field is odd. */
  bye: string | null;
  /** Pairs that have met before: only when there was no way to avoid it (a small field late on). */
  rematches: number;
};

/**
 * The next round. `active` are the players still in (leave out anyone who dropped or was
 * disqualified); `sets` is everything paired so far, finished or not.
 */
export function swissPairings(active: SwissPlayer[], sets: SwissSet[]): SwissRound {
  const wins = new Map(swissStandings(active, sets).map((s) => [s.id, s.wins]));
  const met = new Set<string>();
  const hadBye = new Set<string>();
  for (const s of sets) {
    if (s.b === null) hadBye.add(s.a);
    else met.add(key(s.a, s.b));
  }
  // The order tables are filled in: most wins first, and inside the same record, best seed first.
  const order = [...active].sort((x, y) => wins.get(y.id)! - wins.get(x.id)! || x.seed - y.seed);

  let bye: string | null = null;
  if (order.length % 2 === 1) {
    // The lowest player who hasn't had a bye; if everyone has, the lowest player again.
    const at = findLastIndex(order, (p) => !hadBye.has(p.id));
    bye = order.splice(at === -1 ? order.length - 1 : at, 1)[0].id;
  }

  const ids = order.map((p) => p.id);
  const score = ids.map((id) => wins.get(id)!);
  const pairsAt = pairUp(ids, score, met, false) ?? pairUp(ids, score, met, true) ?? ids.map((_, i) => i); // the last one can't happen with an even count
  const pairs: [string, string][] = [];
  let rematches = 0;
  for (let i = 0; i < pairsAt.length; i += 2) {
    const [x, y] = [ids[pairsAt[i]], ids[pairsAt[i + 1]]];
    if (met.has(key(x, y))) rematches++;
    pairs.push([x, y]);
  }
  return { pairs, bye, rematches };
}

const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

function findLastIndex<T>(list: T[], test: (item: T) => boolean): number {
  for (let i = list.length - 1; i >= 0; i--) if (test(list[i])) return i;
  return -1;
}

/**
 * Pair everyone in `ids` (already in table order, an even count). Returns the positions in pairing
 * order ([first of pair 1, second of pair 1, first of pair 2, ...]) or null when it can't be done
 * without a rematch (and `allowRematch` is off) or the search runs out of budget.
 *
 * It takes the highest unpaired player and tries partners in order of preference: in their own
 * record group, the player half a group below them (top half v bottom half), then the ones around
 * that; then the next groups down, best first. If a choice leaves someone unpairable further down,
 * it backs up and tries the next one.
 */
function pairUp(ids: string[], score: number[], met: Set<string>, allowRematch: boolean): number[] | null {
  const n = ids.length;
  const used = new Array<boolean>(n).fill(false);
  const out: number[] = [];
  let budget = 200_000; // tries; a real event needs a few hundred

  const candidates = (p: number): number[] => {
    // p's record group among the players still unpaired (p is the first of them).
    const group: number[] = [];
    const lower: number[] = [];
    for (let i = p + 1; i < n; i++) if (!used[i]) (score[i] === score[p] ? group : lower).push(i);
    // Top half v bottom half: with p first of g+1 players, the wanted partner is half a group down.
    const want = Math.floor((group.length + 1) / 2) - 1;
    const inGroup = group.map((i, at) => ({ i, far: Math.abs(at - want) + (at < want ? 0.5 : 0) })).sort((x, y) => x.far - y.far).map((x) => x.i);
    const all = [...inGroup, ...lower];
    if (!allowRematch) return all.filter((i) => !met.has(key(ids[p], ids[i])));
    // Rematches allowed: still try everyone they haven't played first.
    return [...all.filter((i) => !met.has(key(ids[p], ids[i]))), ...all.filter((i) => met.has(key(ids[p], ids[i])))];
  };

  const solve = (): boolean => {
    const p = used.indexOf(false);
    if (p === -1) return true;
    used[p] = true;
    for (const c of candidates(p)) {
      if (--budget < 0) break;
      used[c] = true;
      out.push(p, c);
      if (solve()) return true;
      out.length -= 2;
      used[c] = false;
    }
    used[p] = false;
    return false;
  };
  return solve() ? out : null;
}
