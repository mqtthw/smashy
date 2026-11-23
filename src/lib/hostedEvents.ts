// Events hosted on Smashy (phase 1: sign-ups, check-in, seeding). Read as the viewer, so privacy rules
// apply (removed events show only to their host; teens' profiles stay hidden from guests).
import type { MessageKey, Values } from "./i18n/core";
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { avatarUrl } from "./avatarLinks";
import { OFFICIAL_HOST } from "./officialHost";
import type { GameKey } from "./games";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";
import { MAX_EXTRA_BRACKETS } from "./eventBrackets";
import { getTeamMembers, type TeamMember } from "./hostedTeams";
import { headToHead, hostedRecord, medalTable, type HostedRecord, type MedalRow, type RecordSet } from "./hostedRecord";

/** "social" (round 757): a get-together with sign-ups and no bracket (a game night, Jackbox). */
export type HostedFormat = "double_elim" | "single_elim" | "round_robin" | "swiss" | "social";
/** The formats that have a bracket. */
export type BracketFormat = Exclude<HostedFormat, "social">;
export type HostedStatus = "open" | "closed" | "in_progress" | "completed" | "canceled";

export type HostedEvent = {
  id: string;
  hostId: string;
  host: { tag: string; handle: string; avatarUrl: string | null } | null;
  /** An official Smashy event (round 457): `host` shows Smashy, and this is the admin who runs it. */
  official: boolean;
  runBy: { tag: string; handle: string } | null;
  name: string;
  game: GameKey;
  online: boolean;
  location: string | null;
  region: string | null;
  startsAt: string;
  timezone: string;
  format: HostedFormat;
  rulesetId: string | null;
  ruleset: { id: string; name: string; sceneName: string | null } | null;
  bestOf: number;
  bestOfTop: number | null;
  swissRounds: number | null; // Swiss only: rounds to play (empty = the usual number for the field)
  /** After round robin pools or Swiss: a final bracket in this format for the top `finalSize` players (null = no final bracket). */
  finalFormat: "single_elim" | "double_elim" | null;
  finalSize: number | null;
  entrantCap: number;
  checkinMinutes: number;
  description: string | null;
  status: HostedStatus;
  removed: boolean;
  createdAt: string;
  entrantCount: number;
  challongeUrl: string | null; // copied to Challonge for ranking sites (Braacket)
  seriesId: string | null; // the first edition of a weekly series (null = this is the first, or not a series)
  /** How many setups the venue has: called sets are given the next free one by themselves (null = the TO assigns by hand). */
  setups: number | null;
  /** Minutes players have to turn up once their set has a place to play, before the TO is offered a no-show DQ (null = no clock). */
  noShowMinutes: number | null;
  /** 1 = singles; 2 = doubles (the entries are teams of two: see lib/hostedTeams). Fixed once the event exists. */
  teamSize: 1 | 2;
  /** An extra bracket of another event (a Redemption bracket, a second game): the main event's id. Null = an ordinary event, or the main one. */
  parentId: string | null;
  /** An extra bracket's own short name ("Redemption"); its `name` is "<main event>: <this>". */
  bracketName: string | null;
};

export type HostedEntrant = {
  userId: string;
  tag: string;
  handle: string;
  avatarUrl: string | null;
  seed: number | null;
  checkedIn: boolean;
  joinedAt: string;
  placement: number | null; // once the event is over
  guest?: boolean; // a walk-in the host added (no Smashy account): userId is the guest's id
  /** Doubles: this entry is a team (userId is the team's id, tag is "A / B") and these are its two members. */
  members?: TeamMember[];
};

export const FORMAT_LABEL: Record<HostedFormat, string> = {
  double_elim: "Double elimination",
  single_elim: "Single elimination",
  round_robin: "Round robin",
  swiss: "Swiss",
  social: "No bracket (social event)",
};

/**
 * An event's format in words: "Double elimination", or "Round robin, then top 8 double elimination".
 * Pass a translate function for the visitor's language (English when left out).
 */
export function formatSummary(e: Pick<HostedEvent, "format" | "finalFormat" | "finalSize">, t?: (key: MessageKey, values?: Values) => string): string {
  const label = (f: HostedFormat) => (t ? t(`format.${f}`) : FORMAT_LABEL[f]);
  if (!e.finalFormat) return label(e.format);
  const values = { first: label(e.format), n: e.finalSize ?? 8, second: label(e.finalFormat).toLowerCase() };
  return t ? t("format.then", values) : `${values.first}, then top ${values.n} ${values.second}`;
}

