// Smash history, steps H4 and H5 (docs/archive-plan.md): the sets played at each major, saved once from
// start.gg in `major_sets`, for head-to-head at majors (the player compare page) and the characters
// each top 8 player used (Smash history and hand-added major pages). Facts only, credited to start.gg.
//
// What's saved: each major's main singles bracket per game (its biggest in-person singles event), from
// the final phases only: the phases of 64 players or fewer at the end of the bracket (top 64, top 8),
// or the last phase when there's none that small. A 3,000-player major has ~6,000 sets, nearly all in
// pools between players nobody looks up; its top 64 is ~140 sets, about 6 requests instead of ~250, and
// holds the sets between the players historians compare. Biggest brackets first.
//
// Hand-added majors (2014–2016) whose start.gg tournament round 526 found (`major_events.startgg_tournament`)
// are included: their bracket is the one full standings matched, or the singles event sharing the most
// top 8 players.
//
// Filled slowly in the background (the daily job, and a few requests after someone opens a year on
// Smash history): 1.5 s between requests, stopping when this server has sent 25 of start.gg's 80 a
// minute (live brackets and guests come first), one bracket at a time claimed in the database.
import "server-only";
import { cacheLife } from "next/cache";
import { characterKey } from "./characters";
import { gameOfEvent, type GameKey } from "./games";
import { isManualEvent } from "./handMajors";
import type { MajorEvent, Top8Row } from "./majorEvents";
import { pickMainEvent } from "./mainEvent";
import { isParryggMajor } from "./majors";
import { linkKey, linkedId, nameKey } from "./playerLinks";
import { isTooComplex, startggLoad, startggQuery } from "./startgg";
import { createAdminClient } from "./supabase/admin";
import { createGuestClient } from "./supabase/guest";
import { createClient } from "./supabase/server";

const PAUSE_MS = 1500;
const BUSY_LOAD = 25; // the same give-way point as the top 8 filler (majorEvents.ts)
const FINAL_PHASE_MAX = 64; // phases this small (or smaller) at the end of a bracket are saved
const FIRST_PAGE_SIZE = 32; // sets per request; halved when start.gg says a page is too big
const MAX_PAGES = 40;
const SETTLED_DAYS = 3; // a major that ended this recently may still be fixing its bracket

// ---------- start.gg shapes and turning them into rows (pure, tested) ----------

export type RawPhase = { id: string | number; name: string | null; phaseOrder: number | null; numSeeds: number | null };
type RawSlot = {
  entrant: { id: string | number; name: string | null; participants: { gamerTag?: string | null; player: { id: string | number } | null }[] | null } | null;
  standing: { stats: { score: { value: number | null } | null } | null } | null;
};
export type RawMajorSet = {
  id: string | number;
  fullRoundText: string | null;
  round: number | null;
  winnerId: string | number | null;
  completedAt: number | null;
  phaseGroup: { phase: { id: string | number } | null } | null;
  slots: RawSlot[] | null;
  games: { selections: { entrant: { id: string | number } | null; character: { name: string | null } | null }[] | null }[] | null;
};

export type SavedSet = {
  set_id: string;
  major_slug: string;
  event_id: string;
  game: GameKey;
  phase: string | null;
  round: string | null;
  sort_order: number;
  completed_at: string | null;
  p1_id: string | null;
  p1_name: string;
  p1_score: number | null;
  p1_chars: string[];
  p2_id: string | null;
  p2_name: string;
  p2_score: number | null;
  p2_chars: string[];
  winner: 1 | 2;
};

/**
 * The phases whose sets are saved: from the end of the bracket back, every phase of 64 players or
 * fewer (top 64, then top 8); when the last phase is bigger (one big bracket), just that one.
 */
export function finalPhases(phases: RawPhase[]): RawPhase[] {
  const ordered = [...phases].sort((a, b) => (a.phaseOrder ?? 0) - (b.phaseOrder ?? 0));
  const out: RawPhase[] = [];
  for (let i = ordered.length - 1; i >= 0; i--) {
    const seeds = ordered[i].numSeeds;
    if (seeds != null && seeds <= FINAL_PHASE_MAX) out.unshift(ordered[i]);
    else break;
  }
  return out.length ? out : ordered.slice(-1);
}

