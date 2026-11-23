// Seasons and rankings: a scene's own ranking, run by its admins (docs/seasons-plan.md). Reading and
// saving seasons, and bringing in an event's final standings (from a Smashy bracket or start.gg).
// Only the server touches the season tables: everything here checks who's asking. Server-only.
import "server-only";
import { cacheLife } from "next/cache";
import { createAdminClient } from "./supabase/admin";
import { ADULT_AGE, ageFromBirthdate } from "./age";
import { gameOfEvent, type GameKey } from "./games";
import { getHostedEvent } from "./hostedEvents";
import { startggQuery } from "./startgg";
import { langsFor, trFor } from "./i18n/recipients";
import { computeStandings, memberKey, movementSinceLatest, SEASON_LIMITS, startggKey, walkInKey, type Movement, type PlayerOverride, type PointsRow, type SeasonEventData, type SeasonResult, type StandingRow } from "./seasonsMath";
import { bigs } from "@/lib/supabase/loose";

export type Season = {
  id: string;
  ownerId: string;
  name: string;
  game: GameKey;
  region: string | null;
  startsOn: string;
  endsOn: string;
  points: PointsRow[];
  bestOf: number | null;
  minEvents: number;
  visibility: "public" | "unlisted";
  removed: boolean;
};

/** `invited`: asked to help run it, hasn't accepted yet (round 639); gives no say and isn't shown publicly. */
export type SeasonAdmin = { userId: string; tag: string; handle: string; owner: boolean; invited?: boolean };
export type SeasonEvent = SeasonEventData & { source: "smashy" | "startgg"; ref: string; entrants: number | null };

type Row = { id: string; owner_id: string; name: string; game: GameKey; region: string | null; starts_on: string; ends_on: string; points: PointsRow[]; best_of: number | null; min_events: number; visibility: "public" | "unlisted"; removed_at: string | null };
const FIELDS = "id, owner_id, name, game, region, starts_on, ends_on, points, best_of, min_events, visibility, removed_at";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const toSeason = (r: Row): Season => ({
  id: r.id, ownerId: r.owner_id, name: r.name, game: r.game, region: r.region, startsOn: r.starts_on, endsOn: r.ends_on,
  points: r.points, bestOf: r.best_of, minEvents: r.min_events, visibility: r.visibility, removed: !!r.removed_at,
});

export async function getSeason(id: string): Promise<Season | null> {
  if (!UUID.test(id)) return null;
  const { data } = await createAdminClient().from("seasons").select(FIELDS).eq("id", id).maybeSingle();
  return data ? toSeason(data as Row) : null;
}

/** The creator first, then co-admins; with `withInvited`, people invited who haven't accepted yet, last. */
export async function getSeasonAdmins(season: Pick<Season, "id" | "ownerId">, withInvited = false): Promise<SeasonAdmin[]> {
  const db = createAdminClient();
  const { data: rows } = await db.from("season_admins").select("user_id, accepted_at").eq("season_id", season.id);
  const list = ((rows ?? []) as { user_id: string; accepted_at: string | null }[]).filter((r) => r.user_id !== season.ownerId && (withInvited || r.accepted_at));
  const invited = new Set(list.filter((r) => !r.accepted_at).map((r) => r.user_id));
  const ids = [season.ownerId, ...list.filter((r) => r.accepted_at).map((r) => r.user_id), ...invited];
  const { data: profiles } = await db.from("profiles").select("id, tag, handle").in("id", ids);
  const byId = new Map(((profiles ?? []) as { id: string; tag: string; handle: string }[]).map((p) => [p.id, p]));
  return ids.flatMap((id) => (byId.has(id) ? [{ userId: id, tag: byId.get(id)!.tag, handle: byId.get(id)!.handle, owner: id === season.ownerId, invited: invited.has(id) }] : []));
}

/** Whether this member has an invite to help run the season that they haven't answered (round 639). */
export async function hasSeasonInvite(seasonId: string, userId: string | null): Promise<boolean> {
  if (!userId) return false;
  const { data } = await createAdminClient().from("season_admins").select("user_id").eq("season_id", seasonId).eq("user_id", userId).is("accepted_at", null).maybeSingle();
  return !!data;
}