const FIELDS = `id, host_id, name, game, online, location, region, starts_at, timezone, format, ruleset_id, best_of, best_of_top, swiss_rounds, final_format, final_size,
  entrant_cap, checkin_minutes, description, status, removed_at, created_at, series_id, challonge_url, parent_id, bracket_name, team_size, setups, no_show_minutes, official,
  host:profiles!hosted_events_host_id_fkey ( tag, handle, avatar_path ),
  ruleset:rulesets ( id, name, scene:scenes ( name ) ),
  entrants:hosted_entrants ( count )`;

type Row = {
  id: string; host_id: string; name: string; game: GameKey; online: boolean; location: string | null; region: string | null;
  starts_at: string; timezone: string; format: HostedFormat; ruleset_id: string | null; best_of: number; best_of_top: number | null; swiss_rounds?: number | null; final_format?: "single_elim" | "double_elim" | null; final_size?: number | null;
  entrant_cap: number; checkin_minutes: number; description: string | null; status: HostedStatus; removed_at: string | null; created_at: string; series_id: string | null; challonge_url?: string | null; parent_id?: string | null; bracket_name?: string | null; team_size?: number; setups?: number | null; no_show_minutes?: number | null; official?: boolean;
  host: { tag: string; handle: string; avatar_path: string | null } | null;
  ruleset: { id: string; name: string; scene: { name: string } | null } | null;
  entrants: { count: number }[];
};

