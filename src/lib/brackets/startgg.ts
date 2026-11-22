// start.gg brackets: events, pools, sets, and full set details (games, characters, stages).
// Cached: finished brackets for hours, running ones for ~30 seconds.
import "server-only";
import { cacheLife } from "next/cache";
import type { Podium } from "./podium";
import { defaultGroupId, myEventRank, poolSettled, stillPlayingGroupId, type PhaseInfo } from "./phases";
import { myStatus } from "./myStatus";
import { gameKeyFromStartggId, gameOfEvent } from "../games";
import { rememberPlayers } from "../playerIndex";
import { SUPPORTED_GAME_IDS, isTooComplex, playerSetEvents, startggQuery, type StartggOptions } from "../startgg";
import { projectedWinners } from "./projected";
import { seedOrder } from "../bracketEngine";
import {
  toRounds,
  type Bracket,
  type BracketEvent,
  type BracketGroup,
  type BracketSet,
  type SetDetail,
  type SetPlayer,
  type SetState,
} from "./types";

// Exactly one cacheLife call may run per request, so each return path sets its own.
const LIVE_CACHE = { stale: 15, revalidate: 30, expire: 600 };
const DONE_CACHE = { stale: 300, revalidate: 3600, expire: 86400 };
const MISS_CACHE = { stale: 60, revalidate: 300, expire: 3600 };
const PENDING_CACHE = { stale: 30, revalidate: 60, expire: 600 };
const EVENT_CACHE = { stale: 30, revalidate: 60, expire: 900 };

/** Live now, or due to start within 2 hours (or past its start time but not marked live yet). */
export function isActiveSoon(ev: { state: "upcoming" | "live" | "done"; startAt: number }, nowSec: number): boolean {
  return ev.state === "live" || (ev.state === "upcoming" && ev.startAt - nowSec < 2 * 3600 && nowSec - ev.startAt < 12 * 3600);
}

type RawEntrant = { id: string | number; name: string; initialSeedNum: number | null; participants: { gamerTag: string; prefix: string | null; player?: { id: string | number; gamerTag?: string | null; prefix?: string | null } | null }[] | null } | null;
type RawSlot = {
  prereqType: string | null;
  prereqId: string | null;
  prereqPlacement: number | null;
  entrant: RawEntrant;
  standing: { stats: { score: { value: number | null } | null } | null } | null;
};
type RawSet = {
  id: string | number;
  identifier: string | null;
  round: number | null;
  fullRoundText: string | null;
  state: number | null;
  winnerId: string | number | null;
  completedAt: number | null;
  slots: RawSlot[] | null;
};
type RawPool = { id: string | number; displayIdentifier: string | null; state: number | null };
type RawPhase = {
  id: string | number;
  name: string;
  bracketType: string | null;
  phaseOrder: number | null;
  phaseGroups: { pageInfo?: { totalPages: number | null } | null; nodes: RawPool[] | null } | null;
};
type RawEvent = {
  id: string | number;
  name: string;
  slug: string;
  state: string | null;
  startAt?: number | null;
  videogame: { id: string | number } | null;
  tournament: { name: string; slug: string; timezone?: string | null; startAt?: number | null; endAt?: number | null } | null;
  phases: RawPhase[] | null;
};

// start.gg caps each request at 1,000 objects. A whole bracket page (50 sets) only fits without
// player ids, so the bracket uses the lighter fields; single sets include player ids (head-to-head).
const slotFields = (withPlayerIds: boolean) =>
  `slots { prereqType prereqId prereqPlacement entrant { id name initialSeedNum participants { gamerTag prefix${withPlayerIds ? " player { id gamerTag prefix }" : ""} } } standing { stats { score { value } } } }`;
const SET_FIELDS = `id identifier round fullRoundText state winnerId completedAt ${slotFields(true)}`;
const BRACKET_SET_FIELDS = `id identifier round fullRoundText state winnerId completedAt ${slotFields(false)}`;
// Pools come 512 of a phase at a time: the most start.gg hands over in one go. (This asked for 128
// before, and bigger events lost the rest: Evo 2019 Ultimate has 256 pools in round 1.)
// No start times here: only the pool being shown needs one, and it comes with that pool's sets.
// Asked for every pool at once, start.gg failed on all 330 of Evo 2019's and took 13 seconds over
// it, so that bracket never loaded.
const POOL_PAGE = 512;
const MAX_POOL_PAGES = 4;
const POOL_FIELDS = `id displayIdentifier state`;
const EVENT_FIELDS = `id name slug state startAt videogame { id } tournament { name slug timezone startAt endAt }
  phases { id name bracketType phaseOrder phaseGroups(query: { perPage: ${POOL_PAGE} }) { pageInfo { totalPages } nodes { ${POOL_FIELDS} } } }`;
const EVENT_FIELDS_NO_POOLS = `id name slug state startAt videogame { id } tournament { name slug timezone startAt endAt }
  phases { id name bracketType phaseOrder }`;
// A pool's start time is optional (it only says when a pool that hasn't started will): if start.gg
// fails on that one field, the bracket is shown without it.
const POOL_TIME_OPTIONAL: StartggOptions = { ignoreErrorAt: (path) => path.length === 2 && path[0] === "phaseGroup" && path[1] === "startAt" };

/**
 * An event with every pool of every phase. Shared by every server for a minute (round 454): each pool
 * page asked start.gg for the whole event again, and a busy weekend ran the site into start.gg's limit.
 */
async function loadEvent(eventId: string): Promise<RawEvent | null> {
  "use cache: remote";
  cacheLife(EVENT_CACHE);
  return fetchEvent(eventId);
}

