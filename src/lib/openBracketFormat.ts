// The Open Bracket Format (OBF, version 1.0): a shared JSON format for bracket data that ranking
// sites and other tools can read (https://github.com/openbracketformat/openbracketformat). This
// turns a bracket hosted on Smashy into it.
// Plain logic only: the caller loads the data as a signed-out guest, so the file can never hold
// more than the public bracket page shows, and this shapes it. The format allows no fields of our
// own outside each object's `other`, so everything Smashy-specific lives there.
import { eliminationSeeds, finalPlacements, isElimination, isFinished, playOrder, roundLabel, type EngineSet, type Link } from "./bracketEngine";

export const OBF_VERSION = "v1.0";

type Result = "win" | "lose" | "dq";

export type ObfGame = { gameNumber: number; stage?: string; entrant1Result: Result; entrant2Result: Result };

export type ObfSet = {
  setID: string;
  entrant1ID?: string;
  entrant2ID?: string;
  status: "completed" | "started" | "pending";
  entrant1Result?: Result;
  entrant2Result?: Result;
  entrant1Score?: number;
  entrant2Score?: number;
  entrant1NextSetID?: string;
  entrant2NextSetID?: string;
  entrant1PrevSetID?: string;
  entrant2PrevSetID?: string;
  setFormat: string;
  phaseID: string;
  roundID: string;
  games?: ObfGame[];
  other: Record<string, unknown>;
};

export type ObfEntrant = {
  entrantID: string;
  entrantTag?: string;
  initialSeed?: number;
  finalPlacement?: number;
  other: Record<string, unknown>;
};

export type ObfTournament = {
  version: typeof OBF_VERSION;
  event: {
    name: string;
    date?: string;
    gameName: string;
    /** "single-elim", "double-elim", "round-robin", "swiss", or two parts: "round-robin into double-elim". */
    tournamentStructure: string;
    phases: { phaseID: string; phaseStructure: string }[];
    ruleset?: string;
    originURL: string;
    numberEntrants: number;
    other: Record<string, unknown>;
  };
  entrants: ObfEntrant[];
  sets: ObfSet[];
};

export type ObfPlayer = {
  /** Null when the profile is hidden from signed-out visitors (the bracket shows them as "Player"). */
  tag: string | null;
  /** Their Smashy handle; null for walk-ins and hidden profiles. */
  handle: string | null;
  /** Added by the TO by name: no Smashy account. */
  walkIn: boolean;
  seed: number | null;
  joinedAt: string;
};

export type ObfSetInput = { set: EngineSet; games: { stage: string; winner: 1 | 2 }[]; completedAt: string | null };

export type ObfInput = {
  event: {
    id: string;
    name: string;
    gameName: string;
    format: "double_elim" | "single_elim" | "round_robin" | "swiss";
    /** Swiss only: how many rounds the event has (it's finished after the last one). */
    swissRounds?: number | null;
    /** Pools or Swiss followed by a final bracket: its format ("single_elim" or "double_elim"). */
    finalFormat?: string | null;
    startsAt: string;
    timezone: string;
    online: boolean;
    location: string | null;
    region: string | null;
    rulesetName: string | null;
    host: { tag: string; handle: string } | null;
    challongeUrl: string | null;
  };
  /** The site's address without a trailing slash, e.g. "https://smashy.gg". */
  origin: string;
  sets: ObfSetInput[];
  players: Map<string, ObfPlayer>;
  generatedAt: string;
};

const SIDE = { W: "winners", L: "losers", GF: "grand-final", GF2: "grand-final-reset", RR: "round-robin", SW: "swiss" } as const;

/** Byes and an unplayed grand final reset aren't sets anyone played: they're left out of the file. */
const played = (s: EngineSet) => s.state !== "bye" && s.state !== "skipped";

/** The day the event starts, where it happens (YYYY-MM-DD). */
function localDate(iso: string, timeZone: string): string | undefined {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(iso));
    const part = (type: string) => parts.find((p) => p.type === type)?.value;
    const [y, m, d] = [part("year"), part("month"), part("day")];
    return y && m && d ? `${y}-${m}-${d}` : undefined;
  } catch {
    return undefined;
  }
}

/** Drops keys with no value, so the file never says `null` where the format wants the key left out. */
function compact<T extends Record<string, unknown>>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null)) as T;
}

/**
 * Seeds as the bracket used them. Elimination: read off the first winners round (seed 1 meets the
 * last seed, and so on), which is exactly what the bracket was built from. Round robin has no such
 * shape, so it's the seeding order: by seed, then by who signed up first (how brackets are seeded).
 */
function seedsOf(all: EngineSet[], ids: string[], players: Map<string, ObfPlayer>): Map<string, number> {
  const seeds = eliminationSeeds(all);
  if (seeds.size > 0) return seeds;
  const at = (id: string) => players.get(id);
  [...ids]
    .sort((a, b) => (at(a)?.seed ?? 1e9) - (at(b)?.seed ?? 1e9) || (at(a)?.joinedAt ?? "9").localeCompare(at(b)?.joinedAt ?? "9") || a.localeCompare(b))
    .forEach((id, i) => seeds.set(id, i + 1));
  return seeds;
}

