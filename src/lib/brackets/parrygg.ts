// parry.gg brackets, via their JSON-over-HTTP API (https://developer.parry.gg).
// Server-only: the API key must never reach the browser.
// Note: parry.gg leaves out fields with default values (0, false, ""), so treat missing as default.
import "server-only";
import { cacheLife } from "next/cache";
import { defaultGroupId, poolSettled, type PhaseInfo } from "./phases";
import type { GameKey } from "../games";
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

const API = "https://grpcweb.parry.gg/parrygg.services";
const LIVE_CACHE = { stale: 15, revalidate: 30, expire: 600 };
const DONE_CACHE = { stale: 300, revalidate: 3600, expire: 86400 };
const MISS_CACHE = { stale: 60, revalidate: 300, expire: 3600 };
const PENDING_CACHE = { stale: 30, revalidate: 60, expire: 600 };
const ID = /^[0-9a-f-]{36}$/i;

async function call<T>(service: string, method: string, body: object): Promise<T> {
  const key = process.env.PARRYGG_API_KEY;
  if (!key) throw new Error("PARRYGG_API_KEY is missing. Add it to .env.local.");
  const res = await fetch(`${API}.${service}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-KEY": key },
    body: JSON.stringify(body),
  });
  if (res.status === 404) return {} as T;
  if (!res.ok) throw new Error(`parry.gg ${service}/${method} failed: ${res.status}`);
  return (await res.json()) as T;
}

const GAME_NAMES: Record<string, GameKey> = {
  "Super Smash Bros. Melee": "melee",
  "Super Smash Bros. Ultimate": "ultimate",
  "Project+": "pplus",
  "Super Smash Bros.": "smash64",
  "Super Smash Bros. Brawl": "brawl",
  "Super Smash Bros. for Wii U": "smash4",
  "Super Smash Bros. for Nintendo 3DS": "smash4",
};

type PUser = { gamerTag?: string; sponsorName?: string };
type PSeed = { id: string; seed?: number; eventEntrant?: { name?: string; entrant?: { users?: PUser[] } } };
type PSlot = { slot?: number; seedId?: string; placement?: number; score?: number; state?: string };
type PMatch = {
  id: string;
  identifier?: string;
  round?: number;
  winnersSide?: boolean;
  grandFinals?: boolean;
  prevMatchId1?: string;
  prevMatchId2?: string;
  winnersMatchId?: string;
  losersMatchId?: string;
  state?: string;
  slots?: PSlot[];
  endedAt?: string;
  startedAt?: string;
  matchGames?: {
    index?: number;
    stages?: { name?: string }[];
    slots?: { slot?: number; score?: number; placement?: number; participants?: { characters?: { name?: string }[] }[] }[];
  }[];
};
type PBracket = {
  id: string;
  state?: string;
  type?: string;
  name?: string;
  slug?: string;
  matches?: PMatch[];
  seeds?: PSeed[];
  rounds?: { number?: number; winnersSide?: boolean; label?: string }[];
};
type PPhase = { id: string; name?: string; slug?: string; brackets?: { id: string; name?: string; slug?: string; state?: string }[] };
type PEvent = {
  id: string;
  tournamentId?: string;
  name?: string;
  slug?: string;
  game?: { name?: string };
  phases?: PPhase[];
  entrantCount?: number;
  entrantCap?: number;
  locationType?: string;
  state?: string;
  startDate?: string;
};
type PTournament = {
  id: string;
  name?: string;
  slugs?: { slug?: string; type?: string }[];
  events?: PEvent[];
  startDate?: string;
  endDate?: string;
  timeZone?: string;
  state?: string;
  featured?: boolean;
  numAttendees?: number;
  locationType?: string;
  venueAddress?: string;
  address?: { locality?: string; countryCode?: string; administrativeAreaLevel1?: string; formattedAddress?: string };
  images?: { url?: string; type?: string }[];
};

const BRACKET_TYPES: Record<string, Bracket["type"]> = {
  BRACKET_TYPE_DOUBLE_ELIMINATION: "double",
  BRACKET_TYPE_SINGLE_ELIMINATION: "single",
  BRACKET_TYPE_ROUND_ROBIN: "round_robin",
};

function matchState(state?: string): SetState {
  if (state === "MATCH_STATE_COMPLETED") return "done";
  if (state === "MATCH_STATE_IN_PROGRESS" || state === "MATCH_STATE_CALLED") return "live";
  return "pending";
}

const unix = (iso?: string) => {
  const t = iso ? Date.parse(iso) / 1000 : 0;
  return t > 86400 ? Math.floor(t) : null; // parry.gg uses 1970-01-01 for "not set"
};

/**
 * The tournament's permanent address on parry.gg ("melee-monday-511-01a1c0b9"). Not the short custom
 * one ("denver"): a series shares that, and it moves to the newest edition every week.
 */
function slugOf(t: PTournament) {
  return t.slugs?.find((s) => s.type === "SLUG_TYPE_PRIMARY")?.slug ?? t.slugs?.find((s) => s.type === "SLUG_TYPE_CUSTOM")?.slug ?? t.slugs?.[0]?.slug ?? t.id;
}

/** Turns one parry.gg match into Smashy's set format. Players are keyed by their seed id. */
function toSet(m: PMatch, seeds: Map<string, PSeed>, byId: Map<string, PMatch>, roundLabels: Map<string, string>): BracketSet {
  const slots = [0, 1].map((i) => (m.slots ?? []).find((s) => (s.slot ?? 0) === i) ?? null);
  const state = matchState(m.state);
  // Winner = the slot with the better placement once the match is done (placement 0 is first).
  let winner: number | null = null;
  if (state === "done" && slots[0] && slots[1]) {
    const [a, b] = slots as PSlot[];
    winner = (a.placement ?? 0) !== (b.placement ?? 0) ? ((a.placement ?? 0) < (b.placement ?? 0) ? 0 : 1) : (a.score ?? 0) >= (b.score ?? 0) ? 0 : 1;
  }
  const player = (s: PSlot | null, i: number): SetPlayer | null => {
    const seed = s?.seedId ? seeds.get(s.seedId) : undefined;
    if (!s || !seed) return null;
    const users = seed.eventEntrant?.entrant?.users ?? [];
    const solo = users.length === 1 ? users[0] : null;
    return {
      entrantId: seed.id,
      name: solo?.gamerTag ?? seed.eventEntrant?.name ?? "Player",
      prefix: solo?.sponsorName && solo.sponsorName !== solo.gamerTag ? solo.sponsorName : null,
      seed: seed.seed ?? null,
      score: s.state === "SLOT_STATE_DQ" ? -1 : state === "pending" ? null : s.score ?? 0,
      won: winner === i,
    };
  };
  const waiting = (i: number): string | null => {
    if (slots[i]?.seedId) return null;
    if (slots[i]?.state === "SLOT_STATE_BYE") return "Bye";
    if (m.prevMatchId1 && m.prevMatchId1 === m.prevMatchId2) return "If needed"; // grand final reset
    const prevId = i === 0 ? m.prevMatchId1 : m.prevMatchId2;
    const prev = prevId ? byId.get(prevId) : undefined;
    if (!prev) return "TBD";
    return `${prev.losersMatchId === m.id ? "Loser" : "Winner"} of ${prev.identifier ?? "previous set"}`;
  };
  const winnersSide = Boolean(m.winnersSide) || Boolean(m.grandFinals);
  const n = m.round ?? 0;
  return {
    id: m.id,
    identifier: m.identifier ?? null,
    round: winnersSide ? n : -n,
    roundLabel: roundLabels.get(`${winnersSide}:${n}`) ?? (m.grandFinals ? "Grand Final" : `${winnersSide ? "Winners" : "Losers"} Round ${n}`),
    winnersSide,
    state,
    players: [player(slots[0], 0), player(slots[1], 1)],
    waitingOn: [waiting(0), waiting(1)],
    completedAt: unix(m.endedAt),
  };
}

function convertBracket(b: PBracket): BracketSet[] {
  const seeds = new Map((b.seeds ?? []).map((s) => [s.id, s]));
  const matches = b.matches ?? [];
  const byId = new Map(matches.map((m) => [m.id, m]));
  const labels = new Map((b.rounds ?? []).map((r) => [`${Boolean(r.winnersSide)}:${r.number ?? 0}`, r.label ?? ""]));
  return matches
    .filter((m) => !(m.slots ?? []).some((s) => s.state === "SLOT_STATE_BYE")) // hide byes, like start.gg
    .map((m) => toSet(m, seeds, byId, labels));
}

async function loadEvent(eventId: string): Promise<{ event: PEvent; tournament: PTournament } | null> {
  const { event } = await call<{ event?: PEvent }>("EventService", "GetEvent", { id: eventId });
  if (!event?.tournamentId) return null;
  const { tournament } = await call<{ tournament?: PTournament }>("TournamentService", "GetTournament", { id: event.tournamentId });
  return tournament ? { event, tournament } : null;
}

function toEvent(event: PEvent, tournament: PTournament): BracketEvent {
  const phases = event.phases ?? [];
  const groups: BracketGroup[] = phases.flatMap((ph) =>
    (ph.brackets ?? []).map((b) => {
      const phaseName = ph.name || (phases.length > 1 ? ph.slug ?? "Phase" : "Bracket");
      const many = (ph.brackets ?? []).length > 1;
      return { id: b.id, label: many ? `${phaseName} · ${b.name || b.slug || "Pool"}` : phaseName, phase: phaseName };
    }),
  );
  return {
    source: "parrygg",
    eventId: event.id,
    eventName: event.name ?? "Event",
    game: GAME_NAMES[event.game?.name ?? ""] ?? null,
    tournamentName: tournament.name ?? "Tournament",
    tournamentSlug: `parrygg/${slugOf(tournament).toLowerCase()}`, // Smashy's page for it: /events/parrygg/<slug>
    sourceUrl: `https://parry.gg/${slugOf(tournament)}/${event.slug ?? ""}`,
    groups,
  };
}