/** A tag without its sponsor ("C9 | Mang0" → "Mang0"). */
export const tagOnly = (name: string) => name.split(" | ").at(-1)!.trim();

/** One start.gg set → a row, or null for sets that weren't played (byes, DQs, unfinished). */
export function toSavedSet(raw: RawMajorSet, at: { majorSlug: string; eventId: string; game: GameKey; phases: Map<string, RawPhase> }): SavedSet | null {
  const slots = (raw.slots ?? []).filter((s) => s.entrant);
  if (slots.length !== 2 || raw.winnerId == null) return null;
  const scores = slots.map((s) => s.standing?.stats?.score?.value ?? null);
  if (scores.some((v) => v != null && v < 0)) return null; // a DQ isn't a set played
  const [e1, e2] = slots.map((s) => s.entrant!);
  const winner = String(raw.winnerId) === String(e1.id) ? 1 : String(raw.winnerId) === String(e2.id) ? 2 : null;
  if (!winner) return null;
  const solo = (e: NonNullable<RawSlot["entrant"]>) => (e.participants?.length === 1 ? e.participants[0] : null);
  const chars = (entrantId: string | number) =>
    (raw.games ?? []).flatMap((g) => (g.selections ?? []).filter((s) => String(s.entrant?.id) === String(entrantId) && s.character?.name).map((s) => s.character!.name!));
  const phase = raw.phaseGroup?.phase ? at.phases.get(String(raw.phaseGroup.phase.id)) : undefined;
  const round = raw.round ?? 0;
  const idOf = (e: NonNullable<RawSlot["entrant"]>) => {
    const id = solo(e)?.player?.id;
    return id != null && /^\d{1,12}$/.test(String(id)) ? String(id) : null;
  };
  return {
    set_id: String(raw.id),
    major_slug: at.majorSlug,
    event_id: at.eventId,
    game: at.game,
    phase: phase?.name ?? null,
    round: raw.fullRoundText,
    // Phase first, then the round: winners and losers side of the same round next to each other.
    sort_order: (phase?.phaseOrder ?? 0) * 1000 + Math.abs(round) * 2 + (round < 0 ? 1 : 0),
    completed_at: raw.completedAt ? new Date(raw.completedAt * 1000).toISOString() : null,
    p1_id: idOf(e1),
    p1_name: e1.name ?? solo(e1)?.gamerTag ?? "?",
    p1_score: scores[0],
    p1_chars: chars(e1.id),
    p2_id: idOf(e2),
    p2_name: e2.name ?? solo(e2)?.gamerTag ?? "?",
    p2_score: scores[1],
    p2_chars: chars(e2.id),
    winner,
  };
}

/** Characters by how many games they were played in, most first (ties: first played first). */
export function mostPlayed(games: string[]): string[] {
  const count = new Map<string, number>();
  for (const c of games) count.set(c, (count.get(c) ?? 0) + 1);
  return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
}

// start.gg names that Smashy's character list spells differently.
const CHARACTER_ALIASES: Record<string, string> = {
  rosalina: "rosalina-and-luma",
  "banjo-kazooie": "banjo-and-kazooie",
  "pyra-mythra": "pyra-and-mythra",
  pyra: "pyra-and-mythra",
  mythra: "pyra-and-mythra",
  "game-and-watch": "mr-game-and-watch",
  "duck-hunt-duo": "duck-hunt",
};
/** A start.gg character name → Smashy's character key (for stock icons). */
export const startggCharacterKey = (name: string) => {
  const key = characterKey(name);
  return CHARACTER_ALIASES[key] ?? key;
};

// startggTournament: a hand-added major's start.gg tournament (round 526, saved in round 533);
// startggEventId: its bracket, when full standings (step H3) already found it there.
type Candidate = { majorSlug: string; eventId: string; game: GameKey; entrants: number; top8: Top8Row[]; startggTournament?: string | null; startggEventId?: string | null };