export async function canManageSeason(season: Pick<Season, "id" | "ownerId">, userId: string | null): Promise<boolean> {
  if (!userId) return false;
  if (season.ownerId === userId) return true;
  const { data } = await createAdminClient().from("season_admins").select("user_id").eq("season_id", season.id).eq("user_id", userId).not("accepted_at", "is", null).maybeSingle();
  return !!data; // an invite not yet accepted gives no say (round 639)
}

export type SeasonListItem = Season & { owner: { tag: string; handle: string } | null; events: number };

/** Public seasons (newest end date first), optionally for one game; plus the viewer's own, unlisted ones included. */
export async function listSeasons(opts: { game?: GameKey | null; userId?: string | null } = {}): Promise<{ mine: SeasonListItem[]; all: SeasonListItem[] }> {
  const db = createAdminClient();
  let q = db.from("seasons").select(FIELDS).is("removed_at", null).eq("visibility", "public").order("ends_on", { ascending: false }).limit(60);
  if (opts.game) q = q.eq("game", opts.game);
  const [{ data: pub }, mineIds] = await Promise.all([q, opts.userId ? mySeasonIds(opts.userId) : Promise.resolve([])]);
  const { data: mineRows } = mineIds.length ? await db.from("seasons").select(FIELDS).in("id", mineIds).is("removed_at", null) : { data: [] };
  const all = ((pub ?? []) as Row[]).map(toSeason);
  const mine = ((mineRows ?? []) as Row[]).map(toSeason).sort((a, b) => b.endsOn.localeCompare(a.endsOn));
  const ids = [...new Set([...all, ...mine].map((s) => s.id))];
  const owners = [...new Set([...all, ...mine].map((s) => s.ownerId))];
  const [{ data: profs }, { data: evs }] = await Promise.all([
    owners.length ? db.from("profiles").select("id, tag, handle").in("id", owners) : Promise.resolve({ data: [] }),
    ids.length ? db.from("season_events").select("season_id").in("season_id", ids).limit(5000) : Promise.resolve({ data: [] }),
  ]);
  const ownerOf = new Map(((profs ?? []) as { id: string; tag: string; handle: string }[]).map((p) => [p.id, { tag: p.tag, handle: p.handle }]));
  const counts = new Map<string, number>();
  for (const e of (evs ?? []) as { season_id: string }[]) counts.set(e.season_id, (counts.get(e.season_id) ?? 0) + 1);
  const full = (s: Season): SeasonListItem => ({ ...s, owner: ownerOf.get(s.ownerId) ?? null, events: counts.get(s.id) ?? 0 });
  return { mine: mine.map(full), all: all.map(full) };
}

async function mySeasonIds(userId: string): Promise<string[]> {
  const db = createAdminClient();
  const [{ data: owned }, { data: admin }] = await Promise.all([
    db.from("seasons").select("id").eq("owner_id", userId).limit(SEASON_LIMITS.seasonsPerMember + 5),
    db.from("season_admins").select("season_id").eq("user_id", userId).not("accepted_at", "is", null).limit(100),
  ]);
  return [...new Set([...((owned ?? []) as { id: string }[]).map((r) => r.id), ...((admin ?? []) as { season_id: string }[]).map((r) => r.season_id)])];
}

export async function countOwnedSeasons(userId: string): Promise<number> {
  const { count } = await createAdminClient().from("seasons").select("id", { count: "exact", head: true }).eq("owner_id", userId);
  return count ?? 0;
}

export async function getSeasonEvents(seasonId: string): Promise<SeasonEvent[]> {
  const { data } = await createAdminClient()
    .from("season_events")
    .select("id, source, ref, name, held_on, entrants, weight, results")
    .eq("season_id", seasonId)
    .order("held_on", { ascending: false })
    .limit(SEASON_LIMITS.eventsPerSeason + 10);
  return ((data ?? []) as { id: string; source: "smashy" | "startgg"; ref: string; name: string; held_on: string; entrants: number | null; weight: number; results: SeasonResult[] }[]).map((e) => ({
    id: e.id, source: e.source, ref: e.ref, name: e.name, heldOn: e.held_on, entrants: e.entrants, weight: Number(e.weight), results: e.results ?? [],
  }));
}