function toEvent(r: Row): HostedEvent {
  return {
    id: r.id,
    hostId: r.host_id,
    host: r.official ? OFFICIAL_HOST : r.host ? { tag: r.host.tag, handle: r.host.handle, avatarUrl: avatarUrl(r.host.avatar_path) } : null,
    official: !!r.official,
    runBy: r.official && r.host ? { tag: r.host.tag, handle: r.host.handle } : null,
    name: r.name,
    game: r.game,
    online: r.online,
    location: r.location,
    region: r.region,
    startsAt: r.starts_at,
    timezone: r.timezone,
    format: r.format,
    rulesetId: r.ruleset_id,
    ruleset: r.ruleset ? { id: r.ruleset.id, name: r.ruleset.name, sceneName: r.ruleset.scene?.name ?? null } : null,
    bestOf: r.best_of,
    bestOfTop: r.best_of_top,
    swissRounds: r.swiss_rounds ?? null,
    // A final bracket only follows pools or Swiss (the setting is ignored on an elimination event).
    finalFormat: r.format === "round_robin" || r.format === "swiss" ? (r.final_format ?? null) : null,
    finalSize: r.final_size ?? null,
    entrantCap: r.entrant_cap,
    checkinMinutes: r.checkin_minutes,
    description: r.description,
    status: r.status,
    removed: !!r.removed_at,
    createdAt: r.created_at,
    entrantCount: r.entrants?.[0]?.count ?? 0,
    seriesId: r.series_id,
    challongeUrl: r.challonge_url ?? null,
    parentId: r.parent_id ?? null,
    bracketName: r.parent_id ? (r.bracket_name ?? null) : null,
    teamSize: r.team_size === 2 ? 2 : 1,
    setups: r.setups ?? null,
    noShowMinutes: r.no_show_minutes ?? null,
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `db`: read with this client instead of the viewer's (link previews pass the guest client). */
export async function getHostedEvent(id: string, db?: SupabaseClient): Promise<HostedEvent | null> {
  if (!UUID.test(id)) return null;
  const supabase = db ?? (await createClient());
  const { data } = await supabase.from("hosted_events").select(FIELDS).eq("id", id).maybeSingle();
  return data ? toEvent(data as unknown as Row) : null;
}

export type Cohost = { userId: string; tag: string; handle: string; avatarUrl: string | null };

/** Co-TOs: people the host added to help run the event (everything but editing, canceling and co-TOs). */
export async function getCohosts(eventId: string): Promise<Cohost[]> {
  if (!UUID.test(eventId)) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("hosted_cohosts")
    .select("user_id, profile:profiles!hosted_cohosts_user_id_fkey ( tag, handle, avatar_path )")
    .eq("event_id", eventId)
    .order("created_at");
  return ((data ?? []) as unknown as { user_id: string; profile: { tag: string; handle: string; avatar_path: string | null } | null }[])
    .filter((r) => r.profile)
    .map((r) => ({ userId: r.user_id, tag: r.profile!.tag, handle: r.profile!.handle, avatarUrl: avatarUrl(r.profile!.avatar_path) }));
}

/** True for the host or a co-TO of this event. Co-TOs of a main event run its extra brackets too. */
export async function runsEvent(event: Pick<HostedEvent, "id" | "hostId"> & { parentId?: string | null }, userId: string | null): Promise<boolean> {
  if (!userId) return false;
  if (event.hostId === userId) return true;
  const supabase = await createClient();
  const { data } = await supabase.from("hosted_cohosts").select("user_id").in("event_id", runBy(event)).eq("user_id", userId).limit(1);
  return !!data?.length;
}

/** The events whose co-TOs run this one: itself and, for an extra bracket, its main event. */
export function runBy(event: { id: string; parentId?: string | null }): string[] {
  return event.parentId ? [event.id, event.parentId] : [event.id];
}

export type EventBracket = {
  id: string;
  /** "Main bracket", or the extra bracket's own name. */
  label: string;
  main: boolean;
  game: GameKey;
  format: HostedFormat;
  finalFormat: HostedEvent["finalFormat"];
  finalSize: number | null;
  status: HostedStatus;
  startsAt: string;
  players: number; // entries signed up (walk-ins included; teams in a doubles bracket)
  cap: number;
  teamSize: 1 | 2;
};

/**
 * Every bracket of the event this one belongs to: the main one first, then the extra brackets in
 * the order they start. An event with no extra brackets comes back as just itself.
 */
export async function getEventBrackets(event: Pick<HostedEvent, "id" | "parentId">): Promise<EventBracket[]> {
  const root = event.parentId ?? event.id;
  if (!UUID.test(root)) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("hosted_events")
    .select("id, parent_id, bracket_name, game, format, final_format, final_size, status, starts_at, created_at, entrant_cap, team_size, entrants:hosted_entrants ( count ), guests:hosted_guests ( count )")
    .or(`id.eq.${root},parent_id.eq.${root}`)
    .is("removed_at", null)
    .order("starts_at")
    .order("created_at")
    .limit(MAX_EXTRA_BRACKETS + 1);
  type B = { id: string; parent_id: string | null; bracket_name: string | null; game: GameKey; format: HostedFormat; final_format: HostedEvent["finalFormat"]; final_size: number | null; status: HostedStatus; starts_at: string; entrant_cap: number; team_size: number; entrants: { count: number }[]; guests: { count: number }[] };
  const rows = (data ?? []) as unknown as B[];
  return rows
    .map((r) => ({
      id: r.id,
      label: r.parent_id ? (r.bracket_name ?? "Bracket") : "Main bracket",
      main: !r.parent_id,
      game: r.game,
      format: r.format,
      finalFormat: r.format === "round_robin" || r.format === "swiss" ? r.final_format : null,
      finalSize: r.final_size,
      status: r.status,
      startsAt: r.starts_at,
      players: (r.entrants?.[0]?.count ?? 0) + (r.guests?.[0]?.count ?? 0),
      cap: r.entrant_cap,
      teamSize: (r.team_size === 2 ? 2 : 1) as 1 | 2,
    }))
    .sort((a, b) => Number(b.main) - Number(a.main)); // stable: the main one first, the rest stay in start order
}

/** Which of these events the viewer is signed up for. */
export async function getMyEntries(userId: string | null, eventIds: string[]): Promise<Set<string>> {
  const ids = eventIds.filter((id) => UUID.test(id));
  if (!userId || !ids.length) return new Set();
  const supabase = await createClient();
  const [{ data }, { data: teams }] = await Promise.all([
    supabase.from("hosted_entrants").select("event_id").eq("user_id", userId).in("event_id", ids),
    supabase.from("hosted_team_members").select("event_id").eq("user_id", userId).in("event_id", ids), // doubles: on a team
  ]);
  return new Set(([...(data ?? []), ...(teams ?? [])] as { event_id: string }[]).map((r) => r.event_id));
}

/** Everyone signed up, in seed order (unseeded people after, in sign-up order). */
/**
 * Who won each of these finished events (1st place), by event id, for listings like search. One read
 * for players and one for walk-ins; players hidden from the viewer by privacy rules are left out.
 */
export async function getEventWinners(eventIds: string[]): Promise<Record<string, string>> {
  if (!eventIds.length) return {};
  const supabase = await createClient();
  const [{ data }, { data: guests }] = await Promise.all([
    supabase
      .from("hosted_entrants")
      .select("event_id, profile:profiles!hosted_entrants_user_id_fkey ( tag )")
      .in("event_id", eventIds.slice(0, 100))
      .eq("placement", 1),
    supabase.from("hosted_guests").select("event_id, tag").in("event_id", eventIds.slice(0, 100)).eq("placement", 1),
  ]);
  const out: Record<string, string> = {};
  for (const r of (data ?? []) as unknown as { event_id: string; profile: { tag: string } | null }[]) if (r.profile) out[r.event_id] = r.profile.tag;
  for (const g of (guests ?? []) as { event_id: string; tag: string }[]) out[g.event_id] ??= g.tag;
  return out;
}

export async function getHostedEntrants(eventId: string, { teams = false }: { teams?: boolean } = {}): Promise<HostedEntrant[]> {
  const supabase = await createClient();
  const [{ data }, { data: guests }, members] = await Promise.all([
    supabase
      .from("hosted_entrants")
      .select("user_id, seed, checked_in_at, created_at, placement, profile:profiles!hosted_entrants_user_id_fkey ( tag, handle, avatar_path )")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true })
      .limit(600),
    supabase.from("hosted_guests").select("id, tag, seed, checked_in_at, created_at, placement").eq("event_id", eventId).limit(600),
    // Doubles (`teams`): who is on each team.
    teams ? getTeamMembers(eventId).catch(() => new Map<string, TeamMember[]>()) : Promise.resolve(new Map<string, TeamMember[]>()),
  ]);
  const people: HostedEntrant[] = ((data ?? []) as unknown as { user_id: string; seed: number | null; checked_in_at: string | null; created_at: string; placement: number | null; profile: { tag: string; handle: string; avatar_path: string | null } | null }[])
    .filter((r) => r.profile) // hidden by privacy rules (e.g. a teen, for a guest)
    .map((r) => ({
      userId: r.user_id,
      tag: r.profile!.tag,
      handle: r.profile!.handle,
      avatarUrl: avatarUrl(r.profile!.avatar_path),
      seed: r.seed,
      checkedIn: !!r.checked_in_at,
      joinedAt: r.created_at,
      placement: r.placement,
    }));
  // Walk-ins the host added at the venue.
  const walkIns: HostedEntrant[] = ((guests ?? []) as { id: string; tag: string; seed: number | null; checked_in_at: string | null; created_at: string; placement: number | null }[]).map((g) => ({
    userId: g.id,
    tag: g.tag,
    handle: "",
    avatarUrl: null,
    seed: g.seed,
    checkedIn: !!g.checked_in_at,
    joinedAt: g.created_at,
    placement: g.placement,
    guest: true,
    ...(members.has(g.id) ? { members: members.get(g.id) } : {}),
  }));
  return [...people, ...walkIns].sort((a, b) => (a.seed ?? 1e9) - (b.seed ?? 1e9) || a.joinedAt.localeCompare(b.joinedAt));
}