/** Each major's main singles bracket per game: its biggest in-person singles event. Biggest first. */
export function mainBrackets(rows: Candidate[]): Candidate[] {
  const best = new Map<string, Candidate>();
  for (const r of rows) {
    const key = `${r.majorSlug}|${r.game}`;
    const had = best.get(key);
    if (!had || r.entrants > had.entrants) best.set(key, r);
  }
  return [...best.values()].sort((a, b) => b.entrants - a.entrants);
}

// ---------- filling ----------

type Budget = { requests: number; until: number };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
class OutOfRoom extends Error {}

/** One start.gg request within the budget: paced, and only while start.gg has room. */
async function ask<T>(budget: Budget, query: string, variables: Record<string, unknown>): Promise<T> {
  if (budget.requests <= 0 || Date.now() > budget.until || startggLoad() > BUSY_LOAD) throw new OutOfRoom();
  budget.requests--;
  await sleep(PAUSE_MS);
  return startggQuery<T>(query, variables);
}

const PHASES = "phases { id name phaseOrder numSeeds }";

/** A hand-added major's bracket on start.gg: the singles event in its game sharing the most top 8 players. */
async function findManualEvent(budget: Budget, c: Candidate): Promise<{ id: string; phases: RawPhase[] } | null> {
  const slug = c.startggTournament;
  if (!slug) return null;
  type Ev = { id: string | number; videogame: { id: number | string } | null; teamRosterSize: { maxPlayers: number | null } | null; phases: RawPhase[] | null; standings: { nodes: { entrant: { participants: { player: { id: number | string } | null }[] | null } | null }[] | null } | null };
  const data = await ask<{ tournament: { events: Ev[] | null } | null }>(
    budget,
    `query T($slug: String!) { tournament(slug: $slug) { events { id name videogame { id } teamRosterSize { maxPlayers } ${PHASES}
      standings(query: { perPage: 8, page: 1 }) { nodes { entrant { participants { player { id } } } } } } } }`,
    { slug },
  );
  const ours = new Set(c.top8.map((r) => r.playerId).filter(Boolean));
  let best: { id: string; phases: RawPhase[]; shared: number } | null = null;
  for (const e of data.tournament?.events ?? []) {
    if (gameOfEvent(e) !== c.game || (e.teamRosterSize?.maxPlayers ?? 1) > 1) continue;
    const shared = (e.standings?.nodes ?? []).filter((n) => n.entrant?.participants?.length === 1 && ours.has(String(n.entrant.participants[0].player?.id))).length;
    if (shared >= 2 && (!best || shared > best.shared)) best = { id: String(e.id), phases: e.phases ?? [], shared };
  }
  return best;
}

const SET_FIELDS = `id fullRoundText round winnerId completedAt phaseGroup { phase { id } }
  slots { entrant { id name participants { gamerTag player { id } } } standing { stats { score { value } } } }
  games { selections { entrant { id } character { name } } }`;

/** Every set of these phases, in pages (halving the page size when start.gg says it's too much). */
async function fetchSets(budget: Budget, eventId: string, phaseIds: string[]): Promise<RawMajorSet[]> {
  const out: RawMajorSet[] = [];
  let size = FIRST_PAGE_SIZE;
  for (let page = 1, total = 1; page <= Math.min(total, MAX_PAGES); ) {
    try {
      const data = await ask<{ event: { sets: { pageInfo: { totalPages: number | null }; nodes: RawMajorSet[] | null } | null } | null }>(
        budget,
        `query S($id: ID!, $page: Int!, $per: Int!, $phases: [ID]) { event(id: $id) {
          sets(page: $page, perPage: $per, sortType: STANDARD, filters: { phaseIds: $phases, hideEmpty: true }) { pageInfo { totalPages } nodes { ${SET_FIELDS} } } } }`,
        { id: eventId, page, per: size, phases: phaseIds },
      );
      out.push(...(data.event?.sets?.nodes ?? []));
      total = data.event?.sets?.pageInfo.totalPages ?? 1;
      page++;
    } catch (e) {
      if (!isTooComplex(e) || size <= 8) throw e;
      // Same sets, smaller pages: what's fetched so far is a whole number of the new pages.
      page = (page - 1) * 2 + 1;
      size /= 2;
    }
  }
  return out;
}