export async function getSeasonOverrides(seasonId: string): Promise<PlayerOverride[]> {
  const { data } = await createAdminClient().from("season_players").select("player_key, display_name, merged_into, left_out").eq("season_id", seasonId).limit(5000);
  return ((data ?? []) as { player_key: string; display_name: string | null; merged_into: string | null; left_out: boolean }[]).map((r) => ({
    key: r.player_key, displayName: r.display_name, mergedInto: r.merged_into, leftOut: r.left_out,
  }));
}

export type ShownRow = StandingRow & {
  /** Hidden from this viewer: a teen (or a member without a birthday) and the viewer isn't signed in. */
  hidden: boolean;
  /** Would be hidden from a signed-out visitor (a teen, or a member without a birthday), whoever's viewing. */
  hiddenFromGuests: boolean;
  handle: string | null; // a Smashy member's profile
  /** Since the latest event day (none before a second event day). */
  movement: Movement | null;
};

/**
 * The standings as this viewer may see them. Members who linked start.gg count as one player with their
 * start.gg results; the season creator's "Names on your PR" are the starting names.
 */
export async function getStandings(season: Season, events: SeasonEvent[], viewerId: string | null): Promise<ShownRow[]> {
  const db = createAdminClient();
  const keys = new Set(events.flatMap((e) => e.results.map((r) => r.key)));
  const sggIds = [...keys].filter((k) => k.startsWith("s:")).map((k) => k.slice(2));
  // The admins' fixes, linked start.gg accounts and the creator's PR names don't depend on each other.
  const [overrides, { data: links }, { data: pr }] = await Promise.all([
    getSeasonOverrides(season.id),
    sggIds.length ? db.from("startgg_links").select("user_id, startgg_player_id").in("startgg_player_id", bigs(sggIds.slice(0, 1000))) : Promise.resolve({ data: [] }),
    db.from("pr_names").select("user_id, guest_tag, pr_name").eq("host_id", season.ownerId).limit(2000),
  ]);
  const autoMerge = new Map(((links ?? []) as { user_id: string; startgg_player_id: number }[]).map((l) => [startggKey(l.startgg_player_id), memberKey(l.user_id)]));

  // The creator's PR names, where an admin hasn't named the player here.
  const named = new Set(overrides.filter((o) => o.displayName).map((o) => o.key));
  const prOverrides: PlayerOverride[] = [];
  for (const r of (pr ?? []) as { user_id: string | null; guest_tag: string | null; pr_name: string }[]) {
    const key = r.user_id ? memberKey(r.user_id) : walkInKey(r.guest_tag ?? "");
    if (keys.has(key) && !named.has(key)) prOverrides.push({ key, displayName: r.pr_name, mergedInto: null, leftOut: false });
  }

  const opts = { events, overrides: [...prOverrides, ...overrides], points: season.points, bestOf: season.bestOf, minEvents: season.minEvents, autoMerge };
  const rows = computeStandings(opts);
  const moved = movementSinceLatest(opts, rows);
  const memberIds = rows.filter((r) => r.key.startsWith("u:")).map((r) => r.key.slice(2));
  const [{ data: profs }, { data: births }] = await Promise.all([
    memberIds.length ? db.from("profiles").select("id, handle").in("id", memberIds) : Promise.resolve({ data: [] }),
    memberIds.length ? db.from("private_profile_data").select("user_id, date_of_birth").in("user_id", memberIds) : Promise.resolve({ data: [] }),
  ]);
  const handles = new Map(((profs ?? []) as { id: string; handle: string }[]).map((p) => [p.id, p.handle]));
  const adults = new Set(((births ?? []) as { user_id: string; date_of_birth: string }[]).filter((b) => ageFromBirthdate(b.date_of_birth) >= ADULT_AGE).map((b) => b.user_id));
  return rows.map((r) => {
    const uid = r.key.startsWith("u:") ? r.key.slice(2) : null;
    const hiddenFromGuests = !!uid && !adults.has(uid);
    return { ...r, hidden: !viewerId && hiddenFromGuests, hiddenFromGuests, handle: uid ? handles.get(uid) ?? null : null, movement: moved.get(r.key) ?? null };
  });
}

// ---------- Bringing an event in ----------

export type EventIn = { source: "smashy" | "startgg"; ref: string; name: string; heldOn: string; entrants: number; results: SeasonResult[] };
export type EventInError = "notFinished" | "wrongGame" | "teams" | "notFound" | "startggDown" | "tooBig" | "empty";