/** The event's phases as defaultGroupId takes them, and whether the event is over (every pool is done). */
function phaseStates(event: PEvent): { phases: PhaseInfo[]; over: boolean } {
  const stateNo = (st?: string) => (st === "BRACKET_STATE_COMPLETED" ? 3 : st === "BRACKET_STATE_IN_PROGRESS" ? 2 : 1);
  const phases: PhaseInfo[] = (event.phases ?? []).map((ph, i) => ({
    name: ph.name ?? "",
    order: i, // parry.gg lists phases in playing order
    groups: (ph.brackets ?? []).map((b) => ({ id: b.id, state: stateNo(b.state) })),
  }));
  const over = phases.length > 0 && phases.every((ph) => ph.groups.length > 0 && ph.groups.every((g) => g.state === 3));
  return { phases, over };
}

/** A whole parry.gg bracket (pool) of an event. */
export async function getParryggBracket(eventId: string, groupId?: string | null): Promise<Bracket | null> {
  "use cache";
  if (!ID.test(eventId) || (groupId && !ID.test(groupId))) {
    cacheLife(MISS_CACHE);
    return null;
  }
  const loaded = await loadEvent(eventId);
  if (!loaded) {
    cacheLife(MISS_CACHE);
    return null;
  }
  const event = toEvent(loaded.event, loaded.tournament);
  // The pool to open by default (see defaultGroupId): the final bracket once every pool is done.
  const { phases, over } = phaseStates(loaded.event);
  const gid = groupId && event.groups.some((g) => g.id === groupId) ? groupId : defaultGroupId(phases, over);
  if (!gid) {
    cacheLife(MISS_CACHE);
    return { event, groupId: "", type: "other", rounds: [], live: false, finished: false };
  }
  const { bracket } = await call<{ bracket?: PBracket }>("BracketService", "GetBracket", { id: gid });
  if (!bracket) {
    cacheLife(MISS_CACHE);
    return null;
  }
  const sets = convertBracket(bracket);
  const live = bracket.state === "BRACKET_STATE_IN_PROGRESS";
  const ph = (loaded.event.phases ?? []).find((p) => (p.brackets ?? []).some((b) => b.id === gid));
  const b = ph?.brackets?.find((x) => x.id === gid);
  event.sourceUrl = `https://parry.gg/${slugOf(loaded.tournament)}/${loaded.event.slug ?? ""}/${ph?.slug ?? "main"}/${b?.slug ?? "bracket"}`;
  const finished = bracket.state === "BRACKET_STATE_COMPLETED" || (sets.length > 0 && sets.every((s) => s.state === "done"));
  // A finished pool is only kept for an hour once it's settled (see poolSettled): the event's
  // default link has to move on to the next phase when that starts.
  const settled = poolSettled(finished, !!groupId && gid === groupId, over);
  cacheLife(live ? LIVE_CACHE : settled ? DONE_CACHE : PENDING_CACHE);
  return { event, groupId: gid, type: BRACKET_TYPES[bracket.type ?? ""] ?? "other", rounds: toRounds(sets), live, finished };
}