/**
 * Who plays which set next, and which set they came from, for elimination brackets: this is what
 * lets a reader rebuild the bracket. A player who wins moves along the winner's line and one who
 * loses along the loser's line, straight through any byes on the way; someone DQ'd is out of the
 * event; after a grand final the only next set is the reset, when it's played.
 */
function links(all: EngineSet[]) {
  const byKey = new Map(all.map((s) => [s.key, s]));
  const reset = all.find((s) => s.bracket === "GF2");
  const next = new Map<string, [string | undefined, string | undefined]>();
  const prev = new Map<string, [string | undefined, string | undefined]>();
  const nextSet = (from: EngineSet, playerId: string, won: boolean): EngineSet | null => {
    const has = (t: EngineSet) => t.p[0].id === playerId || t.p[1].id === playerId;
    if (from.bracket === "GF") return reset && played(reset) && has(reset) ? reset : null;
    let link: Link | null = won ? from.winnerTo : from.loserTo;
    for (let hops = 0; link && hops < 64; hops++) {
      const t = byKey.get(link.key);
      if (!t || t.state === "skipped") return null;
      if (t.state !== "bye") return has(t) ? t : null; // only ever point at a set they're really in
      link = t.winnerTo; // a bye: they went straight through
    }
    return null;
  };
  for (const s of all) {
    if (s.bracket === "RR" || s.state !== "done" || !s.winner) continue;
    const dq = s.score[2 - s.winner] === -1;
    ([0, 1] as const).forEach((i) => {
      const id = s.p[i].id;
      const won = s.winner === i + 1;
      if (!id || (!won && dq)) return;
      const t = nextSet(s, id, won);
      if (!t) return;
      const n = next.get(s.key) ?? [undefined, undefined];
      n[i] = t.key;
      next.set(s.key, n);
      const p = prev.get(t.key) ?? [undefined, undefined];
      p[t.p[0].id === id ? 0 : 1] = s.key;
      prev.set(t.key, p);
    });
  }
  return { next, prev };
}