/** A finished Smashy bracket's final placements (members by account, walk-ins by tag). */
export async function resultsFromSmashy(eventId: string, game: GameKey): Promise<EventIn | EventInError> {
  const db = createAdminClient();
  const event = await getHostedEvent(eventId, db);
  if (!event || event.removed) return "notFound";
  if (event.game !== game) return "wrongGame";
  if (event.teamSize !== 1) return "teams";
  if (event.status !== "completed") return "notFinished";
  const [{ data: people }, { data: guests }] = await Promise.all([
    db.from("hosted_entrants").select("user_id, placement, profile:profiles!hosted_entrants_user_id_fkey ( tag )").eq("event_id", eventId).not("placement", "is", null).limit(600),
    db.from("hosted_guests").select("tag, placement").eq("event_id", eventId).not("placement", "is", null).limit(600),
  ]);
  const results: SeasonResult[] = [
    ...((people ?? []) as unknown as { user_id: string; placement: number; profile: { tag: string } | null }[]).map((r) => ({ key: memberKey(r.user_id), name: r.profile?.tag ?? "?", place: r.placement })),
    ...((guests ?? []) as { tag: string; placement: number }[]).map((g) => ({ key: walkInKey(g.tag), name: g.tag.trim(), place: g.placement })),
  ];
  if (!results.length) return "empty";
  return { source: "smashy", ref: event.id, name: event.name, heldOn: event.startsAt.slice(0, 10), entrants: event.entrantCount || results.length, results };
}

type RawStandings = {
  event: {
    id: number; name: string; state: string | null; startAt: number | null; numEntrants: number | null;
    videogame: { id: number } | null; tournament: { name: string } | null;
    standings: { pageInfo: { totalPages: number | null } | null; nodes: { placement: number | null; entrant: { name: string | null; participants: { gamerTag: string | null; player: { id: number | null } | null }[] | null } | null }[] | null } | null;
  } | null;
};

const STANDINGS_PAGE = 64;

/** A finished start.gg event's final standings (singles only; up to 512 players). `slug` is "tournament/x/event/y". */
export async function resultsFromStartgg(ref: string | { id: string }, game: GameKey): Promise<EventIn | EventInError> {
  const byId = typeof ref !== "string";
  if (byId && !/^\d{1,15}$/.test(ref.id)) return "notFound";
  const query = `query SeasonStandings(${byId ? "$id: ID!" : "$slug: String!"}, $page: Int!, $perPage: Int!) {
    event(${byId ? "id: $id" : "slug: $slug"}) {
      id name state startAt numEntrants videogame { id } tournament { name }
      standings(query: { page: $page, perPage: $perPage }) {
        pageInfo { totalPages }
        nodes { placement entrant { name participants { gamerTag player { id } } } }
      }
    }
  }`;
  let first: NonNullable<RawStandings["event"]> | null = null;
  const results: SeasonResult[] = [];
  try {
    for (let page = 1; page <= Math.ceil(SEASON_LIMITS.playersPerEvent / STANDINGS_PAGE); page++) {
      const { event } = await startggQuery<RawStandings>(query, { ...(byId ? { id: ref.id } : { slug: ref }), page, perPage: STANDINGS_PAGE });
      if (!event) return "notFound";
      if (!first) {
        first = event;
        if (gameOfEvent(event) !== game) return "wrongGame";
        if (event.state !== "COMPLETED") return "notFinished";
        if ((event.numEntrants ?? 0) > SEASON_LIMITS.playersPerEvent) return "tooBig";
      }
      for (const n of event.standings?.nodes ?? []) {
        const people = n.entrant?.participants ?? [];
        if (people.length > 1) return "teams";
        const pid = people[0]?.player?.id;
        const name = (people[0]?.gamerTag ?? n.entrant?.name ?? "").trim();
        if (!n.placement || !name) continue;
        results.push({ key: pid ? startggKey(pid) : walkInKey(name), name: name.slice(0, 60), place: n.placement });
      }
      if (page >= (event.standings?.pageInfo?.totalPages ?? 1)) break;
    }
  } catch {
    return "startggDown";
  }
  if (!first) return "notFound";
  if (!results.length) return "empty";
  const heldOn = first.startAt ? new Date(first.startAt * 1000).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const name = first.tournament?.name ? `${first.tournament.name}: ${first.name}` : first.name;
  return { source: "startgg", ref: String(first.id), name: name.slice(0, 160), heldOn, entrants: first.numEntrants ?? results.length, results };
}

