// A weekly series' page: every edition, who came, who won and who kept meeting, read across all its
// editions. Read as the viewer, so the usual privacy rules apply (a teen's profile isn't shown to
// someone who isn't signed in, and their sets are left out of the rivalries). Server-only.
import "server-only";
import { getHostedEvent, getSeriesEditions, type HostedEvent } from "./hostedEvents";
import { pageAll } from "./pageAll";
import { nameKey, rivalries, seriesPlayers, seriesSummary, type Rivalry, type SeriesEdition, type SeriesEntry, type SeriesPlayerRow, type SeriesSet, type SeriesSummary } from "./seriesStats";
import { createClient } from "./supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SeriesEditionRow = SeriesEdition & { winner: { name: string; handle: string | null } | null };

export type SeriesPage = {
  rootId: string;
  host: HostedEvent["host"];
  hostId: string;
  latest: HostedEvent; // the newest edition (for the name, place and time)
  editions: SeriesEditionRow[]; // oldest first
  summary: SeriesSummary;
  players: SeriesPlayerRow[];
  rivalries: (Rivalry & { aName: string; bName: string })[];
  names: Map<string, { name: string; handle: string | null }>;
  teams: boolean; // any edition is doubles (the table lists teams)
};

/** The id of the series an edition belongs to (its first edition's), or null if there's no such event. */
export async function seriesRootOf(id: string): Promise<{ root: string; event: HostedEvent } | null> {
  if (!UUID.test(id)) return null;
  const event = await getHostedEvent(id);
  if (!event || event.parentId) return null; // extra brackets aren't series editions
  return { root: event.seriesId ?? event.id, event };
}

export async function getSeriesPage(root: string, hostId: string): Promise<SeriesPage | null> {
  const list = await getSeriesEditions({ id: root, seriesId: null, hostId });
  if (!list.length) return null;
  const ids = list.map((e) => e.id);
  const supabase = await createClient();

  // How many entries each edition had (players and walk-ins or teams).
  const { data: counts } = await supabase.from("hosted_events").select("id, team_size, entrants:hosted_entrants ( count ), guests:hosted_guests ( count )").in("id", ids);
  const countOf = new Map(
    ((counts ?? []) as unknown as { id: string; team_size: number; entrants: { count: number }[]; guests: { count: number }[] }[]).map((r) => [r.id, (r.entrants?.[0]?.count ?? 0) + (r.guests?.[0]?.count ?? 0)]),
  );
  const teams = ((counts ?? []) as { team_size: number }[]).some((r) => r.team_size === 2);

  type EntrantRow = { event_id: string; user_id: string; placement: number | null; profile: { tag: string; handle: string; avatar_path: string | null } | null };
  type GuestRow = { id: string; event_id: string; tag: string; placement: number | null };
  type SetRow = { event_id: string; p1_id: string | null; p2_id: string | null; winner: number | null };
  const done = list.filter((e) => e.status === "completed").map((e) => e.id);
  const [people, guests, sets] = await Promise.all([
    pageAll<EntrantRow>((a, b) =>
      supabase
        .from("hosted_entrants")
        .select("event_id, user_id, placement, profile:profiles!hosted_entrants_user_id_fkey ( tag, handle, avatar_path )")
        .in("event_id", ids)
        .order("event_id")
        .order("user_id")
        .range(a, b) as unknown as PromiseLike<{ data: EntrantRow[] | null; error: unknown }>,
    ),
    pageAll<GuestRow>((a, b) => supabase.from("hosted_guests").select("id, event_id, tag, placement").in("event_id", ids).order("id").range(a, b) as unknown as PromiseLike<{ data: GuestRow[] | null; error: unknown }>),
    done.length
      ? pageAll<SetRow>((a, b) =>
          supabase.from("hosted_sets").select("event_id, p1_id, p2_id, winner").in("event_id", done).not("winner", "is", null).order("id").range(a, b) as unknown as PromiseLike<{ data: SetRow[] | null; error: unknown }>,
        )
      : Promise.resolve([] as SetRow[]),
  ]);

  // Everyone as a key: an account is itself; a walk-in or team (new id every week) is its name.
  const keyOf = new Map<string, string>();
  const names = new Map<string, { name: string; handle: string | null }>();
  const entries: SeriesEntry[] = [];
  for (const p of people) {
    if (!p.profile) continue; // hidden from this viewer (a teen, for someone signed out)
    keyOf.set(p.user_id, p.user_id);
    names.set(p.user_id, { name: p.profile.tag, handle: p.profile.handle });
    entries.push({ key: p.user_id, name: p.profile.tag, handle: p.profile.handle, eventId: p.event_id, place: p.placement });
  }
  // A walk-in goes by how their name was written most recently (oldest edition first, latest wins).
  const order = new Map(ids.map((id, i) => [id, i]));
  for (const g of [...guests].sort((x, y) => (order.get(x.event_id) ?? 0) - (order.get(y.event_id) ?? 0))) {
    const key = nameKey(g.tag);
    keyOf.set(g.id, key);
    names.set(key, { name: g.tag, handle: null });
    entries.push({ key, name: g.tag, handle: null, eventId: g.event_id, place: g.placement });
  }
  for (const e of entries) if (e.key.startsWith("name:")) e.name = names.get(e.key)!.name;

  const winnersById = new Map<string, string>();
  for (const e of entries) if (e.place === 1) winnersById.set(e.eventId, e.key);

  const editions: SeriesEditionRow[] = list.map((e) => {
    const w = winnersById.get(e.id);
    return { ...e, entries: countOf.get(e.id) ?? 0, winner: w ? (names.get(w) ?? null) : null };
  });

  const known: SeriesSet[] = sets.flatMap((s) => {
    const a = s.p1_id ? keyOf.get(s.p1_id) : undefined;
    const b = s.p2_id ? keyOf.get(s.p2_id) : undefined;
    return a && b && (s.winner === 1 || s.winner === 2) ? [{ a, b, winner: s.winner as 1 | 2 }] : [];
  });

  const latest = (await getHostedEvent(list[list.length - 1].id)) ?? (await getHostedEvent(root));
  if (!latest) return null;
  return {
    rootId: root,
    host: latest.host,
    hostId,
    latest,
    editions,
    summary: seriesSummary(editions, winnersById),
    // Finished editions only: signing up for next week isn't a time played.
    players: seriesPlayers(entries.filter((e) => done.includes(e.eventId))),
    rivalries: rivalries(known).map((r) => ({ ...r, aName: names.get(r.a)?.name ?? "Player", bName: names.get(r.b)?.name ?? "Player" })),
    names,
    teams,
  };
}
