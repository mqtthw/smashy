// Bracket engine for events hosted on Smashy: builds single elimination, double elimination and round
// robin brackets from a seeding, moves players forward when results come in (byes pass through on
// their own), lets a host undo a result while the next sets haven't been played, and works out final
// placements. Swiss is built one round at a time (the pairing rules are in swiss.ts).
// Pure functions on plain objects (no database), so it's fully unit-tested.
import { swissPairings, swissRounds as usualSwissRounds, swissStandings, type SwissPlayer, type SwissSet, type SwissStanding } from "./swiss";

/** W/L/GF/GF2: elimination sides. RR: round robin. SW: Swiss (`round` is the Swiss round). */
export type BracketKind = "W" | "L" | "GF" | "GF2" | "RR" | "SW";
export type EngineState = "waiting" | "ready" | "live" | "done" | "bye" | "skipped";
/** A player slot: a person, a bye, or (id null, bye false) still waiting for someone. */
export type Slot = { id: string | null; bye: boolean };
export type Link = { key: string; slot: 1 | 2 };

export type EngineSet = {
  key: string;
  bracket: BracketKind;
  round: number;
  idx: number;
  pool: number | null;
  identifier: string | null;
  bestOf: number;
  p: [Slot, Slot];
  score: [number | null, number | null]; // games won; -1 = DQ
  winner: 1 | 2 | null;
  state: EngineState;
  winnerTo: Link | null;
  loserTo: Link | null;
};

const empty = (): Slot => ({ id: null, bye: false });
const filled = (s: Slot) => s.bye || s.id !== null;

/** Seed positions for a bracket of `size` (a power of 2): 8 -> [1, 8, 4, 5, 2, 7, 3, 6]. */
export function seedOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const n = order.length * 2;
    order = order.flatMap((s) => [s, n + 1 - s]);
  }
  return order;
}