/** Finished singles brackets this member ran (or co-ran) in a game, newest first: the ones they can add in one tap. */
export async function myFinishedBrackets(userId: string, game: GameKey): Promise<{ id: string; name: string; startsAt: string }[]> {
  const db = createAdminClient();
  const { data: co } = await db.from("hosted_cohosts").select("event_id").eq("user_id", userId).limit(200);
  const coIds = ((co ?? []) as { event_id: string }[]).map((r) => r.event_id);
  let q = db.from("hosted_events").select("id, name, starts_at").eq("game", game).eq("status", "completed").eq("team_size", 1).is("removed_at", null).order("starts_at", { ascending: false }).limit(40);
  q = coIds.length ? q.or(`host_id.eq.${userId},id.in.(${coIds.join(",")})`) : q.eq("host_id", userId);
  const { data } = await q;
  return ((data ?? []) as { id: string; name: string; starts_at: string }[]).map((e) => ({ id: e.id, name: e.name, startsAt: e.starts_at }));
}

// ---------- Seasons on player and event pages ----------

/** `rowKey` is the player's row on the standings (for a link straight to it). */
export type SeasonRank = { seasonId: string; name: string; game: GameKey; rank: number; players: number; points: number; current: boolean; rowKey: string };

/**
 * Where a player is ranked: public seasons that ended in the last four months or are still on, where any of
 * `keys` (a member, their start.gg player) has a rank. Rows this viewer may not see (a teen, for a guest) aren't shown.
 */
export async function seasonRanksFor(keys: string[], viewerId: string | null): Promise<SeasonRank[]> {
  const db = createAdminClient();
  const wanted = keys.filter(Boolean).slice(0, 4);
  if (!wanted.length) return [];
  const hits = await Promise.all(wanted.map((key) => db.from("season_events").select("season_id").filter("results", "cs", JSON.stringify([{ key }])).limit(50)));
  const ids = [...new Set(hits.flatMap((h) => ((h.data ?? []) as { season_id: string }[]).map((r) => r.season_id)))];
  if (!ids.length) return [];
  const since = new Date(Date.now() - 120 * 86400_000).toISOString().slice(0, 10);
  const { data } = await db.from("seasons").select(FIELDS).in("id", ids).is("removed_at", null).eq("visibility", "public").gte("ends_on", since).order("ends_on", { ascending: false }).limit(5);
  const today = new Date().toISOString().slice(0, 10);
  const out: SeasonRank[] = [];
  // Every season at once (each is its own few lookups), not one after another.
  const seasons = ((data ?? []) as Row[]).map(toSeason);
  const standings = await Promise.all(seasons.map(async (season) => getStandings(season, await getSeasonEvents(season.id), viewerId)));
  for (const [i, season] of seasons.entries()) {
    const rows = standings[i];
    const me = rows.find((r) => r.keys.some((k) => wanted.includes(k)));
    if (!me || me.rank === null || me.hidden) continue;
    out.push({ seasonId: season.id, name: season.name, game: season.game, rank: me.rank, players: rows.filter((r) => r.rank !== null).length, points: me.points, current: season.endsOn >= today, rowKey: me.key });
  }
  return out.sort((a, b) => Number(b.current) - Number(a.current) || a.rank - b.rank);
}

/** Public seasons an event counts toward (a Smashy bracket by id, or start.gg events by their ids). */
export async function seasonsCounting(source: "smashy" | "startgg", refs: string[]): Promise<{ id: string; name: string }[]> {
  const list = refs.filter(Boolean).slice(0, 50);
  if (!list.length) return [];
  const db = createAdminClient();
  const { data: rows } = await db.from("season_events").select("season_id").eq("source", source).in("ref", list).limit(50);
  const ids = [...new Set(((rows ?? []) as { season_id: string }[]).map((r) => r.season_id))];
  if (!ids.length) return [];
  const { data } = await db.from("seasons").select("id, name").in("id", ids).is("removed_at", null).eq("visibility", "public").limit(10);
  return (data ?? []) as { id: string; name: string }[];
}

/**
 * When a Smashy bracket finishes: its host and co-hosts who run a season of that game covering its date (and
 * not holding it yet) get an alert offering to add it. Once per person, season and bracket.
 */