/** Upcoming events hosted on Smashy (soonest first), optionally for one game. Leaves out hosts blocked either way. */
export async function getUpcomingHostedEvents(opts: { game?: GameKey; limit?: number; viewerId?: string | null } = {}): Promise<HostedEvent[]> {
  const supabase = await createClient();
  let q = supabase
    .from("hosted_events")
    .select(FIELDS)
    .is("removed_at", null)
    .is("parent_id", null) // extra brackets show on their main event's page, not as events of their own
    .in("status", ["open", "closed", "in_progress"])
    .gt("starts_at", new Date(Date.now() - 6 * 3600_000).toISOString())
    .order("starts_at", { ascending: true })
    .limit(opts.limit ?? 30);
  if (opts.game) q = q.eq("game", opts.game);
  const { data } = await q;
  const events = ((data ?? []) as unknown as Row[]).map(toEvent);
  if (!opts.viewerId) return events;
  const { data: blocks } = await createAdminClient()
    .from("blocks")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${opts.viewerId},blocked_id.eq.${opts.viewerId}`)
    .limit(1000);
  const hidden = new Set((blocks ?? []).map((b) => (b.blocker_id === opts.viewerId ? b.blocked_id : b.blocker_id) as string));
  return events.filter((e) => !hidden.has(e.hostId));
}

export type MyHostedEvent = HostedEvent & { role: "host" | "cohost" | "player"; checkedIn: boolean; checkInOpen: boolean; placement: number | null };

/** Upcoming or live events this person hosts or signed up for (soonest first), for the "Your events" row. */
export async function getMyHostedEvents(userId: string | null): Promise<MyHostedEvent[]> {
  if (!userId) return [];
  const supabase = await createClient();
  const now = Date.now();
  const { data: mine } = await supabase.from("hosted_entrants").select("event_id, checked_in_at, placement").eq("user_id", userId).order("created_at", { ascending: false }).limit(100);
  // Doubles: the events you're on a team in (the team holds the check-in and the placement).
  const { data: myTeams } = await supabase.from("hosted_team_members").select("event_id, team:hosted_guests!inner ( checked_in_at, placement )").eq("user_id", userId).limit(100);
  const mineRows = [
    ...((mine ?? []) as { event_id: string; checked_in_at: string | null; placement: number | null }[]),
    ...((myTeams ?? []) as unknown as { event_id: string; team: { checked_in_at: string | null; placement: number | null } }[]).map((t) => ({ event_id: t.event_id, checked_in_at: t.team.checked_in_at, placement: t.team.placement })),
  ];
  const joined = new Map(mineRows.map((r) => [r.event_id, !!r.checked_in_at]));
  const placed = new Map(mineRows.map((r) => [r.event_id, r.placement]));
  // Finished in the last day stays in the row (with your result) so you can find it again.
  const shownStatuses = ["open", "closed", "in_progress", "completed"];
  const recent = new Date(now - 12 * 3600_000).toISOString();
  // Events you help run as a co-TO.
  const { data: co } = await supabase.from("hosted_cohosts").select("event_id").eq("user_id", userId).limit(50);
  const coIds = ((co ?? []) as { event_id: string }[]).map((r) => r.event_id);
  const [asPlayer, asHost, asCohost] = await Promise.all([
    joined.size
      ? supabase.from("hosted_events").select(FIELDS).in("id", [...joined.keys()]).is("removed_at", null).in("status", shownStatuses).gt("starts_at", recent)
      : Promise.resolve({ data: [] }),
    supabase.from("hosted_events").select(FIELDS).eq("host_id", userId).is("parent_id", null).is("removed_at", null).in("status", shownStatuses).gt("starts_at", recent).limit(20),
    coIds.length
      ? supabase.from("hosted_events").select(FIELDS).in("id", coIds).is("removed_at", null).in("status", shownStatuses).gt("starts_at", recent)
      : Promise.resolve({ data: [] }),
  ]);
  const byId = new Map<string, MyHostedEvent>();
  for (const [rows, role] of [[asHost.data, "host"], [asCohost.data, "cohost"], [asPlayer.data, "player"]] as const) {
    for (const e of ((rows ?? []) as unknown as Row[]).map(toEvent)) {
      if (byId.has(e.id)) continue;
      const opens = checkInOpensAt(e);
      byId.set(e.id, {
        ...e,
        role,
        checkedIn: joined.get(e.id) ?? false,
        checkInOpen: joined.has(e.id) && role !== "host" && (e.status === "open" || e.status === "closed") && opens !== null && now >= opens,
        placement: placed.get(e.id) ?? null,
      });
    }
  }
  // An extra bracket whose main event is already in the row is reached from that event's card.
  for (const e of [...byId.values()]) if (e.parentId && byId.has(e.parentId)) byId.delete(e.id);
  // Live and upcoming first (soonest first), then finished ones.
  const done = (e: MyHostedEvent) => (e.status === "completed" ? 1 : 0);
  return [...byId.values()].sort((a, b) => done(a) - done(b) || Date.parse(a.startsAt) - Date.parse(b.startsAt));
}

/** Upcoming or live hosted events whose name matches the search (soonest first). Leaves out hosts blocked either way. */
/**
 * Hosted events whose name matches: upcoming and live ones, soonest first. With `past`, also ones
 * that finished in the last 60 days (newest first, after the upcoming ones), for finding results.
 */
export async function searchHostedEvents(q: string, limit = 3, viewerId: string | null = null, { past = false }: { past?: boolean } = {}): Promise<HostedEvent[]> {
  const text = q.trim().slice(0, 80);
  if (text.length < 2) return [];
  const pattern = `%${text.replace(/[\\%_]/g, (c) => "\\" + c)}%`; // % and _ match literally
  const supabase = await createClient();
  const { data } = await supabase
    .from("hosted_events")
    .select(FIELDS)
    .ilike("name", pattern)
    .is("removed_at", null)
    .is("parent_id", null)
    .in("status", past ? ["open", "closed", "in_progress", "completed"] : ["open", "closed", "in_progress"])
    .gt("starts_at", new Date(Date.now() - (past ? 60 * 24 : 6) * 3600_000).toISOString())
    .order("starts_at", { ascending: true })
    .limit(limit * 3);
  let events = ((data ?? []) as unknown as Row[]).map(toEvent);
  if (past) {
    const done = events.filter((e) => e.status === "completed").sort((a, b) => b.startsAt.localeCompare(a.startsAt));
    events = [...events.filter((e) => e.status !== "completed"), ...done];
  }
  if (viewerId && events.length) {
    const { data: blocks } = await createAdminClient()
      .from("blocks")
      .select("blocker_id, blocked_id")
      .or(`blocker_id.eq.${viewerId},blocked_id.eq.${viewerId}`)
      .limit(1000);
    const hidden = new Set((blocks ?? []).map((b) => (b.blocker_id === viewerId ? b.blocked_id : b.blocker_id) as string));
    events = events.filter((e) => !hidden.has(e.hostId));
  }
  return events.slice(0, limit);
}

/** This person's record in brackets run on Smashy (finished sets in events that weren't removed). */
export async function getHostedRecord(userId: string): Promise<HostedRecord> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("hosted_sets")
    .select("event_id, p1_id, p2_id, p1_score, p2_score, winner, event:hosted_events!inner ( removed_at )")
    .or(`p1_id.eq.${userId},p2_id.eq.${userId}`)
    .not("winner", "is", null)
    .is("event.removed_at", null)
    .limit(2000);
  return hostedRecord(userId, (data ?? []) as unknown as RecordSet[]);
}

/** Finished sets on Smashy involving any of these players (events not removed). */
async function finishedSetsFor(userIds: string[]): Promise<RecordSet[]> {
  const ids = userIds.filter((id) => UUID.test(id)).slice(0, 128);
  if (!ids.length) return [];
  const supabase = await createClient();
  const list = ids.join(",");
  const { data } = await supabase
    .from("hosted_sets")
    .select("event_id, p1_id, p2_id, p1_score, p2_score, winner, event:hosted_events!inner ( removed_at )")
    .or(`p1_id.in.(${list}),p2_id.in.(${list})`)
    .not("winner", "is", null)
    .is("event.removed_at", null)
    .limit(5000);
  return (data ?? []) as unknown as RecordSet[];
}

/** Records for several players at once (for seeding). */
export async function getHostedRecords(userIds: string[]): Promise<Record<string, HostedRecord>> {
  const sets = await finishedSetsFor(userIds);
  return Object.fromEntries(userIds.map((id) => [id, hostedRecord(id, sets)]));
}

/** Head-to-head between two players on Smashy, leaving out one set (the one being viewed). */
export async function getHeadToHead(a: string, b: string): Promise<[number, number]> {
  return headToHead(a, b, await finishedSetsFor([a]));
}

export type MyHostedSet = { id: string; identifier: string | null; state: "ready" | "live" | "waiting"; opponent: string | null; eventId: string; eventName: string };

/** Your sets in Smashy brackets that are running now: up now, being played, or waiting for an opponent. */
export async function getMyActiveHostedSets(userId: string | null, db?: SupabaseClient): Promise<MyHostedSet[]> {
  if (!userId || !UUID.test(userId)) return [];
  const supabase = db ?? (await createClient());
  // Doubles: the teams I'm on in brackets that are running (their sets are mine too).
  const { data: teams } = await supabase.from("hosted_team_members").select("guest_id, event:hosted_events!inner ( status )").eq("user_id", userId).eq("event.status", "in_progress").limit(20);
  const mine = [userId, ...((teams ?? []) as { guest_id: string }[]).map((t) => t.guest_id)];
  const list = mine.join(",");
  const { data } = await supabase
    .from("hosted_sets")
    .select("id, identifier, state, p1_id, p2_id, event:hosted_events!inner ( id, name, status, removed_at )")
    .or(`p1_id.in.(${list}),p2_id.in.(${list})`)
    .in("state", ["ready", "live", "waiting"])
    .eq("event.status", "in_progress")
    .is("event.removed_at", null)
    .limit(20);
  const rows = (data ?? []) as unknown as { id: string; identifier: string | null; state: MyHostedSet["state"]; p1_id: string | null; p2_id: string | null; event: { id: string; name: string } }[];
  const otherOf = (r: { p1_id: string | null; p2_id: string | null }) => (r.p1_id && mine.includes(r.p1_id) ? r.p2_id : r.p1_id);
  const others = [...new Set(rows.map(otherOf).filter((x): x is string => !!x))];
  // The other side is a player, or (walk-ins and teams) a name in the event's own list.
  const [{ data: profs }, { data: named }] = others.length
    ? await Promise.all([supabase.from("profiles").select("id, tag").in("id", others), supabase.from("hosted_guests").select("id, tag").in("id", others)])
    : [{ data: [] }, { data: [] }];
  const tag = new Map(([...(profs ?? []), ...(named ?? [])] as { id: string; tag: string }[]).map((p) => [p.id, p.tag]));
  const order = { live: 0, ready: 1, waiting: 2 } as const;
  return rows
    .map((r) => {
      const other = otherOf(r);
      return { id: r.id, identifier: r.identifier, state: r.state, opponent: other ? tag.get(other) ?? "Player" : null, eventId: r.event.id, eventName: r.event.name };
    })
    .sort((a, b) => order[a.state] - order[b.state]);
}

/** For each of these events, the tags of people the viewer follows who signed up ("Fox + 1 you follow"). */
export async function getFollowedEntrants(viewerId: string | null, eventIds: string[]): Promise<Record<string, string[]>> {
  const ids = eventIds.filter((id) => UUID.test(id)).slice(0, 100);
  if (!viewerId || !ids.length) return {};
  const supabase = await createClient();
  const { data: follows } = await supabase.from("follows").select("followee_id").eq("follower_id", viewerId).eq("status", "active").limit(2000);
  const followed = ((follows ?? []) as { followee_id: string }[]).map((f) => f.followee_id);
  if (!followed.length) return {};
  const { data } = await supabase
    .from("hosted_entrants")
    .select("event_id, profile:profiles!hosted_entrants_user_id_fkey ( tag )")
    .in("event_id", ids)
    .in("user_id", followed.slice(0, 1000))
    .limit(2000);
  const out: Record<string, string[]> = {};
  for (const r of (data ?? []) as unknown as { event_id: string; profile: { tag: string } | null }[]) {
    if (r.profile) (out[r.event_id] ??= []).push(r.profile.tag);
  }
  return out;
}

/** "Fox", "Fox + 1 you follow", "Fox + 3 you follow". */
export function followedLabel(tags: string[] | undefined): string | null {
  if (!tags?.length) return null;
  return tags.length === 1 ? `${tags[0]} is in` : `${tags[0]} + ${tags.length - 1} you follow`;
}

/** Events this person hosts (newest first). */
export async function getEventsHostedBy(hostId: string): Promise<HostedEvent[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("hosted_events").select(FIELDS).eq("host_id", hostId).is("parent_id", null).order("starts_at", { ascending: false }).limit(50);
  return ((data ?? []) as unknown as Row[]).map(toEvent);
}

/** When check-in opens (null = no check-in step). */
export function checkInOpensAt(e: Pick<HostedEvent, "startsAt" | "checkinMinutes">): number | null {
  return e.checkinMinutes > 0 ? Date.parse(e.startsAt) - e.checkinMinutes * 60_000 : null;
}

/**
 * How these entrants placed in an earlier event (the last finished edition of their series), keyed
 * by their id in the current event. Players with an account are matched by account; walk-ins have a
 * new id every event, so they're matched by tag (to that event's walk-ins only).
 */
export async function getPlacementsFrom(eventId: string, entrants: Pick<HostedEntrant, "userId" | "tag" | "guest">[]): Promise<Record<string, number>> {
  if (!UUID.test(eventId) || !entrants.length) return {};
  const supabase = await createClient();
  const [{ data: people }, { data: guests }] = await Promise.all([
    supabase.from("hosted_entrants").select("user_id, placement").eq("event_id", eventId).not("placement", "is", null).limit(600),
    supabase.from("hosted_guests").select("tag, placement").eq("event_id", eventId).not("placement", "is", null).limit(600),
  ]);
  const byUser = new Map(((people ?? []) as { user_id: string; placement: number }[]).map((r) => [r.user_id, r.placement]));
  const byTag = new Map(((guests ?? []) as { tag: string; placement: number }[]).map((r) => [r.tag.trim().toLowerCase(), r.placement]));
  const out: Record<string, number> = {};
  for (const e of entrants) {
    const place = e.guest ? byTag.get(e.tag.trim().toLowerCase()) : byUser.get(e.userId);
    if (place) out[e.userId] = place;
  }
  return out;
}

/** Every edition of a weekly series, oldest first (the first edition plus everything pointing at it). */
export async function getSeriesEditions(event: Pick<HostedEvent, "id" | "seriesId" | "hostId">): Promise<{ id: string; name: string; startsAt: string; status: HostedStatus }[]> {
  const root = event.seriesId ?? event.id;
  const supabase = await createClient();
  const { data } = await supabase
    .from("hosted_events")
    .select("id, name, starts_at, status")
    .or(`id.eq.${root},series_id.eq.${root}`)
    .eq("host_id", event.hostId) // a series is one host's
    .is("removed_at", null)
    .order("starts_at")
    .limit(200);
  return ((data ?? []) as { id: string; name: string; starts_at: string; status: HostedStatus }[]).map((r) => ({ id: r.id, name: r.name, startsAt: r.starts_at, status: r.status }));
}

/** The medal table across a series' finished editions (top 8 rows), with each player's tag. */
export async function getSeriesMedals(editionIds: string[]): Promise<(MedalRow & { tag: string; handle: string })[]> {
  const ids = editionIds.filter((id) => UUID.test(id)).slice(0, 200);
  if (!ids.length) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("hosted_entrants")
    .select("user_id, placement, profile:profiles!hosted_entrants_user_id_fkey ( tag, handle )")
    .in("event_id", ids)
    .lte("placement", 3)
    .limit(2000);
  const rows = (data ?? []) as unknown as { user_id: string; placement: number; profile: { tag: string; handle: string } | null }[];
  const who = new Map(rows.map((r) => [r.user_id, r.profile]));
  return medalTable(rows.map((r) => ({ userId: r.user_id, place: r.placement })))
    .slice(0, 8)
    .flatMap((m) => {
      const p = who.get(m.userId);
      return p ? [{ ...m, tag: p.tag, handle: p.handle }] : [];
    });
}

/** A person's events on Smashy: the ones they host and their results, newest first. */
export async function getProfileEvents(userId: string): Promise<{ hosted: HostedEvent[]; results: { event: { id: string; name: string; startsAt: string }; place: number }[] }> {
  const supabase = await createClient();
  const [hosted, { data: res }, { data: teamRes }] = await Promise.all([
    getEventsHostedBy(userId),
    supabase
      .from("hosted_entrants")
      .select("placement, event:hosted_events!inner ( id, name, starts_at, removed_at, status )")
      .eq("user_id", userId)
      .not("placement", "is", null)
      .limit(100),
    // Doubles: how the teams they were on placed.
    supabase
      .from("hosted_team_members")
      .select("team:hosted_guests!inner ( placement ), event:hosted_events!inner ( id, name, starts_at, removed_at, status )")
      .eq("user_id", userId)
      .not("team.placement", "is", null)
      .limit(100),
  ]);
  type Res = { placement: number; event: { id: string; name: string; starts_at: string; removed_at: string | null } };
  const asTeam = ((teamRes ?? []) as unknown as { team: { placement: number }; event: Res["event"] }[]).map((t) => ({ placement: t.team.placement, event: t.event }));
  const results = [...((res ?? []) as unknown as Res[]), ...asTeam]
    .filter((r) => !r.event.removed_at)
    .map((r) => ({ event: { id: r.event.id, name: r.event.name, startsAt: r.event.starts_at }, place: r.placement }))
    .sort((a, b) => b.event.startsAt.localeCompare(a.event.startsAt));
  return { hosted: hosted.filter((e) => !e.removed && e.status !== "canceled"), results };
}