/** Saves one bracket's sets. Returns how many, or throws (the claim then runs out and it's tried again). */
async function saveBracket(budget: Budget, c: Candidate): Promise<number> {
  const db = createAdminClient();
  const done = (fields: { sets: number; startgg_event_id?: string | null; note?: string | null; characters?: Record<string, string[]> }) =>
    db.from("major_set_progress").update({ ...fields, done_at: new Date().toISOString() }).eq("major_slug", c.majorSlug).eq("event_id", c.eventId);

  let found: { id: string; phases: RawPhase[] } | null;
  if (isManualEvent(c.majorSlug, c.eventId) && !c.startggEventId) {
    found = await findManualEvent(budget, c);
  } else {
    const id = isManualEvent(c.majorSlug, c.eventId) ? c.startggEventId : c.eventId;
    const data = await ask<{ event: { id: string | number; phases: RawPhase[] | null } | null }>(budget, `query P($id: ID!) { event(id: $id) { id ${PHASES} } }`, { id });
    found = data.event ? { id: String(data.event.id), phases: data.event.phases ?? [] } : null;
  }
  if (!found || !found.phases.length) {
    await done({ sets: 0, note: found ? "no phases on start.gg" : "not found on start.gg" });
    return 0;
  }
  const phases = finalPhases(found.phases);
  const raw = await fetchSets(budget, found.id, phases.map((p) => String(p.id)));
  const byId = new Map(found.phases.map((p) => [String(p.id), p]));
  const rows = raw.flatMap((s) => toSavedSet(s, { majorSlug: c.majorSlug, eventId: c.eventId, game: c.game, phases: byId }) ?? []);
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await db.from("major_sets").upsert(rows.slice(i, i + 200), { onConflict: "set_id" });
    if (error) throw error;
  }
  await done({ sets: rows.length, startgg_event_id: found.id, note: phases.map((p) => p.name).join(", ") || null, characters: bracketCharacters(rows) });
  return rows.length;
}

/**
 * Saves the sets of brackets that don't have them yet, biggest first, until the budget runs out or
 * start.gg is busy. `slugs` limits it to these majors (a year someone opened). Call in the background.
 */