async function fetchEvent(eventId: string): Promise<RawEvent | null> {
  const event = await startggQuery<{ event: RawEvent | null }>(`query E($id: ID!) { event(id: $id) { ${EVENT_FIELDS} } }`, { id: eventId }).then(
    (r) => r.event,
    async (e) => {
      // Too many pools across the phases for one reply (start.gg's 1,000-object cap: 11 brackets a
      // week failed on it): the event without its pools, then each phase's pools on their own.
      if (!isTooComplex(e)) throw e;
      const { event } = await startggQuery<{ event: RawEvent | null }>(`query E($id: ID!) { event(id: $id) { ${EVENT_FIELDS_NO_POOLS} } }`, { id: eventId });
      for (const ph of event?.phases ?? []) {
        const first = await startggQuery<{ phase: { phaseGroups: RawPhase["phaseGroups"] } | null }>(
          `query P($id: ID!) { phase(id: $id) { phaseGroups(query: { page: 1, perPage: ${POOL_PAGE} }) { pageInfo { totalPages } nodes { ${POOL_FIELDS} } } } }`,
          { id: ph.id },
        );
        ph.phaseGroups = first.phase?.phaseGroups ?? null;
      }
      return event;
    },
  );
  if (!event) return null;
  // A phase with more pools than fit in one reply: fetch the rest, page by page.
  for (const ph of event.phases ?? []) {
    if (!ph.phaseGroups) continue;
    const pages = Math.min(ph.phaseGroups.pageInfo?.totalPages ?? 1, MAX_POOL_PAGES);
    for (let page = 2; page <= pages; page++) {
      const more = await startggQuery<{ phase: { phaseGroups: { nodes: RawPool[] | null } | null } | null }>(
        `query P($id: ID!, $page: Int!) { phase(id: $id) { phaseGroups(query: { page: $page, perPage: ${POOL_PAGE} }) { nodes { ${POOL_FIELDS} } } } }`,
        { id: ph.id, page },
      );
      ph.phaseGroups.nodes = [...(ph.phaseGroups.nodes ?? []), ...(more.phase?.phaseGroups?.nodes ?? [])];
    }
  }
  return event;
}

function setState(state: number | null): SetState {
  if (state === 3) return "done";
  if (state === 2 || state === 6) return "live";
  return "pending";
}

function toPlayer(slot: RawSlot, winnerId: string | null): SetPlayer | null {
  const e = slot.entrant;
  if (!e) return null;
  const p = e.participants?.length === 1 ? e.participants[0] : null; // doubles teams use the team name
  return {
    entrantId: String(e.id),
    name: p?.gamerTag ?? e.name,
    prefix: p?.prefix && p.prefix !== p.gamerTag ? p.prefix : null,
    seed: e.initialSeedNum,
    playerId: p?.player ? String(p.player.id) : null,
    score: slot.standing?.stats?.score?.value ?? null,
    won: winnerId !== null && String(e.id) === winnerId,
  };
}

const EMPTY_SLOT: RawSlot = { prereqType: null, prereqId: null, prereqPlacement: null, entrant: null, standing: null };
const BYE_SLOT: RawSlot = { ...EMPTY_SLOT, prereqType: "bye" };

/**
 * A slot as it really is (round 454): one fed by a set against a bye is fed by whoever is in that set's
 * other slot (start.gg's preview of a later phase sends losers-side players in through bye sets).
 */
function throughByes(slot: RawSlot, byId: Map<string, RawSet>, depth = 0): RawSlot {
  if (slot.entrant || slot.prereqType !== "set" || !slot.prereqId || depth > 4) return slot;
  const from = byId.get(String(slot.prereqId));
  const fromSlots = from?.slots ?? [];
  const byeAt = fromSlots.findIndex((x) => x.prereqType === "bye" && !x.entrant);
  if (!from || byeAt < 0 || fromSlots.length < 2) return slot;
  if (slot.prereqPlacement === 2) return BYE_SLOT; // the loser of a bye set: nobody
  return throughByes(fromSlots[1 - byeAt], byId, depth + 1);
}

function toSet(raw: RawSet, identifiers: Map<string, string>, byId?: Map<string, RawSet>): BracketSet {
  const winnerId = raw.winnerId === null ? null : String(raw.winnerId);
  const slots = (raw.slots ?? []).slice(0, 2).map((x) => (byId ? throughByes(x, byId) : x));
  while (slots.length < 2) slots.push(EMPTY_SLOT);
  const waiting = (s: RawSlot): string | null => {
    if (s.entrant) return null;
    if (s.prereqType === "set" && s.prereqId) {
      const from = identifiers.get(String(s.prereqId));
      return `${s.prereqPlacement === 2 ? "Loser" : "Winner"} of ${from ?? "previous set"}`;
    }
    if (s.prereqType === "bye") return "Bye";
    return "TBD";
  };
  const round = raw.round ?? 0;
  return {
    id: String(raw.id),
    identifier: raw.identifier,
    round,
    roundLabel: raw.fullRoundText ?? `Round ${Math.abs(round)}`,
    winnersSide: round >= 0,
    state: setState(raw.state),
    players: [toPlayer(slots[0], winnerId), toPlayer(slots[1], winnerId)],
    waitingOn: [waiting(slots[0]), waiting(slots[1])],
    completedAt: raw.completedAt,
  };
}