/** A hosted bracket as an Open Bracket Format file. */
export function toOpenBracketFormat({ event, origin, sets: input, players, generatedAt }: ObfInput): ObfTournament {
  const all = input.map((x) => x.set);
  const details = new Map(input.map((x) => [x.set.key, x]));
  const roundRobin = event.format === "round_robin";
  const swiss = event.format === "swiss";
  // Two parts: pools or Swiss, then a final bracket (its sets exist once the host has started it).
  const firstSets = all.filter((s) => !isElimination(s));
  const hasFinal = firstSets.length > 0 && firstSets.length < all.length;
  const single = (roundRobin || swiss ? event.finalFormat : event.format) === "single_elim";
  const elimination = single ? "single-elim" : "double-elim";
  const firstStructure = swiss ? "swiss" : roundRobin ? "round-robin" : elimination;
  const structure = hasFinal ? `${firstStructure} into ${elimination}` : firstStructure;
  const finished = all.length > 0 && isFinished(all, event);

  // Everyone in the bracket, byes included (a top seed's first set can be a bye), best seed first.
  const ids = [...new Set(all.flatMap((s) => [s.p[0].id, s.p[1].id]).filter((id): id is string => !!id))];
  // With a final bracket, "seed" stays the seeding the event started with (not the seeding into the final).
  const seeds = seedsOf(hasFinal ? firstSets : all, ids, players);
  ids.sort((a, b) => (seeds.get(a) ?? 1e9) - (seeds.get(b) ?? 1e9) || a.localeCompare(b));

  // A player whose profile signed-out visitors can't see gets a name-free id that only means
  // something inside this file, never their Smashy id (which would follow them from event to event).
  const publicId = new Map<string, string>();
  let hidden = 0;
  for (const id of ids) {
    const p = players.get(id);
    publicId.set(id, p && (p.walkIn || p.tag !== null) ? id : `hidden-${++hidden}`);
  }
  const idOf = (id: string | null) => (id ? publicId.get(id) : undefined);

  const places = new Map(finished ? finalPlacements(all).map((p) => [p.id, p.place] as const) : []);
  const entrants: ObfEntrant[] = ids.map((id) => {
    const p = players.get(id);
    const shown = !!p && p.tag !== null;
    return compact({
      entrantID: publicId.get(id)!,
      entrantTag: shown ? p.tag! : undefined,
      initialSeed: seeds.get(id),
      finalPlacement: places.get(id),
      other: p?.walkIn
        ? { walkIn: true } // added by the TO by name: this id is only good for this event
        : shown && p.handle
          ? { smashyHandle: p.handle, profileURL: `${origin}/u/${p.handle}` }
          : { nameHidden: true },
    });
  });

  const maxW = Math.max(0, ...all.filter((s) => s.bracket === "W").map((s) => s.round));
  const maxL = Math.max(0, ...all.filter((s) => s.bracket === "L").map((s) => s.round));
  const { next, prev } = links(all.filter(isElimination)); // only elimination sets lead into one another
  const phaseOf = (s: EngineSet) => (s.bracket === "RR" ? `pool-${s.pool ?? 1}` : !hasFinal ? "bracket" : s.bracket === "SW" ? "swiss" : "final");

  const sets: ObfSet[] = all
    .filter(played)
    // In the order played: the pools or Swiss rounds before the final bracket, then round by round.
    .sort((a, b) => Number(isElimination(a)) - Number(isElimination(b)) || playOrder(a) - playOrder(b) || (a.pool ?? 0) - (b.pool ?? 0) || a.idx - b.idx)
    .map((s) => {
      const done = s.state === "done" && !!s.winner;
      const dq = done && s.score[2 - s.winner!] === -1;
      const result = (slot: 1 | 2): Result | undefined => (!done ? undefined : s.winner === slot ? "win" : dq ? "dq" : "lose");
      const scored = done && !dq && s.score.every((x) => Number.isInteger(x) && x! >= 0);
      // Games are only passed on when they add up to the set's score (a TO can correct a result
      // after the fact, and a set reported as a final score has no games at all).
      const recorded = details.get(s.key)?.games ?? [];
      const wins = (slot: 1 | 2) => recorded.filter((g) => g.winner === slot).length;
      const gamesFit = s.state === "live" ? recorded.length > 0 : scored && recorded.length > 0 && wins(1) === s.score[0] && wins(2) === s.score[1];
      return compact({
        setID: s.key,
        entrant1ID: idOf(s.p[0].id),
        entrant2ID: idOf(s.p[1].id),
        status: done ? ("completed" as const) : s.state === "live" ? ("started" as const) : ("pending" as const),
        entrant1Result: result(1),
        entrant2Result: result(2),
        entrant1Score: scored ? s.score[0]! : undefined,
        entrant2Score: scored ? s.score[1]! : undefined,
        entrant1NextSetID: next.get(s.key)?.[0],
        entrant2NextSetID: next.get(s.key)?.[1],
        entrant1PrevSetID: prev.get(s.key)?.[0],
        entrant2PrevSetID: prev.get(s.key)?.[1],
        setFormat: `bestof${s.bestOf}`,
        phaseID: phaseOf(s),
        roundID: roundLabel(s, maxW, maxL, single),
        games: gamesFit
          ? recorded.map((g, i) =>
              compact({
                gameNumber: i + 1,
                stage: g.stage || undefined,
                entrant1Result: (g.winner === 1 ? "win" : "lose") as Result,
                entrant2Result: (g.winner === 2 ? "win" : "lose") as Result,
              }),
            )
          : undefined,
        other: compact({
          identifier: s.identifier ?? undefined, // the letter the bracket shows ("Set C")
          side: SIDE[s.bracket],
          round: s.round,
          pool: s.bracket === "RR" ? (s.pool ?? 1) : undefined,
          bestOf: s.bestOf,
          completedAt: done ? (details.get(s.key)?.completedAt ?? undefined) : undefined,
          url: `${origin}/host/set/${s.key}`,
        }),
      });
    });

  const pools = [...new Set(all.map((s) => s.pool).filter((p): p is number => p !== null))].sort((a, b) => a - b);
  return {
    version: OBF_VERSION,
    event: compact({
      name: event.name,
      date: localDate(event.startsAt, event.timezone),
      gameName: event.gameName,
      tournamentStructure: structure,
      phases: [
        ...(roundRobin ? (pools.length ? pools : [1]).map((p) => ({ phaseID: `pool-${p}`, phaseStructure: "round-robin" })) : hasFinal ? [{ phaseID: "swiss", phaseStructure: "swiss" }] : [{ phaseID: "bracket", phaseStructure: structure }]),
        ...(hasFinal ? [{ phaseID: "final", phaseStructure: elimination }] : []),
      ],
      ruleset: event.rulesetName ?? undefined,
      originURL: `${origin}/host/${event.id}`,
      numberEntrants: entrants.length,
      other: compact({
        source: "Smashy",
        smashyEventID: event.id,
        status: finished ? "completed" : "in_progress",
        startsAt: event.startsAt,
        timezone: event.timezone,
        online: event.online,
        location: event.online ? undefined : (event.location ?? undefined),
        region: event.region ?? undefined,
        host: event.host ? { tag: event.host.tag, smashyHandle: event.host.handle, profileURL: `${origin}/u/${event.host.handle}` } : undefined,
        bracketURL: `${origin}/host/${event.id}/bracket`,
        challongeURL: event.challongeUrl ?? undefined,
        generatedAt,
      }),
    }),
    entrants,
    sets,
  };
}