export async function fillMajorSets(opts: { slugs?: string[]; maxRequests?: number; until?: number } = {}): Promise<{ brackets: number; sets: number }> {
  const budget: Budget = { requests: opts.maxRequests ?? 200, until: opts.until ?? Date.now() + 120_000 };
  const db = createAdminClient();
  let query = db
    .from("major_events")
    .select("major_slug, event_id, game, entrants, top8, startgg_tournament, major:majors!inner ( end_at, hidden )")
    .eq("teams", false)
    .eq("online", false)
    .eq("major.hidden", false)
    .lt("major.end_at", new Date(Date.now() - SETTLED_DAYS * 86400_000).toISOString())
    .limit(5000);
  if (opts.slugs) {
    if (!opts.slugs.length) return { brackets: 0, sets: 0 };
    query = query.in("major_slug", opts.slugs);
  }
  const [{ data, error }, { data: progress, error: progressError }, { data: standings }] = await Promise.all([
    query,
    (opts.slugs ? db.from("major_set_progress").select("major_slug, event_id, done_at, claimed_at").in("major_slug", opts.slugs) : db.from("major_set_progress").select("major_slug, event_id, done_at, claimed_at").limit(10000)),
    // Hand-added brackets that full standings already found on start.gg (saves looking them up again).
    db.from("major_standings").select("major_slug, event_id, startgg_event_id").like("major_slug", "manual/%").limit(5000),
  ]);
  if (error) throw error;
  if (progressError) throw progressError;
  const startggIds = new Map((standings ?? []).map((r) => [`${r.major_slug}|${r.event_id}`, r.startgg_event_id as string]));
  const busy = new Set(
    (progress ?? [])
      .filter((p) => p.done_at || (p.claimed_at && Date.parse(p.claimed_at) > Date.now() - 15 * 60_000))
      .map((p) => `${p.major_slug}|${p.event_id}`),
  );
  type Row = { major_slug: string; event_id: string; game: GameKey; entrants: number | null; top8: Top8Row[]; startgg_tournament: string | null };
  const all = ((data ?? []) as unknown as Row[])
    .filter((r) => !isParryggMajor(r.major_slug) && (!isManualEvent(r.major_slug, r.event_id) || (r.startgg_tournament && r.top8.some((x) => x.playerId))))
    .map((r): Candidate => ({
      majorSlug: r.major_slug,
      eventId: r.event_id,
      game: r.game,
      entrants: r.entrants ?? 0,
      top8: r.top8,
      startggTournament: r.startgg_tournament,
      startggEventId: startggIds.get(`${r.major_slug}|${r.event_id}`) ?? null,
    }));
  const todo = mainBrackets(all).filter((c) => !busy.has(`${c.majorSlug}|${c.eventId}`));

  let brackets = 0;
  let sets = 0;
  for (const c of todo) {
    if (budget.requests < 3 || Date.now() > budget.until - 20_000 || startggLoad() > BUSY_LOAD) break;
    const { data: mine, error: claimError } = await db.rpc("claim_major_set_event", { slug: c.majorSlug, event: c.eventId });
    if (claimError) {
      console.error("Couldn't claim a bracket to save sets for:", claimError.message);
      break;
    }
    if (!mine) continue;
    try {
      sets += await saveBracket(budget, c);
      brackets++;
    } catch (e) {
      if (e instanceof OutOfRoom) break; // the claim runs out and it's tried again next time
      const message = e instanceof Error ? e.message : String(e);
      console.error(`Couldn't save sets for ${c.majorSlug} ${c.eventId}:`, message);
      if (/rate limited|busy/i.test(message)) break;
    }
  }
  return { brackets, sets };
}

// ---------- reading ----------

export type MajorSetRow = SavedSet & { major: { name: string; start_at: string } };

/** Who a side of a set is: their start.gg player id, or the player an admin linked their tag to (in this game). */
export function sideId(id: string | null, name: string, links: Map<string, string>, game?: string): string | null {
  return id ?? linkedId(links, game, nameKey(tagOnly(name))) ?? null;
}

export type MajorMeeting = {
  setId: string;
  majorSlug: string;
  majorName: string;
  startAt: string;
  game: GameKey;
  phase: string | null;
  round: string | null;
  aWon: boolean;
  aScore: number | null;
  bScore: number | null;
  aChars: string[];
  bChars: string[];
};

/** A set between a and b, from a's side (null when it isn't one). */
export function asMeeting(r: MajorSetRow, a: string, b: string, links: Map<string, string>): MajorMeeting | null {
  const s1 = sideId(r.p1_id, r.p1_name, links, r.game);
  const s2 = sideId(r.p2_id, r.p2_name, links, r.game);
  const aFirst = s1 === a && s2 === b;
  if (!aFirst && !(s1 === b && s2 === a)) return null;
  return {
    setId: r.set_id,
    majorSlug: r.major_slug,
    majorName: r.major.name,
    startAt: r.major.start_at,
    game: r.game,
    phase: r.phase,
    round: r.round,
    aWon: r.winner === (aFirst ? 1 : 2),
    aScore: aFirst ? r.p1_score : r.p2_score,
    bScore: aFirst ? r.p2_score : r.p1_score,
    aChars: mostPlayed(aFirst ? r.p1_chars : r.p2_chars),
    bChars: mostPlayed(aFirst ? r.p2_chars : r.p1_chars),
  };
}

