// One bracket format for every source (start.gg, parry.gg), so the bracket and set pages don't
// care where the data came from. Shared by server and browser code.
import type { GameKey } from "../games";

// "smashy" = an event hosted on Smashy itself (its pages live under /host, not /brackets).
export type BracketSource = "startgg" | "parrygg" | "smashy";
export const BRACKET_SOURCES: BracketSource[] = ["startgg", "parrygg"];
export const SOURCE_NAMES: Record<BracketSource, string> = { startgg: "start.gg", parrygg: "parry.gg", smashy: "Smashy" };

export type SetPlayer = {
  entrantId: string;
  name: string; // gamer tag
  prefix: string | null; // sponsor / team
  seed: number | null;
  playerId?: string | null; // start.gg player id (for head-to-head); not set for parry.gg
  score: number | null; // games won; -1 = DQ
  won: boolean;
};

export type SetState = "pending" | "live" | "done";

export type BracketSet = {
  id: string;
  identifier: string | null; // "A", "BU"…
  round: number; // start.gg style: positive = winners side, negative = losers side
  roundLabel: string; // "Winners Semi-Final"
  winnersSide: boolean;
  state: SetState;
  /** Two slots. null = not decided yet; `waitingOn` says where the player comes from. */
  players: [SetPlayer | null, SetPlayer | null];
  waitingOn: [string | null, string | null]; // e.g. "Winner of B"
  completedAt: number | null; // unix seconds
  /** Smashy-run brackets: a player reported the final score and it's waiting for the TO. */
  reported?: boolean;
  /** Smashy-run brackets: where the set is played ("Setup 3"), set by the TO. (start.gg sets use `station`.) */
  setup?: string;
  /**
   * start.gg (round 454): a slot filled from an earlier phase that hasn't finished yet (Top 16 waiting on
   * the Top 132 pools), with the player the seeds say comes through. Only used by the projected bracket.
   */
  projectedIn?: [SetPlayer | null, SetPlayer | null];
};

export type BracketRound = { key: string; label: string; winnersSide: boolean; round: number; sets: BracketSet[] };

/** A pool / phase group someone can switch to within the same event. */
export type BracketGroup = { id: string; label: string; phase: string };

export type BracketEvent = {
  source: BracketSource;
  eventId: string;
  eventName: string;
  game: GameKey | null;
  tournamentName: string;
  tournamentSlug: string | null; // start.gg slug (for /events/[slug])
  sourceUrl: string; // the bracket on start.gg / parry.gg
  groups: BracketGroup[];
  startAt?: number | null; // when the bracket starts (unix seconds), when the source gives it
  timezone?: string | null; // the venue's, for showing that time
  endAt?: number | null; // when the tournament ends (unix seconds), when the source gives it
};

export type Bracket = {
  event: BracketEvent;
  groupId: string;
  type: "double" | "single" | "round_robin" | "swiss" | "other";
  rounds: BracketRound[];
  live: boolean; // some set is in progress or the bracket isn't finished yet
  finished: boolean; // every set is done (nothing more to refresh)
  poolStartAt?: number | null; // when this pool starts, when known (its own time, or the event's for the first phase)
  /**
   * start.gg (round 454): the sets whose winner leaves this pool for the next phase (a pool that sends
   * players on), winners side and losers side. Used to project who a later phase gets.
   */
  exits?: { winners: string[]; losers: string[] };
};

export type SetGame = {
  number: number;
  winnerEntrantId: string | null;
  stage: string | null;
  characters: Record<string, string[]>; // entrantId -> character names
};

export type SetDetail = BracketSet & {
  source: BracketSource;
  event: Pick<BracketEvent, "eventId" | "eventName" | "game" | "tournamentName" | "tournamentSlug">;
  groupId: string | null;
  games: SetGame[];
  sourceUrl: string;
  stream: { source: string; name: string } | null; // where the set was streamed, if it was
  startedAt: number | null; // unix seconds, when the TO started it
};

/** Sorts rounds the way people read a bracket: winners first (R1 → Grand Final), then losers. */
export function sortRounds(rounds: BracketRound[]): BracketRound[] {
  return [...rounds].sort((a, b) =>
    a.winnersSide !== b.winnersSide ? (a.winnersSide ? -1 : 1) : Math.abs(a.round) - Math.abs(b.round),
  );
}

/** Groups sets into rounds. */
export function toRounds(sets: BracketSet[]): BracketRound[] {
  const map = new Map<string, BracketRound>();
  for (const s of sets) {
    const key = `${s.winnersSide ? "w" : "l"}${Math.abs(s.round)}`;
    const r = map.get(key) ?? { key, label: s.roundLabel, winnersSide: s.winnersSide, round: s.round, sets: [] };
    r.sets.push(s);
    map.set(key, r);
  }
  return sortRounds([...map.values()]);
}

export function playerName(p: Pick<SetPlayer, "name" | "prefix">) {
  return p.prefix ? `${p.prefix} | ${p.name}` : p.name;
}

export function setPath(source: BracketSource, id: string) {
  if (source === "smashy") return `/host/set/${encodeURIComponent(id)}`;
  return `/sets/${source}/${encodeURIComponent(id)}`;
}

export function bracketPath(source: BracketSource, eventId: string, groupId?: string | null) {
  if (source === "smashy") return `/host/${encodeURIComponent(eventId)}/bracket${groupId ? `?group=${encodeURIComponent(groupId)}` : ""}`;
  return `/brackets/${source}/${encodeURIComponent(eventId)}${groupId ? `?group=${encodeURIComponent(groupId)}` : ""}`;
}

/**
 * When to start the stream VOD for a set (unix seconds). Uses the TO's start time if they recorded it;
 * otherwise works back from when the set ended (about 5½ minutes per game), and says it's an estimate.
 */
export function setWatchMoment(set: Pick<SetDetail, "startedAt" | "completedAt" | "games" | "players">): { at: number; estimated: boolean } | null {
  if (set.startedAt) return { at: set.startedAt - 30, estimated: false };
  if (!set.completedAt) return null;
  const played = set.games.length || Math.max(1, (set.players[0]?.score ?? 0) + (set.players[1]?.score ?? 0));
  return { at: set.completedAt - played * 330, estimated: true };
}