/** One parry.gg match with its games (characters and stages, when the TO recorded them). */
export async function getParryggSet(id: string): Promise<SetDetail | null> {
  "use cache";
  if (!ID.test(id)) {
    cacheLife(MISS_CACHE);
    return null;
  }
  const res = await call<{ match?: { match?: PMatch; hierarchy?: { paths?: { id: string; type?: string }[] } } }>("MatchService", "GetMatch", { id });
  const m = res.match?.match;
  const paths = res.match?.hierarchy?.paths ?? [];
  const bracketId = paths.find((p) => p.type === "PATH_TYPE_BRACKET")?.id;
  const eventId = paths.find((p) => p.type === "PATH_TYPE_EVENT")?.id;
  const loaded = eventId ? await loadEvent(eventId) : null;
  if (!m || !bracketId || !loaded) {
    cacheLife(MISS_CACHE);
    return null;
  }
  const { bracket } = await call<{ bracket?: PBracket }>("BracketService", "GetBracket", { id: bracketId });
  const seeds = new Map((bracket?.seeds ?? []).map((s) => [s.id, s]));
  const byId = new Map((bracket?.matches ?? []).map((x) => [x.id, x]));
  const labels = new Map((bracket?.rounds ?? []).map((r) => [`${Boolean(r.winnersSide)}:${r.number ?? 0}`, r.label ?? ""]));
  const base = toSet(m, seeds, byId, labels);
  const event = toEvent(loaded.event, loaded.tournament);
  const slotSeed = [0, 1].map((i) => (m.slots ?? []).find((s) => (s.slot ?? 0) === i)?.seedId ?? null);

  cacheLife(base.state === "done" ? DONE_CACHE : LIVE_CACHE);
  return {
    ...base,
    source: "parrygg",
    event: { eventId: event.eventId, eventName: event.eventName, game: event.game, tournamentName: event.tournamentName, tournamentSlug: null },
    groupId: bracketId,
    sourceUrl: event.sourceUrl,
    stream: null, // parry.gg doesn't say which stream a match was on yet
    startedAt: unix(m.startedAt),
    games: [...(m.matchGames ?? [])]
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      .map((g, i) => {
        const gs = [0, 1].map((k) => (g.slots ?? []).find((s) => (s.slot ?? 0) === k));
        let winner: string | null = null;
        if (gs[0] && gs[1]) {
          const w = (gs[0].placement ?? 0) !== (gs[1].placement ?? 0) ? ((gs[0].placement ?? 0) < (gs[1].placement ?? 0) ? 0 : 1) : (gs[0].score ?? 0) >= (gs[1].score ?? 0) ? 0 : 1;
          winner = slotSeed[w];
        }
        const characters: Record<string, string[]> = {};
        gs.forEach((s, k) => {
          const seedId = slotSeed[k];
          const names = (s?.participants ?? []).flatMap((p) => (p.characters ?? []).map((c) => c.name ?? "")).filter(Boolean);
          if (seedId && names.length) characters[seedId] = names;
        });
        return { number: (g.index ?? i) + 1, winnerEntrantId: winner, stage: g.stages?.[0]?.name ?? null, characters };
      }),
  };
}