const SET_COLUMNS = "set_id, major_slug, event_id, game, phase, round, sort_order, completed_at, p1_id, p1_name, p1_score, p1_chars, p2_id, p2_name, p2_score, p2_chars, winner";

/** Every saved set two players played at majors (hidden majors left out), newest first. */
export async function getMajorHeadToHead(a: string, b: string): Promise<MajorMeeting[]> {
  if (!/^\d{1,12}$/.test(a) || !/^\d{1,12}$/.test(b)) return [];
  const supabase = await createClient();
  const { data: linkRows } = await supabase.from("player_name_links").select("name_key, player_id, game").in("player_id", [a, b]);
  const links = new Map((linkRows ?? []).map((l) => [linkKey(l.name_key as string, (l.game as string) || null), l.player_id as string]));
  // Sets between the two ids, plus (for tags an admin linked) sets where one side has no id: matched by name below.
  const filters = [`and(p1_id.eq.${a},p2_id.eq.${b})`, `and(p1_id.eq.${b},p2_id.eq.${a})`];
  if (links.size) filters.push(`and(p1_id.is.null,p2_id.in.(${a},${b}))`, `and(p2_id.is.null,p1_id.in.(${a},${b}))`);
  // (major_sets links to majors through major_events, so the majors are read on their own.)
  const { data, error } = await supabase.from("major_sets").select(SET_COLUMNS).or(filters.join(",")).limit(1000);
  if (error) throw error;
  const rows = (data ?? []) as unknown as SavedSet[];
  const slugs = [...new Set(rows.map((r) => r.major_slug))];
  const { data: majors, error: majorsError } = slugs.length
    ? await supabase.from("majors").select("slug, name, start_at").in("slug", slugs).eq("hidden", false)
    : { data: [], error: null };
  if (majorsError) throw majorsError;
  const bySlug = new Map((majors ?? []).map((m) => [m.slug as string, { name: m.name as string, start_at: m.start_at as string }]));
  return rows
    .flatMap((r) => {
      const major = bySlug.get(r.major_slug); // hidden majors are left out
      return major ? (asMeeting({ ...r, major }, a, b, links) ?? []) : [];
    })
    .sort((x, y) => y.startAt.localeCompare(x.startAt) || x.setId.localeCompare(y.setId));
}

/**
 * The characters each player used at these majors, from the saved sets, most played first:
 * `${majorSlug}|${eventId}` → player (start.gg id, or "name:<key>" without one) → characters.
 */
export type MajorCharacters = Map<string, Map<string, string[]>>;

/** Each player's characters in one bracket's sets, most played first (saved with the bracket). */
export function bracketCharacters(rows: Pick<SavedSet, "p1_id" | "p1_name" | "p1_chars" | "p2_id" | "p2_name" | "p2_chars">[]): Record<string, string[]> {
  const games = new Map<string, string[]>();
  for (const r of rows) {
    for (const [id, name, chars] of [[r.p1_id, r.p1_name, r.p1_chars], [r.p2_id, r.p2_name, r.p2_chars]] as const) {
      if (!chars.length) continue;
      for (const who of [id, `name:${nameKey(tagOnly(name))}`]) if (who) games.set(who, [...(games.get(who) ?? []), ...chars]);
    }
  }
  return Object.fromEntries([...games].map(([who, list]) => [who, mostPlayed(list)]));
}

export async function getMajorCharacters(slugs: string[]): Promise<MajorCharacters> {
  const out: MajorCharacters = new Map();
  if (!slugs.length) return out;
  // The guest connection: these summaries are public, and kept answers ("use cache": a name's history page)
  // call this, where the sign-in-aware one isn't allowed. There it failed quietly on every load, so a name's
  // start.gg placings showed no characters and the answer was kept for seconds, not minutes (round 770).
  const { data, error } = await createGuestClient()
    .from("major_set_progress")
    .select("major_slug, event_id, characters")
    .in("major_slug", slugs)
    .not("done_at", "is", null);
  if (error) throw error;
  for (const r of data ?? []) out.set(`${r.major_slug}|${r.event_id}`, new Map(Object.entries((r.characters ?? {}) as Record<string, string[]>)));
  return out;
}