function letters(i: number): string {
  let s = "";
  let n = i + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** When a set is played, roughly (W1, L1, W2, L2, L3, W3, L4, …, grand finals). */
export function playOrder(s: Pick<EngineSet, "bracket" | "round" | "pool" | "idx">): number {
  if (s.bracket === "W") return 2 * (s.round - 1);
  if (s.bracket === "L") return s.round + 0.5;
  if (s.bracket === "GF") return 1000;
  if (s.bracket === "GF2") return 1001;
  return s.round; // round robin, Swiss
}

/**
 * The seeds an elimination bracket was built from, read off its first winners round (seed 1 meets
 * the last seed, and so on). Empty for a round robin, which has no such shape.
 */
export function eliminationSeeds(sets: EngineSet[]): Map<string, number> {
  const seeds = new Map<string, number>();
  const first = sets.filter((s) => s.bracket === "W" && s.round === 1);
  const order = seedOrder(first.length * 2);
  for (const s of first) {
    s.p.forEach((slot, i) => {
      const seed = order[2 * s.idx + i];
      if (slot.id && seed) seeds.set(slot.id, seed);
    });
  }
  return seeds;
}

/** A round's name as the bracket shows it ("Winners Semi-Final", "Losers Round 2", "Grand Final"). */
export function roundLabel(s: Pick<EngineSet, "bracket" | "round">, maxW: number, maxL: number, single: boolean): string {
  if (s.bracket === "GF") return "Grand Final";
  if (s.bracket === "GF2") return "Grand Final Reset";
  if (s.bracket === "RR" || s.bracket === "SW") return `Round ${s.round}`;
  if (s.bracket === "W") {
    const fromEnd = maxW - s.round;
    const side = single ? "" : "Winners ";
    return fromEnd === 0 ? `${side}Final` : fromEnd === 1 ? `${side}Semi-Final` : fromEnd === 2 ? `${side}Quarter-Final` : `${side}Round ${s.round}`;
  }
  const fromEnd = maxL - s.round;
  return fromEnd === 0 ? "Losers Final" : fromEnd === 1 ? "Losers Semi-Final" : fromEnd === 2 ? "Losers Quarter-Final" : `Losers Round ${s.round}`;
}

/**
 * Orders a player's open sets by which to play now: the one being played first, then by when it's
 * played (round, then pool, then position). In a round robin every set of a pool is ready at once,
 * so "the first one found" used to point two opponents at different sets.
 */
export function byPlayNow(a: Pick<EngineSet, "state" | "bracket" | "round" | "pool" | "idx">, b: Pick<EngineSet, "state" | "bracket" | "round" | "pool" | "idx">): number {
  return Number(b.state === "live") - Number(a.state === "live") || playOrder(a) - playOrder(b) || (a.pool ?? 0) - (b.pool ?? 0) || a.idx - b.idx;
}

/** The set this player should be playing now (called or in progress), if any. */
export function currentSetFor(sets: EngineSet[], playerId: string): EngineSet | undefined {
  return sets.filter((s) => (s.state === "ready" || s.state === "live") && (s.p[0].id === playerId || s.p[1].id === playerId)).sort(byPlayNow)[0];
}

function assignIdentifiers(sets: EngineSet[]) {
  const shown = sets.filter((s) => s.state !== "bye" && s.state !== "skipped" || s.bracket === "GF2");
  shown.sort((a, b) => playOrder(a) - playOrder(b) || (a.pool ?? 0) - (b.pool ?? 0) || a.idx - b.idx);
  shown.forEach((s, i) => (s.identifier = letters(i)));
}

/** Put a player (or a bye) into a slot, then let byes pass through. */
function place(map: Map<string, EngineSet>, to: Link | null, value: Slot) {
  if (!to) return;
  const t = map.get(to.key);
  if (!t) return;
  t.p[to.slot - 1] = { ...value };
}

/**
 * Settle the bracket: a set with a player against a bye is won by the player automatically (and the
 * bye goes on to the loser's next set); two byes make a bye. Sets with two players become "ready".
 */
function settle(map: Map<string, EngineSet>) {
  for (let changed = true; changed; ) {
    changed = false;
    for (const s of map.values()) {
      if (s.state !== "waiting" || !filled(s.p[0]) || !filled(s.p[1])) continue;
      if (!s.p[0].bye && !s.p[1].bye) {
        s.state = "ready";
        changed = true;
      } else if (s.p[0].bye && s.p[1].bye) {
        s.state = "bye";
        place(map, s.winnerTo, { id: null, bye: true });
        place(map, s.loserTo, { id: null, bye: true });
        changed = true;
      } else {
        const w: 1 | 2 = s.p[0].bye ? 2 : 1;
        s.winner = w;
        s.state = "bye";
        place(map, s.winnerTo, s.p[w - 1]);
        place(map, s.loserTo, { id: null, bye: true });
        changed = true;
      }
    }
  }
}

function topSet(s: EngineSet, winnersRounds: number, losersRounds: number, bracketSize: number): boolean {
  // "Top 8" sets (longer best-of): grand finals; and in a bracket over 8 players, the last 2 winners
  // rounds and the last 4 losers rounds (8 or fewer players left). In 8 or fewer, everything.
  // Single elimination has no losers side, so its top 8 starts a round earlier (the quarter-finals).
  if (bracketSize <= 8) return true;
  if (s.bracket === "GF" || s.bracket === "GF2") return true;
  if (s.bracket === "W") return s.round >= winnersRounds - (losersRounds === 0 ? 2 : 1);
  if (s.bracket === "L") return s.round >= losersRounds - 3;
  return false;
}

/** A single or double elimination bracket from a seeding (seed 1 first). Needs at least 2 players. */
export function buildElimination(seeds: string[], opts: { double: boolean; bestOf: number; bestOfTop?: number | null }): EngineSet[] {
  const n = seeds.length;
  if (n < 2) throw new Error("A bracket needs at least 2 players.");
  const size = 2 ** Math.ceil(Math.log2(n));
  const k = Math.log2(size); // winners rounds
  const sets: EngineSet[] = [];
  const mk = (bracket: BracketKind, round: number, idx: number): EngineSet => ({
    key: `${bracket}${round}-${idx}`,
    bracket,
    round,
    idx,
    pool: null,
    identifier: null,
    bestOf: opts.bestOf,
    p: [empty(), empty()],
    score: [null, null],
    winner: null,
    state: "waiting",
    winnerTo: null,
    loserTo: null,
  });

  // Winners side.
  const order = seedOrder(size);
  for (let r = 1; r <= k; r++) {
    for (let i = 0; i < size / 2 ** r; i++) {
      const s = mk("W", r, i);
      if (r === 1) {
        const [a, b] = [order[2 * i], order[2 * i + 1]];
        s.p = [a <= n ? { id: seeds[a - 1], bye: false } : { id: null, bye: true }, b <= n ? { id: seeds[b - 1], bye: false } : { id: null, bye: true }];
      }
      if (r < k) s.winnerTo = { key: `W${r + 1}-${Math.floor(i / 2)}`, slot: ((i % 2) + 1) as 1 | 2 };
      sets.push(s);
    }
  }

  const losersRounds = opts.double ? Math.max(0, 2 * k - 2) : 0;
  if (opts.double) {
    const gf = mk("GF", 1, 0);
    const gf2 = mk("GF2", 1, 0);
    gf2.state = "skipped"; // only played if the losers-side player wins the grand final
    sets.push(gf, gf2);
    const wf = sets.find((s) => s.bracket === "W" && s.round === k)!;
    wf.winnerTo = { key: gf.key, slot: 1 };
    if (k === 1) {
      wf.loserTo = { key: gf.key, slot: 2 };
    } else {
      // Losers round 1: the losers of winners round 1, in pairs.
      for (let j = 0; j < size / 4; j++) sets.push(mk("L", 1, j));
      for (let i = 0; i < size / 2; i++) {
        const w = sets.find((s) => s.key === `W1-${i}`)!;
        w.loserTo = { key: `L1-${Math.floor(i / 2)}`, slot: ((i % 2) + 1) as 1 | 2 };
      }
      for (let m = 1; m <= k - 1; m++) {
        // Losers round 2m: winners of the round before vs. people dropping from winners round m+1.
        const count = size / 2 ** (m + 1);
        for (let j = 0; j < count; j++) sets.push(mk("L", 2 * m, j));
        for (let j = 0; j < count; j++) {
          const prev = sets.find((s) => s.key === `L${2 * m - 1}-${j}`)!;
          prev.winnerTo = { key: `L${2 * m}-${j}`, slot: 1 };
          // Drop-downs alternate direction so people don't meet again right away.
          const wIdx = m % 2 === 1 ? count - 1 - j : j;
          const w = sets.find((s) => s.key === `W${m + 1}-${wIdx}`)!;
          w.loserTo = { key: `L${2 * m}-${j}`, slot: 2 };
        }
        if (m <= k - 2) {
          // Losers round 2m+1: the winners of round 2m, in pairs.
          for (let j = 0; j < count / 2; j++) sets.push(mk("L", 2 * m + 1, j));
          for (let j = 0; j < count; j++) {
            const s = sets.find((x) => x.key === `L${2 * m}-${j}`)!;
            s.winnerTo = { key: `L${2 * m + 1}-${Math.floor(j / 2)}`, slot: ((j % 2) + 1) as 1 | 2 };
          }
        }
      }
      const lf = sets.find((s) => s.key === `L${losersRounds}-0`)!;
      lf.winnerTo = { key: gf.key, slot: 2 };
    }
  }

  if (opts.bestOfTop && opts.bestOfTop !== opts.bestOf) {
    for (const s of sets) if (topSet(s, k, losersRounds, size)) s.bestOf = opts.bestOfTop;
  }
  const map = new Map(sets.map((s) => [s.key, s]));
  settle(map);
  assignIdentifiers(sets);
  return sets;
}

/** Round robin: pools of up to 8 (snake seeding), everyone in a pool plays everyone once. */
export function buildRoundRobin(seeds: string[], opts: { bestOf: number }): EngineSet[] {
  const n = seeds.length;
  if (n < 2) throw new Error("Round robin needs at least 2 players.");
  const pools = Math.ceil(n / 8);
  const members: string[][] = Array.from({ length: pools }, () => []);
  seeds.forEach((id, i) => {
    const row = Math.floor(i / pools);
    const pos = i % pools;
    members[row % 2 === 0 ? pos : pools - 1 - pos].push(id);
  });
  const sets: EngineSet[] = [];
  members.forEach((list, p) => {
    const ring: (string | null)[] = list.length % 2 ? [...list, null] : [...list];
    const m = ring.length;
    for (let r = 0; r < m - 1; r++) {
      let idx = 0;
      for (let i = 0; i < m / 2; i++) {
        const a = ring[i];
        const b = ring[m - 1 - i];
        if (a && b) {
          sets.push({
            key: `RR${p + 1}-${r + 1}-${idx}`,
            bracket: "RR",
            round: r + 1,
            idx: idx++,
            pool: p + 1,
            identifier: null,
            bestOf: opts.bestOf,
            p: [{ id: a, bye: false }, { id: b, bye: false }],
            score: [null, null],
            winner: null,
            state: "ready",
            winnerTo: null,
            loserTo: null,
          });
        }
      }
      ring.splice(1, 0, ring.pop()!); // circle method: keep the first, rotate the rest
    }
  });
  assignIdentifiers(sets);
  return sets;
}

// ---------- Swiss ----------

const isSwiss = (s: Pick<EngineSet, "bracket">) => s.bracket === "SW";

/**
 * The seeds a Swiss event started with, read off round 1 (table 1 is seed 1 against the first seed
 * of the bottom half, and so on; the bye, if there is one, is the last seed).
 */
export function swissSeeds(sets: EngineSet[]): SwissPlayer[] {
  const first = sets.filter((s) => isSwiss(s) && s.round === 1).sort((a, b) => a.idx - b.idx);
  const tables = first.filter((s) => s.p[0].id && s.p[1].id);
  const out: SwissPlayer[] = [];
  tables.forEach((s, i) => out.push({ id: s.p[0].id!, seed: i + 1 }, { id: s.p[1].id!, seed: i + 1 + tables.length }));
  const bye = first.find((s) => s.p[0].id && !s.p[1].id);
  if (bye) out.push({ id: bye.p[0].id!, seed: 2 * tables.length + 1 });
  return out.sort((a, b) => a.seed - b.seed);
}

/** The Swiss sets as the pairing rules read them (a bye is a win with no opponent; a DQ has no games). */
function swissSets(sets: EngineSet[]): SwissSet[] {
  return sets
    .filter((s) => isSwiss(s) && s.p[0].id)
    .map((s) => ({
      a: s.p[0].id!,
      b: s.p[1].id,
      winner: !s.p[1].id ? s.p[0].id : s.state === "done" && s.winner ? s.p[s.winner - 1].id : null,
      aGames: Math.max(0, s.score[0] ?? 0),
      bGames: Math.max(0, s.score[1] ?? 0),
    }));
}

/** Swiss players who are out of the remaining rounds: anyone disqualified from a set (a no-show). */
export function swissDropped(sets: EngineSet[]): Set<string> {
  const out = new Set<string>();
  for (const s of sets) {
    if (!isSwiss(s) || s.state !== "done") continue;
    s.score.forEach((x, i) => {
      const id = s.p[i].id;
      if (x === -1 && id) out.add(id);
    });
  }
  return out;
}

/** Swiss standings: everyone who started, in order (see swissStandings for the tiebreaks). */
export function swissTable(sets: EngineSet[]): SwissStanding[] {
  return swissStandings(swissSeeds(sets), swissSets(sets));
}

/** How many rounds this Swiss event has: the host's setting, or the usual number for how many started. */
export function swissTotalRounds(sets: EngineSet[], setting?: number | null): number {
  return setting ?? usualSwissRounds(swissSeeds(sets).length);
}

/** The latest Swiss round that has sets, and whether every Swiss set so far has a result (round 632: not just the latest round's). */
export function swissProgress(sets: EngineSet[]): { round: number; complete: boolean } {
  const swiss = sets.filter(isSwiss);
  const round = Math.max(0, ...swiss.map((s) => s.round));
  return { round, complete: round > 0 && swiss.every((s) => s.state === "done" || s.state === "bye") };
}

/**
 * The sets of the next Swiss round (round 1 when `sets` has none). `players` is who is in: for
 * round 1 the seeding, later swissSeeds() without swissDropped(). Empty when fewer than 2 players
 * are left. The keys are placeholders: give the sets real ids before saving.
 */
export function buildSwissRound(players: SwissPlayer[], sets: EngineSet[], opts: { bestOf: number }): EngineSet[] {
  if (players.length < 2) return [];
  const round = swissProgress(sets).round + 1;
  const paired = swissPairings(players, swissSets(sets));
  const lettered = sets.filter((s) => isSwiss(s) && s.state !== "bye").length; // letters carry on from the earlier rounds
  // Pool 1: every set of a first part (round robin pools, Swiss) has a pool number; only elimination sets have none.
  const base = { bracket: "SW" as const, round, pool: 1, bestOf: opts.bestOf, winnerTo: null, loserTo: null };
  const out: EngineSet[] = paired.pairs.map(([a, b], i) => ({
    ...base,
    key: `SW${round}-${i}`,
    idx: i,
    identifier: letters(lettered + i),
    p: [{ id: a, bye: false }, { id: b, bye: false }],
    score: [null, null],
    winner: null,
    state: "ready",
  }));
  if (paired.bye) {
    // A bye is a set that's already won: it counts as a win in the standings and is never shown as a set to play.
    out.push({ ...base, key: `SW${round}-bye`, idx: paired.pairs.length, identifier: null, p: [{ id: paired.bye, bye: false }, { id: null, bye: true }], score: [null, null], winner: 1, state: "bye" });
  }
  return out;
}

/** The grand final reset set (double elimination only). */
function resetSet(map: Map<string, EngineSet>): EngineSet | undefined {
  for (const s of map.values()) if (s.bracket === "GF2") return s;
  return undefined;
}

function cloneSets(sets: EngineSet[]): Map<string, EngineSet> {
  return new Map(sets.map((s) => [s.key, { ...s, p: [{ ...s.p[0] }, { ...s.p[1] }] as [Slot, Slot], score: [...s.score] as [number | null, number | null] }]));
}

/** Changes from `before` to `after` (only the sets that differ). */
function diff(before: EngineSet[], after: Map<string, EngineSet>): EngineSet[] {
  const old = new Map(before.map((s) => [s.key, JSON.stringify(s)]));
  return [...after.values()].filter((s) => old.get(s.key) !== JSON.stringify(s));
}

/**
 * Record a result: the winner moves on, the loser drops (double elimination) or is out, and byes
 * pass through. Grand final: if the losers-side player (slot 2) wins, the reset set is played.
 * Returns only the sets that changed. Throws if the set can't take a result.
 */
export function reportResult(sets: EngineSet[], key: string, winner: 1 | 2, score: [number, number]): EngineSet[] {
  const map = cloneSets(sets);
  const s = map.get(key);
  if (!s) throw new Error("That set isn't in this bracket.");
  if (s.state !== "ready" && s.state !== "live") throw new Error(s.state === "done" ? "That set already has a result." : "Both players aren't in this set yet.");
  if (score.some((x) => !Number.isInteger(x) || x < -1 || x > 9)) throw new Error("Scores must be 0–9 (or DQ).");
  if (score[0] === -1 && score[1] === -1) throw new Error("Only one player can be DQ'd.");
  if (score[winner - 1] === -1) throw new Error("The winner can't be the one DQ'd.");
  s.score = score;
  s.winner = winner;
  s.state = "done";
  const w = s.p[winner - 1];
  const l = s.p[2 - winner];
  if (s.bracket === "GF") {
    const reset = resetSet(map);
    // The losers-side player won: the reset is played, unless the other finalist was DQ'd (they're
    // out of the event, so there's nobody to play it against).
    if (winner === 2 && reset && score[0] !== -1) {
      reset.p = [{ ...s.p[0] }, { ...s.p[1] }];
      reset.state = "ready";
    }
  } else {
    place(map, s.winnerTo, w);
    // A DQ'd player is out of the event: they don't drop to the losers side (their spot becomes a bye).
    place(map, s.loserTo, score[2 - winner] === -1 ? { id: null, bye: true } : l);
  }
  settle(map);
  return diff(sets, map);
}

/** Every set a result feeds into, including sets that byes then completed on their own. */
function downstream(map: Map<string, EngineSet>, s: EngineSet): EngineSet[] {
  const out: EngineSet[] = [];
  const visit = (link: Link | null) => {
    const t = link ? map.get(link.key) : undefined;
    if (!t) return;
    out.push(t);
    if (t.state === "bye") {
      visit(t.winnerTo);
      visit(t.loserTo);
    }
  };
  visit(s.winnerTo);
  visit(s.loserTo);
  if (s.bracket === "GF") {
    const reset = resetSet(map);
    if (reset) out.push(reset);
  }
  return out;
}

/**
 * True if a result can still be undone: nothing it led to has been played yet. `forFix`: undone only to
 * be reported the other way straight away (a fix), which may change a pool or an earlier Swiss round's
 * result after later parts were built from it; a plain undo may not (round 632: it put the set back up
 * to be played, calling its players again, while the next part had already moved on).
 */
export function canUndo(sets: EngineSet[], key: string, forFix = false): boolean {
  const map = cloneSets(sets);
  const s = map.get(key);
  if (!s || s.state !== "done") return false;
  if (!forFix && !isElimination(s)) {
    if (sets.some(isElimination)) return false;
    if (isSwiss(s) && sets.some((t) => isSwiss(t) && t.round > s.round)) return false;
  }
  return downstream(map, s).every((t) => t.state !== "done");
}

/** Undo a result (host fixing a mistake): the players it moved come back out of later sets. */
export function undoResult(sets: EngineSet[], key: string, forFix = false): EngineSet[] {
  if (!canUndo(sets, key, forFix)) throw new Error("A later set was already played. Undo that one first.");
  const map = cloneSets(sets);
  const s = map.get(key)!;
  const clear = (link: Link | null) => {
    const t = link ? map.get(link.key) : undefined;
    if (!t) return;
    if (t.state === "bye") {
      // It was completed by a bye using this player: undo that too.
      clear(t.winnerTo);
      clear(t.loserTo);
      t.winner = null;
    }
    t.p[link!.slot - 1] = empty();
    t.state = "waiting";
  };
  if (s.bracket === "GF") {
    const reset = resetSet(map);
    if (reset) {
      reset.p = [empty(), empty()];
      reset.state = "skipped";
      reset.score = [null, null];
      reset.winner = null;
    }
  } else {
    clear(s.winnerTo);
    clear(s.loserTo);
  }
  s.score = [null, null];
  s.winner = null;
  s.state = "ready";
  return diff(sets, map);
}

/** Apply changed sets onto a full list (by key). */
function applyChanges(sets: EngineSet[], changed: EngineSet[]): EngineSet[] {
  const map = new Map(sets.map((s) => [s.key, s]));
  for (const c of changed) map.set(c.key, c);
  return [...map.values()];
}

/** Played sets that came after this one (fed by it, directly or through other played sets). */
export function laterPlayed(sets: EngineSet[], key: string): EngineSet[] {
  const map = cloneSets(sets);
  const start = map.get(key);
  if (!start) return [];
  const seen = new Set<string>();
  const out: EngineSet[] = [];
  const walk = (s: EngineSet) => {
    for (const t of downstream(map, s)) {
      if (seen.has(t.key)) continue;
      seen.add(t.key);
      if (t.state === "done") out.push(t);
      if (t.state === "done" || t.state === "bye") walk(t);
    }
  };
  walk(start);
  return out;
}

/**
 * Fix a result after the fact (host). Same winner, no DQ involved: just the score changes, even if
 * later sets were played. Otherwise who advances changes, so every later played set that depended on
 * it is cleared (players go back in, to be played again) before the new result is recorded.
 * Returns the changed sets and the keys of the later sets that were cleared.
 */
export function fixResult(sets: EngineSet[], key: string, winner: 1 | 2, score: [number, number]): { changed: EngineSet[]; cleared: string[] } {
  const s = sets.find((x) => x.key === key);
  if (!s) throw new Error("That set isn't in this bracket.");
  if (s.state !== "done") return { changed: reportResult(sets, key, winner, score), cleared: [] };
  if (score.some((x) => !Number.isInteger(x) || x < -1 || x > 9)) throw new Error("Scores must be 0–9 (or DQ).");
  if (score[winner - 1] === -1) throw new Error("The winner can't be the one DQ'd.");
  const dq = (sc: [number | null, number | null]) => sc.includes(-1);
  if (s.winner === winner && !dq(s.score) && !dq(score)) {
    return { changed: [{ ...s, score }], cleared: [] };
  }
  const later = laterPlayed(sets, key);
  let work = sets;
  const pending = new Set(later.map((t) => t.key));
  // Undo the latest results first: each one only once nothing after it is played.
  while (pending.size) {
    const next = [...pending].find((k) => canUndo(work, k));
    if (!next) throw new Error("Couldn't clear the later sets. Undo them one by one instead.");
    work = applyChanges(work, undoResult(work, next));
    pending.delete(next);
  }
  work = applyChanges(work, undoResult(work, key, true));
  work = applyChanges(work, reportResult(work, key, winner, score));
  return { changed: diff(sets, new Map(work.map((x) => [x.key, x]))), cleared: later.map((t) => t.key) };
}

/**
 * The grand final settles the bracket without a reset: the winners-side player won it, the
 * winners-side player was DQ'd in it, or DQs earlier left only one finalist (the final is then a
 * bye, won without playing).
 */
function grandFinalDecides(gf: EngineSet): boolean {
  if (gf.state === "bye") return true;
  return gf.state === "done" && (gf.winner === 1 || gf.score[0] === -1);
}

// ---------- A first part (pools or Swiss) and a final bracket ----------

/** The event settings the engine needs beyond the sets themselves. */
export type EventShape = {
  /** Swiss: the host's number of rounds (empty = the usual number for the field). */
  swissRounds?: number | null;
  /** Set when pools or Swiss are followed by a final bracket. */
  finalFormat?: string | null;
};

/** A set of the elimination part (the whole bracket of an elimination event, or the final bracket after pools or Swiss). */
export const isElimination = (s: Pick<EngineSet, "bracket">) => s.bracket !== "RR" && s.bracket !== "SW";

/**
 * True once the first part is fully played: every round robin set, or the last Swiss round (or too
 * few Swiss players left to pair another round). False when there is no first part.
 */
export function firstPartDone(sets: EngineSet[], swissRounds?: number | null): boolean {
  if (sets.some(isSwiss)) {
    const { round, complete } = swissProgress(sets);
    if (!complete) return false;
    const dropped = swissDropped(sets);
    return round >= swissTotalRounds(sets, swissRounds) || swissSeeds(sets).filter((p) => !dropped.has(p.id)).length < 2;
  }
  const pools = sets.filter((s) => s.bracket === "RR");
  return pools.length > 0 && pools.every((s) => s.state === "done");
}

/** Where a player sits in the seeding (unknown players last). */
const seedAt = (seedOrder: string[], id: string) => {
  const at = seedOrder.indexOf(id);
  return at === -1 ? Number.MAX_SAFE_INTEGER : at;
};

/**
 * Who goes through to the final bracket, best first (this is its seeding). Swiss: the top of the
 * standings, without anyone who left. Round robin: every pool's 1st place, then every 2nd place,
 * and so on, each group ordered by sets won and game difference; players still level after that
 * go in seed order (`seedOrder`: everyone's id, best seed first), so the cut is never arbitrary.
 */
export function finalQualifiers(sets: EngineSet[], size: number, seedOrder: string[] = []): string[] {
  if (sets.some(isSwiss)) {
    const dropped = swissDropped(sets);
    return swissTable(sets).filter((r) => !dropped.has(r.id)).slice(0, size).map((r) => r.id);
  }
  // A player DQ'd in their pool (they left) doesn't go through (round 632).
  const out = disqualified(sets);
  return [...roundRobinStandings(sets)]
    .filter((r) => !out.has(r.id))
    .sort((a, b) => a.place - b.place || b.wins - a.wins || b.gameDiff - a.gameDiff || seedAt(seedOrder, a.id) - seedAt(seedOrder, b.id) || a.pool - b.pool)
    .slice(0, size)
    .map((r) => r.id);
}

/**
 * The final bracket after pools or Swiss: an elimination bracket of the top `size` players, seeded
 * by where they finished. Its sets' letters carry on from the first part. Empty when fewer than 2
 * players qualify. The keys are placeholders: give the sets real ids (and repoint the links) before saving.
 */
export function buildFinal(sets: EngineSet[], size: number, opts: { double: boolean; bestOf: number; bestOfTop?: number | null; seedOrder?: string[] }): EngineSet[] {
  const seeds = finalQualifiers(sets, size, opts.seedOrder);
  if (seeds.length < 2) return [];
  const built = buildElimination(seeds, opts);
  const lettered = sets.filter((s) => s.identifier).length;
  const order = built.filter((s) => s.identifier).sort((a, b) => playOrder(a) - playOrder(b) || a.idx - b.idx);
  order.forEach((s, i) => (s.identifier = letters(lettered + i)));
  return built;
}

/**
 * True once the event is over. An elimination bracket: it has a champion. Pools or Swiss alone:
 * the first part is fully played. Pools or Swiss with a final bracket (`event.finalFormat`, or the
 * final's sets already exist): the final bracket has a champion.
 */
export function isFinished(sets: EngineSet[], event: EventShape = {}): boolean {
  const first = sets.filter((s) => !isElimination(s));
  if (first.length) {
    const final = sets.filter(isElimination);
    if (final.length) return isFinished(final);
    return !event.finalFormat && firstPartDone(first, event.swissRounds);
  }
  const gf = sets.find((s) => s.bracket === "GF");
  const reset = sets.find((s) => s.bracket === "GF2");
  if (gf) return grandFinalDecides(gf) || (gf.state === "done" && reset?.state === "done");
  const finalRound = Math.max(...sets.filter((s) => s.bracket === "W").map((s) => s.round));
  return sets.some((s) => s.bracket === "W" && s.round === finalRound && (s.state === "done" || s.state === "bye"));
}

export type Placement = { id: string; place: number };

/**
 * Final placements for an elimination bracket: people knocked out in the same round share a place
 * (1, 2, 3, 4, 5, 5, 7, 7, 9…). Only meaningful once the bracket is finished.
 */
/** The player this finished set knocks out of an elimination bracket, if any (losers side, grand final, a DQ; any loss in single elimination). */
export function knockedOut(sets: EngineSet[], s: EngineSet): string | null {
  if (s.state !== "done" || !s.winner || s.bracket === "RR" || s.bracket === "SW") return null;
  const double = sets.some((x) => x.bracket === "GF");
  const loser = s.p[2 - s.winner].id;
  const dq = s.score[2 - s.winner] === -1;
  const eliminates = double
    ? s.bracket === "L" || s.bracket === "GF2" || (s.bracket === "GF" && (s.winner === 1 || dq)) || (s.bracket === "W" && dq)
    : s.bracket === "W";
  return eliminates ? loser : null;
}

export function eliminationPlacements(sets: EngineSet[]): Placement[] {
  const double = sets.some((s) => s.bracket === "GF");
  // When someone was knocked out, on one timeline across both sides: later = better.
  const stage = (s: EngineSet) => playOrder(s);
  const out = new Map<string, number>(); // id -> stage knocked out
  let champion: string | null = null;
  for (const s of sets) {
    if (s.state !== "done" || !s.winner) continue;
    const winner = s.p[s.winner - 1].id;
    const out_ = knockedOut(sets, s);
    if (out_) out.set(out_, stage(s));
    const lastSet = double ? (s.bracket === "GF2" || (s.bracket === "GF" && grandFinalDecides(s))) : !s.winnerTo;
    if (lastSet && winner) champion = winner;
  }
  // A final won without playing (DQs left one finalist, so the final is a bye): they're the champion.
  if (!champion) {
    const last = double ? sets.find((s) => s.bracket === "GF") : sets.find((s) => s.bracket === "W" && !s.winnerTo);
    if (last?.state === "bye" && last.winner) champion = last.p[last.winner - 1].id;
  }
  const stages = [...out.values()];
  const result: Placement[] = [];
  if (champion) result.push({ id: champion, place: 1 });
  for (const [id, st] of out) result.push({ id, place: 1 + (champion ? 1 : 0) + stages.filter((x) => x > st).length });
  return result.sort((a, b) => a.place - b.place);
}

export type PoolStanding = { id: string; pool: number; wins: number; losses: number; gameDiff: number; place: number };

/** Round robin standings per pool: most set wins, then best game difference. */
export function roundRobinStandings(sets: EngineSet[]): PoolStanding[] {
  const rows = new Map<string, PoolStanding>();
  const row = (id: string, pool: number) => rows.get(id) ?? rows.set(id, { id, pool, wins: 0, losses: 0, gameDiff: 0, place: 0 }).get(id)!;
  for (const s of sets) {
    if (s.bracket !== "RR") continue;
    const [a, b] = [s.p[0].id, s.p[1].id];
    if (!a || !b) continue;
    const ra = row(a, s.pool ?? 1);
    const rb = row(b, s.pool ?? 1);
    if (s.state !== "done" || !s.winner) continue;
    const [x, y] = [Math.max(0, s.score[0] ?? 0), Math.max(0, s.score[1] ?? 0)];
    ra.gameDiff += x - y;
    rb.gameDiff += y - x;
    (s.winner === 1 ? ra : rb).wins++;
    (s.winner === 1 ? rb : ra).losses++;
  }
  const byPool = new Map<number, PoolStanding[]>();
  for (const r of rows.values()) byPool.set(r.pool, [...(byPool.get(r.pool) ?? []), r]);
  const out: PoolStanding[] = [];
  for (const [, list] of [...byPool].sort((a, b) => a[0] - b[0])) {
    list.sort((a, b) => b.wins - a.wins || b.gameDiff - a.gameDiff);
    list.forEach((r, i) => (r.place = i > 0 && list[i - 1].wins === r.wins && list[i - 1].gameDiff === r.gameDiff ? list[i - 1].place : i + 1));
    out.push(...list);
  }
  return out;
}

/**
 * Placements for a finished bracket. Round robin: everyone ranked together across pools (most set
 * wins, then game difference), so there's one 1st place even with several pools.
 */
export function finalPlacements(sets: EngineSet[]): Placement[] {
  const final = sets.filter(isElimination);
  if (final.length && final.length < sets.length) {
    // Pools or Swiss, then a final bracket: the finalists by how the bracket went, then everyone
    // else in the order of the first part (ties there stay ties).
    const top = eliminationPlacements(final);
    const inFinal = new Set(final.flatMap((s) => [s.p[0].id, s.p[1].id]).filter((id): id is string => !!id));
    const rest = finalPlacements(sets.filter((s) => !isElimination(s))).filter((p) => !inFinal.has(p.id));
    const out = [...top];
    rest.forEach((p, i) => out.push({ id: p.id, place: i > 0 && rest[i - 1].place === p.place ? out[out.length - 1].place : inFinal.size + i + 1 }));
    return out;
  }
  if (sets.some(isSwiss)) {
    // Swiss: the standings order. Two players share a place only when every tiebreak is level.
    const table = swissTable(sets);
    const out: Placement[] = [];
    table.forEach((r, i) => {
      const prev = table[i - 1];
      const tied = prev && prev.wins === r.wins && prev.losses === r.losses && prev.opponentWins === r.opponentWins && prev.gameDiff === r.gameDiff;
      out.push({ id: r.id, place: tied ? out[i - 1].place : i + 1 });
    });
    return out;
  }
  if (!sets.some((s) => s.bracket === "RR")) return eliminationPlacements(sets);
  const all = [...roundRobinStandings(sets)].sort((a, b) => b.wins - a.wins || b.gameDiff - a.gameDiff);
  const out: Placement[] = [];
  all.forEach((r, i) => {
    const prev = all[i - 1];
    const tied = prev && prev.wins === r.wins && prev.gameDiff === r.gameDiff;
    out.push({ id: r.id, place: tied ? out[i - 1].place : i + 1 });
  });
  return out;
}

/** Players who lost a set by disqualification (they left, or never showed up). */
export function disqualified(sets: EngineSet[]): Set<string> {
  const out = new Set<string>();
  for (const s of sets) {
    if (s.state !== "done" || !s.winner || s.score[2 - s.winner] !== -1) continue;
    const loser = s.p[2 - s.winner].id;
    if (loser) out.add(loser);
  }
  return out;
}

/**
 * Whose run in this bracket is over, and where they finished, while the bracket may still be going
 * (for bringing those players into another bracket of the same event). A finished bracket: everyone,
 * by the final placements. A bracket in progress: players knocked out of the elimination part and,
 * once a final bracket after pools or Swiss exists, everyone who didn't reach it. Pools or Swiss
 * still being played: nobody.
 *
 * A place is exact once every set of that round and the rounds before it has a result. Until then it
 * can only be a lower place than the final one, never a better one.
 */
export function outSoFar(sets: EngineSet[], finished: boolean): Placement[] {
  if (finished) return finalPlacements(sets);
  const final = sets.filter(isElimination);
  if (!final.length) return [];
  const inFinal = new Set(final.flatMap((s) => [s.p[0].id, s.p[1].id]).filter((id): id is string => !!id));
  const stageOut = new Map<string, number>(); // id -> when they were knocked out (later = better)
  for (const s of final) {
    const id = knockedOut(final, s);
    if (id) stageOut.set(id, playOrder(s));
  }
  const stages = [...stageOut.values()];
  // Everyone still in, and everyone knocked out later, finishes above you.
  const out: Placement[] = [...stageOut].map(([id, st]) => ({ id, place: inFinal.size - stages.filter((x) => x <= st).length + 1 }));
  out.sort((a, b) => a.place - b.place);
  const first = sets.filter((s) => !isElimination(s));
  if (first.length) {
    const rest = finalPlacements(first).filter((p) => !inFinal.has(p.id));
    rest.forEach((p, i) => out.push({ id: p.id, place: i > 0 && rest[i - 1].place === p.place ? out[out.length - 1].place : inFinal.size + i + 1 }));
  }
  return out;
}