export async function offerToSeasons(eventId: string): Promise<void> {
  const db = createAdminClient();
  const event = await getHostedEvent(eventId, db);
  if (!event || event.removed || event.teamSize !== 1 || event.status !== "completed") return;
  const { data: co } = await db.from("hosted_cohosts").select("user_id").eq("event_id", eventId);
  const runners = [event.hostId, ...((co ?? []) as { user_id: string }[]).map((r) => r.user_id)];
  const day = event.startsAt.slice(0, 10);
  const [{ data: owned }, { data: adminOf }] = await Promise.all([
    db.from("seasons").select("id, owner_id").in("owner_id", runners).eq("game", event.game).is("removed_at", null).lte("starts_on", day).gte("ends_on", day).limit(20),
    db.from("season_admins").select("season_id, user_id").in("user_id", runners).not("accepted_at", "is", null).limit(100),
  ]);
  const candidates = new Map<string, Set<string>>(); // season → the people running this bracket who admin it
  for (const s of (owned ?? []) as { id: string; owner_id: string }[]) candidates.set(s.id, new Set([s.owner_id]));
  const coIds = [...new Set(((adminOf ?? []) as { season_id: string }[]).map((r) => r.season_id))];
  if (coIds.length) {
    const { data: coSeasons } = await db.from("seasons").select("id").in("id", coIds).eq("game", event.game).is("removed_at", null).lte("starts_on", day).gte("ends_on", day);
    const ok = new Set(((coSeasons ?? []) as { id: string }[]).map((s) => s.id));
    for (const r of (adminOf ?? []) as { season_id: string; user_id: string }[]) if (ok.has(r.season_id)) candidates.set(r.season_id, (candidates.get(r.season_id) ?? new Set<string>()).add(r.user_id));
  }
  if (!candidates.size) return;
  const { data: have } = await db.from("season_events").select("season_id").eq("source", "smashy").eq("ref", eventId).in("season_id", [...candidates.keys()]);
  for (const r of (have ?? []) as { season_id: string }[]) candidates.delete(r.season_id);
  if (!candidates.size) return;
  const { data: seasons } = await db.from("seasons").select("id, name").in("id", [...candidates.keys()]);
  const nameOf = new Map(((seasons ?? []) as { id: string; name: string }[]).map((s) => [s.id, s.name]));
  const hrefOf = (seasonId: string) => `/seasons/${seasonId}/manage?add=${eventId}#events`;
  const { data: sent } = await db.from("notifications").select("user_id, event_href").eq("type", "event_update").in("event_href", [...candidates.keys()].map(hrefOf));
  const already = new Set(((sent ?? []) as { user_id: string; event_href: string }[]).map((n) => `${n.user_id} ${n.event_href}`));
  const langs = await langsFor([...new Set([...candidates.values()].flatMap((s) => [...s]))]);
  const rows = [...candidates].flatMap(([seasonId, admins]) =>
    [...admins].flatMap((user_id) => {
      const href = hrefOf(seasonId);
      if (already.has(`${user_id} ${href}`)) return [];
      const text = trFor(langs.get(user_id) ?? "en")("season.alert.add", { event: event.name, season: nameOf.get(seasonId) ?? "" });
      return [{ user_id, actor_id: null, type: "event_update", event_name: text.slice(0, 200), event_href: href }];
    }),
  );
  if (rows.length) {
    const { error } = await db.from("notifications").insert(rows);
    if (error) console.error("season offer notifications failed", error.message);
  }
}

/**
 * A finished Smashy bracket's placements changed (the host fixed a result): seasons that already hold it get
 * the new placements, so their standings stay right.
 */
export async function refreshSeasonResults(eventId: string): Promise<void> {
  const db = createAdminClient();
  const { data: rows } = await db.from("season_events").select("id, season_id").eq("source", "smashy").eq("ref", eventId).limit(20);
  const held = (rows ?? []) as { id: string; season_id: string }[];
  if (!held.length) return;
  const event = await getHostedEvent(eventId, db);
  if (!event) return;
  const found = await resultsFromSmashy(eventId, event.game);
  if (typeof found === "string") return;
  await db.from("season_events").update({ results: found.results, entrants: found.entrants }).in("id", held.map((r) => r.id));
}