/** parry.gg link (parry.gg/tournament/event[/phase/bracket]) -> event id and bracket id. */
export async function resolveParryggLink(url: string): Promise<{ eventId: string; groupId: string | null } | null> {
  const m = url.match(/parry\.gg\/([a-z0-9-]+)\/([a-z0-9-]+)(?:\/([a-z0-9-]+)\/([a-z0-9-]+))?/i);
  if (!m) return null;
  const [, tSlug, eSlug, pSlug, bSlug] = m.map((x) => x?.toLowerCase());
  const { tournament } = await call<{ tournament?: PTournament }>("TournamentService", "GetTournament", { tournamentSlug: tSlug });
  const event = tournament?.events?.find((e) => e.slug === eSlug);
  if (!event) return null;
  const phase = pSlug ? event.phases?.find((p) => p.slug === pSlug) : undefined;
  const bracket = bSlug ? phase?.brackets?.find((b) => b.slug === bSlug) : undefined;
  return { eventId: event.id, groupId: bracket?.id ?? null };
}

// ---------- Tournaments (for majors and Smashy's /events/parrygg/<slug> page) ----------

/** One event of a parry.gg tournament, as Smashy shows it. `game` is null for games Smashy doesn't cover. */
export type ParryggTournamentEvent = {
  id: string;
  name: string;
  slug: string;
  game: GameKey | null;
  gameName: string | null;
  entrants: number;
  cap: number | null;
  online: boolean;
  /** Its bracket has started (or finished): Smashy can show it at /brackets/parrygg/<id>. */
  started: boolean;
};