/** The player a placing is: its start.gg id, or the player an admin linked its tag to (in the placing's game). */
export const placingId = (row: Top8Row, links?: Map<string, string>, game?: string) =>
  row.playerId ?? (links ? linkedId(links, game, nameKey(tagOnly(row.name))) : undefined) ?? null;

/**
 * The characters one placing used: by its player (id or linked), else its tag; for results added by hand, the
 * ones their source lists. Nothing for players who asked not to be listed (`hidden`; null when that couldn't
 * be checked, which shows nothing).
 */
export function charactersFor(chars: MajorCharacters, majorSlug: string, eventId: string, row: Top8Row, links?: Map<string, string>, hidden?: Set<string> | null, game?: string): string[] {
  if (hidden === null) return [];
  const id = placingId(row, links, game);
  if (id && hidden?.has(id)) return [];
  const m = chars.get(`${majorSlug}|${eventId}`);
  // From start.gg's sets when they were saved; else what a hand-added result's source lists.
  return (m && ((id && m.get(id)) || m.get(`name:${nameKey(tagOnly(row.name))}`))) || row.characters || [];
}

/** The bracket Smash history names a game's winner from: its main in-person singles event (pickMainEvent). */
const winningEvent = (events: MajorEvent[], game: GameKey) =>
  pickMainEvent(events.filter((e) => e.game === game && !e.teams && !e.online && e.top8[0]?.place === 1));

/** The characters a major's winner in one game used. */
export function winnerCharacters(events: MajorEvent[], game: GameKey, chars: MajorCharacters, links?: Map<string, string>, hidden?: Set<string> | null): string[] {
  const best = winningEvent(events, game);
  return best ? charactersFor(chars, best.majorSlug, best.eventId, best.top8[0], links, hidden, game) : [];
}

/** Every winner's player id in these majors' events (to check who asked not to be listed). */
export function winnerIds(events: MajorEvent[], links?: Map<string, string>): string[] {
  return events.flatMap((e) => (e.top8[0]?.place === 1 ? [placingId(e.top8[0], links, e.game)] : [])).filter((x): x is string => !!x);
}

/** A finals set as the Arcade's "Who won this set?" uses it. */
export type FinalsSet = Pick<SavedSet, "set_id" | "major_slug" | "game" | "round" | "p1_id" | "p1_name" | "p1_score" | "p1_chars" | "p2_id" | "p2_name" | "p2_score" | "p2_chars" | "winner">;
const FINALS_ROUND = /^(grand finals?( reset| \(reset\))?|winners finals?|losers finals?)$/i;

/**
 * Every saved winners, losers and grand final with a real score (no walkovers). Shared by every server and
 * refreshed every few hours. Read as a guest: saved sets are public, and a kept answer may not use a sign-in.
 */
export async function finalsSets(): Promise<FinalsSet[]> {
  "use cache: remote";
  cacheLife("hours");
  const { data, error } = await createGuestClient()
    .from("major_sets")
    .select("set_id, major_slug, game, round, p1_id, p1_name, p1_score, p1_chars, p2_id, p2_name, p2_score, p2_chars, winner")
    .ilike("round", "%final%")
    .not("round", "ilike", "%quarter%")
    .not("round", "ilike", "%semi%")
    .gte("p1_score", 0)
    .gte("p2_score", 0)
    .limit(5000);
  if (error) throw error;
  return ((data ?? []) as unknown as FinalsSet[]).filter((s) => {
    const [won, lost] = s.winner === 1 ? [s.p1_score, s.p2_score] : [s.p2_score, s.p1_score];
    const real = (name: string) => !name.includes(" / ") && !/^deleted user$/i.test(tagOnly(name));
    return FINALS_ROUND.test(s.round ?? "") && real(s.p1_name) && real(s.p2_name) && won !== null && lost !== null && won > lost;
  });
}