function toEvent(raw: RawEvent): BracketEvent {
  const phases = [...(raw.phases ?? [])].sort((a, b) => (a.phaseOrder ?? 0) - (b.phaseOrder ?? 0));
  const groups: BracketGroup[] = phases.flatMap((ph) =>
    (ph.phaseGroups?.nodes ?? []).map((g) => ({
      id: String(g.id),
      label: (ph.phaseGroups?.nodes?.length ?? 0) > 1 ? `${ph.name} · Pool ${g.displayIdentifier ?? ""}`.trim() : ph.name,
      phase: ph.name,
    })),
  );
  const tournamentSlug = raw.tournament?.slug.replace(/^tournament\//, "") ?? null;
  return {
    source: "startgg",
    eventId: String(raw.id),
    eventName: raw.name,
    game: gameOfEvent(raw),
    tournamentName: raw.tournament?.name ?? "",
    tournamentSlug,
    sourceUrl: `https://www.start.gg/${raw.slug}`,
    groups,
    // Never before the tournament starts (organizers mix up AM/PM on bracket times).
    startAt: raw.startAt ? Math.max(raw.startAt, raw.tournament?.startAt ?? 0) : (raw.tournament?.startAt ?? null),
    timezone: raw.tournament?.timezone ?? null,
    endAt: raw.tournament?.endAt ?? null,
  };
}

/** The pool to open by default: the latest phase that has started (top cut at the end), else the first. */
function phaseInfo(raw: RawEvent): PhaseInfo[] {
  return (raw.phases ?? []).map((ph) => ({
    name: ph.name,
    order: ph.phaseOrder ?? 0,
    groups: (ph.phaseGroups?.nodes ?? []).map((g) => ({ id: String(g.id), state: g.state })),
  }));
}

function defaultGroup(raw: RawEvent): string | null {
  return defaultGroupId(phaseInfo(raw), raw.state === "COMPLETED");
}

const BRACKET_TYPES: Record<string, Bracket["type"]> = {
  DOUBLE_ELIMINATION: "double",
  SINGLE_ELIMINATION: "single",
  ROUND_ROBIN: "round_robin",
  SWISS: "swiss",
};

/**
 * A whole pool (phase group) of an event, with every set. A later phase still waiting on an earlier one
 * (Top 16 before the Top 132 pools finish) also gets who the seeds say comes through (round 454).
 */
export async function getStartggBracket(eventId: string, groupId?: string | null): Promise<Bracket | null> {
  let bracket = await loadPool(eventId, groupId);
  // The event's own link (no pool named) opened a pool where nothing has been played yet: open the one
  // that's really on instead (round 458: Top 8 "started" on start.gg while Top 16 was live).
  if (!groupId && bracket && !bracket.finished && bracket.rounds.every((r) => r.sets.every((x) => x.state === "pending"))) {
    const raw = await loadEvent(eventId).catch(() => null);
    const other = raw ? stillPlayingGroupId(phaseInfo(raw), bracket.groupId) : null;
    if (other) bracket = (await loadPool(eventId, other).catch(() => null)) ?? bracket;
  }
  if (!bracket?.pendingSeeds) return bracket;
  const { pendingSeeds, ...rest } = bracket;
  return withFeeds(rest, pendingSeeds).catch(() => rest);
}

/** Slots of a pool filled from an earlier phase that hasn't sent anyone there yet, in bracket order. */
type PendingSeed = { setId: string; slot: 0 | 1; winnersSide: boolean };
type PendingSeeds = { seeds: PendingSeed[]; total: number; phaseOrder: number };
type LoadedPool = Bracket & { pendingSeeds?: PendingSeeds };

async function loadPool(eventId: string, groupId?: string | null): Promise<LoadedPool | null> {
  "use cache: remote";
  if (!/^\d+$/.test(eventId) || (groupId && !/^\d+$/.test(groupId))) {
    cacheLife(MISS_CACHE);
    return null;
  }

  const raw = await loadEvent(eventId);
  if (!raw) {
    cacheLife(MISS_CACHE);
    return null;
  }
  const event = toEvent(raw);
  const gid = groupId && event.groups.some((g) => g.id === groupId) ? groupId : defaultGroup(raw);
  if (!gid) {
    cacheLife(MISS_CACHE);
    return { event, groupId: "", type: "other", rounds: [], live: false, finished: false };
  }

  const phase = (raw.phases ?? []).find((ph) => (ph.phaseGroups?.nodes ?? []).some((g) => String(g.id) === gid));
  // Empty sets too (round 452), for elimination brackets only: later rounds show in the tree before
  // anyone reaches them, and the projected bracket can fill them. Bye sets come too (round 454), so a
  // slot fed through one can be followed; they're left off the page after. Other kinds (a ladder,
  // round robin) skip the empty ones: Port Priority DX's Salmon Ladder had ~1,500 of them.
  const elimination = phase?.bracketType === "DOUBLE_ELIMINATION" || phase?.bracketType === "SINGLE_ELIMINATION";
  const setsPage = (page: number) =>
    startggQuery<{ phaseGroup: { startAt?: number | null; sets: { pageInfo: { totalPages: number }; nodes: RawSet[] | null } } | null }>(
      `query S($id: ID!, $page: Int!) { phaseGroup(id: $id) {${page === 1 ? " startAt" : ""}
        sets(page: $page, perPage: 50, sortType: ROUND, filters: { hideEmpty: ${!elimination}, showByes: ${elimination} }) { pageInfo { totalPages } nodes { ${BRACKET_SET_FIELDS} } }
      } }`,
      { id: gid, page },
      POOL_TIME_OPTIONAL,
    );
  const first = await setsPage(1);
  const sets: RawSet[] = [...(first.phaseGroup?.sets.nodes ?? [])];
  const ownStartAt = first.phaseGroup?.startAt ?? null; // this pool's scheduled start, sent with its first page of sets
  // The other pages a few at a time, side by side (one after another, a big pool took ~20 seconds).
  const totalPages = Math.min(first.phaseGroup?.sets.pageInfo.totalPages ?? 1, 40);
  for (let page = 2; page <= totalPages; page += 4) {
    const batch = await Promise.all(Array.from({ length: Math.min(4, totalPages - page + 1) }, (_, i) => setsPage(page + i)));
    for (const data of batch) sets.push(...(data.phaseGroup?.sets.nodes ?? []));
  }
  const identifiers = new Map(sets.map((s) => [String(s.id), s.identifier ?? ""]));
  const byId = new Map(sets.map((s) => [String(s.id), s]));
  // Sets against a bye are left out (start.gg hides them as well; the player is already moved on).
  const converted = sets.map((s) => toSet(s, identifiers, byId)).filter((s) => !s.waitingOn.includes("Bye"));

  // Where players leave this pool for the next phase: shown sets whose winner no set here waits on.
  const fedByWinner = new Set(sets.flatMap((s) => (s.slots ?? []).filter((x) => x.prereqType === "set" && x.prereqPlacement !== 2).map((x) => String(x.prereqId))));
  const exitSets = converted.filter((x) => !fedByWinner.has(x.id));
  // Slots waiting on an earlier phase (round 454), in bracket order (A, B, … AA, AB …).
  const realSlots = (id: string) => (byId.get(id)?.slots ?? []).slice(0, 2).map((sl) => throughByes(sl, byId));
  const ordered = [...converted].sort((a, b) => (a.identifier ?? "").length - (b.identifier ?? "").length || (a.identifier ?? "").localeCompare(b.identifier ?? ""));
  const pending: PendingSeed[] = [];
  let seedSlots = 0;
  for (const x of ordered) {
    realSlots(x.id).forEach((sl, i) => {
      if (sl.prereqType !== "seed") return;
      seedSlots++;
      if (!sl.entrant) pending.push({ setId: x.id, slot: i as 0 | 1, winnersSide: x.winnersSide });
    });
  }
  const rawGroup = phase?.phaseGroups?.nodes?.find((g) => String(g.id) === gid);
  const groupState = rawGroup?.state ?? null;
  // When this pool starts: its own scheduled time, else the event's for the first phase. Later
  // phases without a time (Top 8 on day 3) have none: the event's start would be days early.
  const firstOrder = Math.min(...(raw.phases ?? []).map((ph) => ph.phaseOrder ?? 0));
  const poolStartAt = ownStartAt ? Math.max(ownStartAt, raw.tournament?.startAt ?? 0) : (phase?.phaseOrder ?? 0) <= firstOrder ? (event.startAt ?? null) : null;
  const live = converted.some((s) => s.state === "live") || (groupState === 2 && converted.some((s) => s.state !== "done"));

  const finished = groupState === 3 || (converted.length > 0 && converted.every((s) => s.state === "done"));
  // Live: every ~30 seconds. Not started yet: every minute (so it shows up soon after the TO starts it).
  // A finished pool is only kept for an hour once it's settled (see poolSettled).
  const settled = poolSettled(finished, !!groupId && gid === groupId, raw.state === "COMPLETED");
  cacheLife(live ? LIVE_CACHE : settled ? DONE_CACHE : PENDING_CACHE);
  return {
    event,
    groupId: gid,
    type: BRACKET_TYPES[phase?.bracketType ?? ""] ?? "other",
    rounds: toRounds(converted),
    live,
    finished,
    poolStartAt,
    ...(elimination && exitSets.length ? { exits: { winners: exitSets.filter((x) => x.winnersSide).map((x) => x.id), losers: exitSets.filter((x) => !x.winnersSide).map((x) => x.id) } } : {}),
    ...(elimination && pending.length ? { pendingSeeds: { seeds: pending, total: seedSlots, phaseOrder: phase?.phaseOrder ?? 0 } } : {}),
  };
}

/**
 * The pools of the earlier phase that fill this one: the nearest earlier phase whose pools send on as
 * many players as this pool has seed slots (Top 132's two pools send 8 each to a 16-slot Top 16).
 * Side brackets in between (a ladder) send nobody here, so they don't match. Null when none fits.
 */
async function feederPools(eventId: string, phaseOrder: number, slots: number): Promise<string[] | null> {
  "use cache: remote";
  cacheLife(DONE_CACHE);
  const raw = await loadEvent(eventId);
  const earlier = [...(raw?.phases ?? [])].filter((ph) => (ph.phaseOrder ?? 0) < phaseOrder).sort((a, b) => (b.phaseOrder ?? 0) - (a.phaseOrder ?? 0));
  for (const ph of earlier.slice(0, 3)) {
    const pools = ph.phaseGroups?.nodes ?? [];
    if (!pools.length || pools.length > 16) continue; // more pools than are worth loading for a guess
    const data = await startggQuery<{ phase: { phaseGroups: { nodes: { id: string | number; progressionsOut: { id: string | number }[] | null }[] | null } | null } | null }>(
      `query F($id: ID!) { phase(id: $id) { phaseGroups(query: { perPage: 16 }) { nodes { id progressionsOut { id } } } } }`,
      { id: ph.id },
    );
    const nodes = data.phase?.phaseGroups?.nodes ?? [];
    const out = nodes.reduce((n, g) => n + (g.progressionsOut?.length ?? 0), 0);
    if (out === slots) return nodes.map((g) => String(g.id));
  }
  return null;
}

/**
 * Fill a waiting pool's open seed slots with who the earlier phase's pools are projected to send on,
 * winners side and losers side apart, best seeds first, placed the way a bracket seeds (1 v 8, 4 v 5 …).
 * A guess by design: start.gg doesn't say which seed slot each finishing spot goes to until it's played.
 */
async function withFeeds(bracket: Bracket, pending: PendingSeeds): Promise<Bracket> {
  const pools = await feederPools(bracket.event.eventId, pending.phaseOrder, pending.total);
  if (!pools) return bracket;
  const feeders = (await Promise.all(pools.map((id) => loadPool(bracket.event.eventId, id)))).filter((b): b is LoadedPool => !!b?.exits);
  const placed = new Set(bracket.rounds.flatMap((r) => r.sets.flatMap((x) => x.players.map((p) => p?.entrantId))).filter(Boolean));
  const comers = (side: "winners" | "losers") =>
    feeders
      .flatMap((b) => projectedWinners(b, b.exits![side]))
      .filter((p): p is SetPlayer => !!p && !placed.has(p.entrantId))
      .sort((a, b) => (a.seed ?? 1e9) - (b.seed ?? 1e9));
  const fill = new Map<string, [SetPlayer | null, SetPlayer | null]>();
  for (const side of ["winners", "losers"] as const) {
    const slots = pending.seeds.filter((x) => x.winnersSide === (side === "winners"));
    const players = comers(side);
    const order = seedOrder(slots.length).filter((v) => v <= slots.length);
    slots.forEach((x, i) => {
      const at = fill.get(x.setId) ?? [null, null];
      at[x.slot] = players[order[i] - 1] ?? null;
      fill.set(x.setId, at);
    });
  }
  return { ...bracket, rounds: bracket.rounds.map((r) => ({ ...r, sets: r.sets.map((x) => (fill.has(x.id) ? { ...x, projectedIn: fill.get(x.id) } : x)) })) };
}

type RawSetDetail = RawSet & {
  startedAt: number | null;
  stream: { streamName: string | null; streamSource: string | null } | null;
  phaseGroup: { id: string | number } | null;
  event: RawEvent | null;
  games: { orderNum: number; winnerId: string | number | null; stage: { name: string } | null; selections: { entrant: { id: string | number } | null; character: { name: string } | null }[] | null }[] | null;
};

/** One set with every game: characters, stages, winners. */
export async function getStartggSet(id: string): Promise<SetDetail | null> {
  "use cache: remote";
  if (!/^\d+$/.test(id)) {
    cacheLife(MISS_CACHE);
    return null; // preview sets of unstarted brackets have no page
  }
  const { set: raw } = await startggQuery<{ set: RawSetDetail | null }>(
    `query One($id: ID!) { set(id: $id) {
      ${SET_FIELDS}
      phaseGroup { id }
      startedAt
      stream { streamName streamSource }
      event { id name slug state videogame { id } tournament { name slug } }
      games { orderNum winnerId stage { name } selections { entrant { id } character { name } } }
    } }`,
    { id },
  );
  if (!raw || !raw.event) {
    cacheLife(MISS_CACHE);
    return null;
  }
  const base = toSet(raw, new Map());
  const event = toEvent({ ...raw.event, phases: [] });
  // Both players go on Smashy's saved list of players (singles only: a team has no one player id),
  // with the tag and sponsor they have today. The set itself shows the ones from that tournament:
  // saving those put MkLeo's 2019 sponsor on the list when someone opened an Evo 2019 set.
  await rememberPlayers(
    (raw.slots ?? []).flatMap((slot) => {
      const player = slot.entrant?.participants?.length === 1 ? slot.entrant.participants[0].player : null;
      return player?.gamerTag ? [{ playerId: String(player.id), tag: player.gamerTag, prefix: player.prefix ?? null }] : [];
    }),
  );
  cacheLife(base.state === "done" ? DONE_CACHE : LIVE_CACHE);
  return {
    ...base,
    source: "startgg",
    event: { eventId: event.eventId, eventName: event.eventName, game: event.game, tournamentName: event.tournamentName, tournamentSlug: event.tournamentSlug },
    groupId: raw.phaseGroup ? String(raw.phaseGroup.id) : null,
    sourceUrl: `${event.sourceUrl}/set/${raw.id}`,
    stream: raw.stream?.streamName && raw.stream.streamSource ? { source: raw.stream.streamSource, name: raw.stream.streamName } : null,
    startedAt: raw.startedAt,
    games: [...(raw.games ?? [])]
      .sort((a, b) => a.orderNum - b.orderNum)
      .map((g) => {
        const characters: Record<string, string[]> = {};
        for (const s of g.selections ?? []) {
          if (!s.entrant || !s.character) continue;
          (characters[String(s.entrant.id)] ??= []).push(s.character.name);
        }
        return { number: g.orderNum, winnerEntrantId: g.winnerId === null ? null : String(g.winnerId), stage: g.stage?.name ?? null, characters };
      }),
  };
}

/** start.gg link -> the event id (and pool, if the link points at one). */
export async function resolveStartggLink(url: string): Promise<{ eventId: string; groupId: string | null } | null> {
  const m = url.match(/start\.gg\/(tournament\/[^/?#\s]+\/event\/[^/?#\s]+)(?:\/brackets\/\d+\/(\d+))?/i);
  if (!m) return null;
  const { event } = await startggQuery<{ event: { id: string | number } | null }>(`query L($slug: String!) { event(slug: $slug) { id } }`, { slug: m[1].toLowerCase() });
  return event ? { eventId: String(event.id), groupId: m[2] ?? null } : null;
}

/** The Melee/Ultimate/etc. events of a tournament, for "View bracket" links on event pages. */
export async function getStartggTournamentEvents(slug: string): Promise<{ id: string; name: string; state: string | null }[]> {
  "use cache: remote"; // shared by every server (round 524)
  cacheLife("minutes");
  const { tournament } = await startggQuery<{ tournament: { events: { id: string | number; name: string; state: string | null; videogame: { id: number } | null }[] | null } | null }>(
    `query T($slug: String!) { tournament(slug: $slug) { events { id name state videogame { id } } } }`,
    { slug },
  );
  return (tournament?.events ?? [])
    .filter((e) => gameOfEvent(e))
    .map((e) => ({ id: String(e.id), name: e.name, state: e.state }));
}

// ---------- Bringing an event's players over to a Smashy bracket ----------

export type StartggEntrantList = {
  eventName: string;
  tournamentName: string | null;
  total: number; // how many entrants start.gg says the event has
  teams: boolean; // doubles or crews: more than one person per entrant
  players: { tag: string; seed: number | null }[];
};

type RawEntrantPage = {
  event: {
    name: string;
    tournament: { name: string } | null;
    entrants: { pageInfo: { total: number; totalPages: number } | null; nodes: { initialSeedNum: number | null; participants: { gamerTag: string | null }[] | null }[] | null } | null;
  } | null;
};

// A host previews the list and then adds it: two reads of the same event a few seconds apart.
// Remembered briefly so the second one usually doesn't ask start.gg again.
const ENTRANT_LISTS = new Map<string, { at: number; list: StartggEntrantList | null }>();
const ENTRANT_LIST_SECONDS = 120;
const ENTRANT_PAGE = 100;

/**
 * Everyone entered in a start.gg event, with their seed. Null when there's no such event. Stops
 * reading once the event is plainly bigger than `max` players (a Smashy bracket can't hold it):
 * `total` still says how big it is.
 */
export async function getStartggEntrantList(slug: string, max: number): Promise<StartggEntrantList | null> {
  const hit = ENTRANT_LISTS.get(slug);
  if (hit && Date.now() - hit.at < ENTRANT_LIST_SECONDS * 1000) return hit.list;
  const query = `query ImportEntrants($slug: String!, $page: Int!, $perPage: Int!) {
    event(slug: $slug) {
      name
      tournament { name }
      entrants(query: { page: $page, perPage: $perPage }) {
        pageInfo { total totalPages }
        nodes { initialSeedNum participants { gamerTag } }
      }
    }
  }`;
  let list: StartggEntrantList | null = null;
  for (let page = 1; page <= Math.ceil(max / ENTRANT_PAGE) + 1; page++) {
    const { event } = await startggQuery<RawEntrantPage>(query, { slug, page, perPage: ENTRANT_PAGE });
    if (!event) break;
    list ??= { eventName: event.name, tournamentName: event.tournament?.name ?? null, total: event.entrants?.pageInfo?.total ?? 0, teams: false, players: [] };
    for (const entrant of event.entrants?.nodes ?? []) {
      const people = entrant.participants ?? [];
      if (people.length > 1) list.teams = true;
      list.players.push({ tag: people[0]?.gamerTag ?? "", seed: entrant.initialSeedNum });
    }
    if (list.teams || list.total > max || page >= (event.entrants?.pageInfo?.totalPages ?? 1)) break;
  }
  if (ENTRANT_LISTS.size > 50) ENTRANT_LISTS.clear();
  ENTRANT_LISTS.set(slug, { at: Date.now(), list });
  return list;
}

/** A tournament's events (any game), for picking which one to bring players from. */
export async function getStartggEventChoices(tournamentSlug: string): Promise<{ tournamentName: string; events: { name: string; slug: string; players: number }[] } | null> {
  const { tournament } = await startggQuery<{ tournament: { name: string; events: { name: string; slug: string; numEntrants: number | null }[] | null } | null }>(
    `query ImportEvents($slug: String!) { tournament(slug: $slug) { name events { name slug numEntrants } } }`,
    { slug: tournamentSlug },
  );
  if (!tournament) return null;
  return { tournamentName: tournament.name, events: (tournament.events ?? []).map((e) => ({ name: e.name, slug: e.slug.toLowerCase(), players: e.numEntrants ?? 0 })) };
}

// ---------- My sets (for a linked start.gg account) ----------

export type MySet = BracketSet & {
  groupId: string | null;
  pool: string | null; // "Bracket", "Pools · 3"
  station: number | null;
  stream: string | null;
  called: boolean; // the TO called this set: go play now
  me: 0 | 1; // which of `players` is the viewer
};

export type MyEvent = {
  eventId: string;
  eventName: string;
  game: BracketEvent["game"];
  tournamentName: string;
  tournamentSlug: string;
  startAt: number;
  state: "upcoming" | "live" | "done";
  entrantId: string;
  myName: string;
  placement: number | null;
  sets: MySet[]; // oldest first
  status:
    | { kind: "up"; set: MySet } // called or playing right now
    | { kind: "next"; set: MySet } // next set is known (opponent may be TBD)
    | { kind: "out"; placement: number | null } // no sets left
    | { kind: "waiting"; lastWon: boolean } // still in it as far as start.gg knows, but no next set or result yet
    | { kind: "not_started" };
};

type RawMySet = RawSet & {
  station: { number: number | null } | null;
  stream: { streamName: string | null } | null;
  phaseGroup: { id: string | number; displayIdentifier: string | null; phase: { name: string } | null } | null;
};

type RawMyEvent = {
  id: string | number;
  name: string;
  startAt: number;
  state: string | null;
  videogame: { id: string | number } | null;
  tournament: { name: string; slug: string } | null;
  userEntrant: { id: string | number; name: string; standing: { placement: number | null } | null } | null;
};

/**
 * A linked player's current and upcoming events with every set: results so far, the set they're
 * called for (with station/stream), what's next. Refreshes every ~30 seconds while an event is live.
 */
export async function getMySets(startggUserId: number, startggPlayerId?: number | string | null): Promise<MyEvent[]> {
  "use cache: remote"; // shared by every server (round 557): asked on every signed-in Feed, Events and bracket page, about 6 start.gg requests each
  const now = Math.floor(Date.now() / 1000);
  // start.gg's user.events can miss new sign-ups (The Contract #225 was missing for a registered player
  // while user.tournaments had it), so also look through their upcoming tournaments' events.
  const EV = `id name startAt state videogame { id } tournament { name slug } userEntrant(userId: $u) { id name standing { placement } }`;
  const { user } = await startggQuery<{
    user: { events: { nodes: RawMyEvent[] | null }; tournaments: { nodes: { events: (RawMyEvent & { videogame: { id: string | number } | null })[] | null }[] | null } } | null;
  }>(
    `query MyEvents($u: ID!, $games: [ID]) { user(id: $u) {
      events(query: { page: 1, perPage: 12, filter: { videogameId: $games } }) { nodes { ${EV} } }
      tournaments(query: { page: 1, perPage: 4, filter: { upcoming: true, past: false } }) { nodes { events { ${EV} } } }
    } }`,
    { u: startggUserId, games: SUPPORTED_GAME_IDS },
  );
  const supported = new Set(SUPPORTED_GAME_IDS.map(String));
  const fromTournaments = (user?.tournaments.nodes ?? [])
    .flatMap((t) => t.events ?? [])
    .filter((e) => e.userEntrant && e.videogame && supported.has(String(e.videogame.id)));
  // Entries an organizer added that aren't connected to the account (see playerSetEvents).
  const fromSets: RawMyEvent[] = (
    startggPlayerId ? await playerSetEvents(startggPlayerId).catch((e) => (console.error("player sets lookup failed", e instanceof Error ? e.message : e), [])) : []
  )
    .filter((e) => e.videogameId && supported.has(e.videogameId))
    .map((e) => ({
      id: e.eventId,
      name: e.eventName,
      startAt: e.startAt,
      state: e.state,
      videogame: { id: e.videogameId! },
      tournament: { name: e.tournamentName, slug: e.tournamentSlug },
      userEntrant: { id: e.entrantId, name: e.entrantName, standing: { placement: e.placement } },
    }));
  const seen = new Set<string>();
  const all = [...(user?.events.nodes ?? []), ...fromTournaments, ...fromSets].filter((e) => !seen.has(String(e.id)) && !!seen.add(String(e.id)));
  // Live events, ones starting in the next 3 weeks, and ones that ended in the last day.
  const relevant = all
    // Leagues and seasons run for weeks: an event start.gg says is in progress stays for up to ten weeks.
    .filter((e) => e.userEntrant && e.tournament && (e.startAt > now - 4 * 86400 || (e.state === "ACTIVE" && e.startAt > now - 70 * 86400)) && e.startAt < now + 21 * 86400)
    .filter((e) => e.state !== "COMPLETED" || e.startAt > now - 2 * 86400)
    // The 4 that matter most: what's being played now, then what's coming up (soonest first),
    // then what just finished (latest first). Oldest-first used to cut the event you were in when
    // you had entered a few that were already over.
    .sort((a, b) => myEventRank(a, now) - myEventRank(b, now) || (a.state === "COMPLETED" ? b.startAt - a.startAt : a.startAt - b.startAt))
    .slice(0, 4);

  // Each event's sets at once (round 562): one after another, four events took four start.gg round trips.
  const setsByEvent = await Promise.all(
    relevant.map((e) =>
      startggQuery<{ entrant: { paginatedSets: { nodes: RawMySet[] | null } } | null }>(
        `query MySets($id: ID!) { entrant(id: $id) { paginatedSets(page: 1, perPage: 30, sortType: RECENT) { nodes {
          ${SET_FIELDS} station { number } stream { streamName } phaseGroup { id displayIdentifier phase { name } }
        } } } }`,
        { id: String(e.userEntrant!.id) },
      ),
    ),
  );
  const events: MyEvent[] = [];
  for (const [i, e] of relevant.entries()) {
    const entrantId = String(e.userEntrant!.id);
    const data = setsByEvent[i];
    const raw = (data.entrant?.paginatedSets.nodes ?? []).filter((s) => (s.slots ?? []).some((sl) => sl.entrant));
    const sets: MySet[] = raw.map((s) => {
      const base = toSet(s, new Map());
      const me: 0 | 1 = base.players[1]?.entrantId === entrantId ? 1 : 0;
      return {
        ...base,
        groupId: s.phaseGroup ? String(s.phaseGroup.id) : null,
        pool: s.phaseGroup?.phase?.name ? `${s.phaseGroup.phase.name}${s.phaseGroup.displayIdentifier && s.phaseGroup.displayIdentifier !== "1" ? ` · ${s.phaseGroup.displayIdentifier}` : ""}` : null,
        station: s.station?.number ?? null,
        stream: s.stream?.streamName ?? null,
        called: s.state === 6,
        me,
      };
    });
    sets.sort((a, b) => (a.completedAt ?? Infinity) - (b.completedAt ?? Infinity) || Math.abs(a.round) - Math.abs(b.round));

    const state: MyEvent["state"] = e.state === "COMPLETED" ? "done" : e.state === "ACTIVE" ? "live" : "upcoming";
    const status = myStatus(state, sets, e.userEntrant!.standing?.placement ?? null);

    events.push({
      eventId: String(e.id),
      eventName: e.name,
      game: gameOfEvent(e),
      tournamentName: e.tournament!.name,
      tournamentSlug: e.tournament!.slug.replace(/^tournament\//, ""),
      startAt: e.startAt,
      state,
      entrantId,
      myName: e.userEntrant!.name,
      placement: e.userEntrant!.standing?.placement ?? null,
      sets,
      status,
    });
  }

  // Live: refresh every ~30 seconds. Otherwise every few minutes is plenty.
  // Also check often from 2 hours before a bracket starts, so "You're up" works when it goes live.
  cacheLife(events.some((ev) => isActiveSoon(ev, Math.floor(Date.now() / 1000))) ? LIVE_CACHE : MISS_CACHE);
  return events;
}

type RawStanding = { placement: number; entrant: { id: number; name: string; initialSeedNum: number | null; participants: { prefix: string | null; gamerTag: string; player: { id: number } | null }[] | null } | null };

/**
 * A finished event's Top 3 from start.gg's own final standings (right even when start.gg lists the
 * final bracket out of order, or there's a redemption bracket). Null until the event is completed.
 */
/** A finished start.gg event's Top 8 (a few more, so a tie at the edge can be seen and left out whole), for its results picture. */
export type StartggTop8 = {
  eventName: string;
  tournamentName: string;
  startAt: number | null;
  timezone: string | null;
  entrants: number;
  game: ReturnType<typeof gameKeyFromStartggId>;
  teams: boolean;
  /** `prefix`: the sponsor, for text ("LG | Fred"); the picture shows the tag alone. */
  standings: { placement: number; tag: string; prefix: string | null }[];
  /** start.gg's own rows, for the Top 3 (getStartggPodium reads them: one request for both). */
  nodes: RawStanding[];
};

export async function getStartggTop8(eventId: string): Promise<StartggTop8 | null> {
  "use cache: remote"; // shared by every server (round 524)
  if (!/^\d+$/.test(eventId)) {
    cacheLife(MISS_CACHE);
    return null;
  }
  const data = await startggQuery<{
    event: {
      name: string;
      state: string | null;
      startAt: number | null;
      numEntrants: number | null;
      teamRosterSize: { maxPlayers: number | null } | null;
      videogame: { id: number } | null;
      tournament: { name: string; timezone: string | null } | null;
      standings: { nodes: RawStanding[] | null } | null;
    } | null;
  }>(
    `query T($id: ID!) { event(id: $id) { name state startAt numEntrants teamRosterSize { maxPlayers } videogame { id } tournament { name timezone }
      standings(query: { perPage: 12, page: 1 }) { nodes { placement entrant { id name initialSeedNum participants { prefix gamerTag player { id } } } } } } }`,
    { id: eventId },
  );
  const ev = data.event;
  if (!ev || ev.state !== "COMPLETED") {
    cacheLife(MISS_CACHE);
    return null;
  }
  cacheLife(DONE_CACHE);
  const standings = (ev.standings?.nodes ?? [])
    .filter((n) => n.entrant && n.placement >= 1)
    .map((n) => {
      const p = n.entrant!.participants?.length === 1 ? n.entrant!.participants[0] : null; // doubles teams use the team name
      return { placement: n.placement, tag: p?.gamerTag ?? n.entrant!.name, prefix: p?.prefix && p.prefix !== p.gamerTag ? p.prefix : null };
    });
  return {
    eventName: ev.name,
    tournamentName: ev.tournament?.name ?? "",
    startAt: ev.startAt,
    timezone: ev.tournament?.timezone ?? null,
    entrants: ev.numEntrants ?? standings.length,
    game: gameOfEvent(ev),
    teams: (ev.teamRosterSize?.maxPlayers ?? 1) > 1,
    standings,
    nodes: ev.standings?.nodes ?? [],
  };
}

/** The Top 3 from the same cached standings as the Top 8 (no request of its own). */
export async function getStartggPodium(eventId: string): Promise<Podium | null> {
  const top = await getStartggTop8(eventId);
  if (!top) return null;
  const at = (place: number): SetPlayer | null => {
    const e = top.nodes.find((n) => n.placement === place)?.entrant;
    if (!e) return null;
    const p = e.participants?.length === 1 ? e.participants[0] : null; // doubles teams use the team name
    return {
      entrantId: String(e.id),
      name: p?.gamerTag ?? e.name,
      prefix: p?.prefix && p.prefix !== p.gamerTag ? p.prefix : null,
      seed: e.initialSeedNum,
      playerId: p?.player ? String(p.player.id) : null,
      score: null,
      won: place === 1,
    };
  };
  const first = at(1);
  const second = at(2);
  return first && second ? { first, second, third: at(3) } : null;
}

/**
 * Which pool a player is in across the whole event (round 456): the bracket's "Find a player" only
 * looks at the pool on screen, so Zain wasn't found from Top 132 Pool H1 while he played in Pool I1.
 * The pool of their live set, else their next one, else their latest. Up to 3 players match by name.
 */
export async function findStartggEntrantPools(eventId: string, q: string): Promise<{ tag: string; groupId: string }[]> {
  "use cache: remote";
  cacheLife({ stale: 30, revalidate: 60, expire: 600 });
  if (!/^\d+$/.test(eventId) || q.length < 2) return [];
  const found = await startggQuery<{ event: { entrants: { nodes: { id: string | number; name: string; participants: { gamerTag: string }[] | null }[] | null } | null } | null }>(
    `query N($e: ID!, $q: String!) { event(id: $e) { entrants(query: { page: 1, perPage: 3, filter: { name: $q } }) { nodes { id name participants { gamerTag } } } } }`,
    { e: eventId, q },
  );
  const entrants = found.event?.entrants?.nodes ?? [];
  const out = await Promise.all(
    entrants.map(async (en) => {
      const data = await startggQuery<{ event: { sets: { nodes: { state: number | null; phaseGroup: { id: string | number } | null }[] | null } | null } | null }>(
        `query P($e: ID!, $ent: ID!) { event(id: $e) { sets(page: 1, perPage: 8, sortType: RECENT, filters: { entrantIds: [$ent] }) { nodes { state phaseGroup { id } } } } }`,
        { e: eventId, ent: en.id },
      );
      const sets = (data.event?.sets?.nodes ?? []).filter((x) => x.phaseGroup);
      const pick = sets.find((x) => x.state === 2 || x.state === 6) ?? sets.find((x) => x.state === 1) ?? sets[0];
      const tag = en.participants?.length === 1 ? en.participants[0].gamerTag : en.name;
      return pick?.phaseGroup ? { tag, groupId: String(pick.phaseGroup.id) } : null;
    }),
  );
  return out.filter((x): x is { tag: string; groupId: string } => !!x);
}