export type ParryggTournament = {
  /** Its permanent parry.gg slug ("blitz-box-01a1c611"), lowercased: Smashy's page is /events/parrygg/<slug>. */
  slug: string;
  name: string;
  startAt: number | null;
  /** Null when parry.gg has no end date (it often doesn't). */
  endAt: number | null;
  timezone: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  address: string | null;
  featured: boolean;
  attendees: number;
  online: boolean;
  over: boolean;
  /** A square picture (parry.gg's avatar), if the organizer set one. */
  avatarUrl: string | null;
  bannerUrl: string | null;
  url: string;
  events: ParryggTournamentEvent[];
};

function toTournament(t: PTournament): ParryggTournament {
  const slug = slugOf(t).toLowerCase();
  const image = (type: string) => t.images?.find((i) => i.type === type)?.url ?? null;
  const events: ParryggTournamentEvent[] = (t.events ?? []).map((e) => ({
    id: e.id,
    name: e.name || "Event",
    slug: e.slug ?? "",
    game: GAME_NAMES[e.game?.name ?? ""] ?? null,
    gameName: e.game?.name ?? null,
    entrants: e.entrantCount ?? 0,
    cap: e.entrantCap ? e.entrantCap : null,
    online: e.locationType === "LOCATION_TYPE_ONLINE",
    started: (e.phases ?? []).some((ph) => (ph.brackets ?? []).some((b) => b.state === "BRACKET_STATE_IN_PROGRESS" || b.state === "BRACKET_STATE_COMPLETED")),
  }));
  return {
    slug,
    name: t.name || "Tournament",
    startAt: unix(t.startDate),
    endAt: unix(t.endDate),
    timezone: t.timeZone || null,
    city: t.address?.locality || null,
    region: t.address?.administrativeAreaLevel1 || null,
    country: t.address?.countryCode || null,
    address: t.address?.formattedAddress || t.venueAddress?.trim() || null,
    featured: Boolean(t.featured),
    attendees: t.numAttendees ?? 0,
    online: t.locationType === "LOCATION_TYPE_ONLINE",
    over: t.state === "TOURNAMENT_STATE_COMPLETED",
    avatarUrl: image("IMAGE_TYPE_AVATAR"),
    bannerUrl: image("IMAGE_TYPE_BANNER"),
    url: `https://parry.gg/${slugOf(t)}`,
    events,
  };
}

const SLUG = /^[a-z0-9-]{1,80}$/i;

/** A parry.gg tournament by its slug (permanent, or a short one like "box"), for Smashy's page about it. Null when there's no such tournament. */
export async function getParryggTournament(slug: string): Promise<ParryggTournament | null> {
  "use cache";
  if (!SLUG.test(slug)) {
    cacheLife(MISS_CACHE);
    return null;
  }
  const { tournament } = await call<{ tournament?: PTournament }>("TournamentService", "GetTournament", { tournamentSlug: slug.toLowerCase() });
  if (!tournament) {
    cacheLife(MISS_CACHE);
    return null;
  }
  const t = toTournament(tournament);
  cacheLife(t.over ? DONE_CACHE : PENDING_CACHE);
  return t;
}

/**
 * The tournaments on parry.gg's home page, in its order: the ones parry.gg features first, then
 * running and upcoming ones by date, then finished ones. Not cached: the majors scan calls it every
 * few hours and saves what it keeps.
 */
export async function getParryggHomeTournaments(pages = 2): Promise<ParryggTournament[]> {
  const out: ParryggTournament[] = [];
  for (let page = 1; page <= pages; page++) {
    const res = await call<{ tournaments?: PTournament[] }>("TournamentService", "GetTournaments", {
      sortOrder: "TOURNAMENTS_SORT_ORDER_HOME",
      paginationRequest: { pageSize: 50, pageNumber: page },
    });
    const list = res.tournaments ?? [];
    out.push(...list.map(toTournament));
    if (list.length < 50) break;
  }
  return out;
}

/** The tournament slug in a parry.gg link ("https://parry.gg/box", "parry.gg/box/melee-singles"), lowercased. */
export function parseParryggSlug(input: string): string | null {
  const m = input.trim().match(/parry\.gg\/([a-z0-9-]+)/i);
  return m ? m[1].toLowerCase() : null;
}