/** Public seasons running now in a region (for the Events page), soonest to end first. */
export async function currentSeasonsIn(region: string): Promise<{ id: string; name: string; game: GameKey }[]> {
  if (!region || region.length > 10) return [];
  return seasonsRunningIn(region, new Date().toISOString().slice(0, 10));
}

/**
 * One copy per region and day shared by every server for 5 minutes (round 576): Events read the
 * seasons table on every visit. A new or edited season can take up to 5 minutes to show there.
 */
async function seasonsRunningIn(region: string, today: string): Promise<{ id: string; name: string; game: GameKey }[]> {
  "use cache: remote";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  const { data } = await createAdminClient()
    .from("seasons")
    .select("id, name, game")
    .eq("region", region)
    .eq("visibility", "public")
    .is("removed_at", null)
    .lte("starts_on", today)
    .gte("ends_on", today)
    .order("ends_on")
    .limit(4);
  return (data ?? []) as { id: string; name: string; game: GameKey }[];
}

/**
 * Seasons this member runs (creator or co-admin) that a finished Smashy bracket could join: same game, the
 * bracket's date inside the season, singles, not taken down, and not holding it yet.
 */
export async function seasonsToAdd(event: { id: string; game: GameKey; startsAt: string; teamSize: number; status: string }, userId: string | null): Promise<{ id: string; name: string }[]> {
  if (!userId || event.status !== "completed" || event.teamSize !== 1) return [];
  const db = createAdminClient();
  const day = event.startsAt.slice(0, 10);
  const { data: co } = await db.from("season_admins").select("season_id").eq("user_id", userId).not("accepted_at", "is", null).limit(100);
  const coIds = ((co ?? []) as { season_id: string }[]).map((r) => r.season_id);
  let q = db.from("seasons").select("id, name").eq("game", event.game).is("removed_at", null).lte("starts_on", day).gte("ends_on", day).limit(10);
  q = coIds.length ? q.or(`owner_id.eq.${userId},id.in.(${coIds.join(",")})`) : q.eq("owner_id", userId);
  const { data } = await q;
  const seasons = (data ?? []) as { id: string; name: string }[];
  if (!seasons.length) return [];
  const { data: have } = await db.from("season_events").select("season_id").eq("source", "smashy").eq("ref", event.id).in("season_id", seasons.map((s) => s.id));
  const held = new Set(((have ?? []) as { season_id: string }[]).map((r) => r.season_id));
  return seasons.filter((s) => !held.has(s.id));
}

/** Public seasons whose name matches a search (newest end date first). */
export async function searchSeasons(q: string, limit = 3): Promise<{ id: string; name: string; game: GameKey; endsOn: string }[]> {
  const term = q.trim().slice(0, 60).replace(/[%_\\,()]/g, " ").trim();
  if (term.length < 2) return [];
  const { data } = await createAdminClient()
    .from("seasons")
    .select("id, name, game, ends_on")
    .eq("visibility", "public")
    .is("removed_at", null)
    .ilike("name", `%${term}%`)
    .order("ends_on", { ascending: false })
    .limit(limit);
  return ((data ?? []) as { id: string; name: string; game: GameKey; ends_on: string }[]).map((r) => ({ id: r.id, name: r.name, game: r.game, endsOn: r.ends_on }));
}

/** The season a member runs that's on now (soonest to end), else their most recent one; public only. */
export async function currentSeasonOf(userId: string): Promise<Season | null> {
  const db = createAdminClient();
  const { data: co } = await db.from("season_admins").select("season_id").eq("user_id", userId).not("accepted_at", "is", null).limit(100);
  const coIds = ((co ?? []) as { season_id: string }[]).map((r) => r.season_id);
  let q = db.from("seasons").select(FIELDS).is("removed_at", null).eq("visibility", "public").order("ends_on", { ascending: false }).limit(20);
  q = coIds.length ? q.or(`owner_id.eq.${userId},id.in.(${coIds.join(",")})`) : q.eq("owner_id", userId);
  const { data } = await q;
  const all = ((data ?? []) as Row[]).map(toSeason);
  const today = new Date().toISOString().slice(0, 10);
  const running = all.filter((s) => s.startsOn <= today && s.endsOn >= today).sort((a, b) => a.endsOn.localeCompare(b.endsOn));
  return running[0] ?? all[0] ?? null;
}
