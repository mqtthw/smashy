// What the Events tab shows: posted start.gg tournaments plus expected weeklies.
//
// The two start.gg searches behind it take ~7 seconds, so the page doesn't wait on them: the
// scheduled job (api/cron/refresh, every 3 hours) and, as a backup, page views once the copy is
// 3+ hours old, save the results in the database (events_sync). The page reads that saved copy.
// Only when there's no copy yet (or it's over a day old) does a visitor wait for start.gg.
import "server-only";
import { cacheLife } from "next/cache";
import { runRefresh } from "./refreshJobs";
import { getRecentRegionTournaments, getRecentTexasTournaments, getRegionTournaments, getTexasTournaments, type SmashyTournament } from "./startgg";
import { HOME_REGION, isRegion } from "./regions";
import { createAdminClient } from "./supabase/admin";
import { predictWeeklies, type ExpectedWeekly } from "./weeklies";

/** `recent`: tournaments in the region that finished in the last 7 days, latest day first and biggest first within a day (from the saved list, no extra start.gg request). */
export type TexasEvents = { tournaments: SmashyTournament[]; expected: ExpectedWeekly[]; recent: SmashyTournament[] };
type Snapshot = { tournaments: SmashyTournament[]; recent: SmashyTournament[] };

export const EVENTS_REFRESH_MINUTES = 3 * 60;
const MAX_SNAPSHOT_AGE_MS = 24 * 60 * 60 * 1000;

async function fetchFromStartgg(): Promise<Snapshot> {
  const [tournaments, recent] = await Promise.all([getTexasTournaments(), getRecentTexasTournaments()]);
  return { tournaments, recent };
}

/** Fetches Texas events from start.gg and saves them (the refresh job). */
export async function syncTexasEvents() {
  const snapshot = await fetchFromStartgg();
  // An empty answer is almost certainly a start.gg hiccup: keep the last good copy instead.
  if (snapshot.tournaments.length === 0 && snapshot.recent.length === 0) throw new Error("start.gg returned no Texas events");
  const { error } = await createAdminClient().from("events_sync").update({ data: snapshot, saved_at: new Date().toISOString() }).eq("id", 1);
  if (error) throw error;
}

/** Refreshes the saved copy in the background if it's due (call with after()). */
export async function refreshEventsIfStale() {
  await runRefresh("events", EVENTS_REFRESH_MINUTES, syncTexasEvents, { fromPageView: true });
}

export async function getTexasEvents(): Promise<TexasEvents> {
  "use cache: remote"; // shared by every server (round 563): a fresh server took 3-11 s on Events
  // Exactly one cacheLife call may run per call, so each path sets its own.
  const { data: row, error: readError } = await createAdminClient({ forPage: true }).from("events_sync").select("data, saved_at").eq("id", 1).maybeSingle();
  // A failed read (the database busy past the time limit) is a failure, not "no saved copy yet":
  // never fetch everything from start.gg and keep it for hours because of a slow moment (round 588).
  if (readError) throw new Error(`Saved events unreadable: ${readError.message}`);
  const savedAt = row?.saved_at ? Date.parse(row.saved_at) : 0;
  const now = Date.now();

  let snapshot: Snapshot;
  if (row?.data && now - savedAt < MAX_SNAPSHOT_AGE_MS) {
    cacheLife({ stale: 60, revalidate: 120, expire: 600 }); // re-read the saved copy every couple of minutes
    snapshot = row.data as Snapshot;
  } else {
    snapshot = await fetchFromStartgg();
    // No saved copy yet: ask start.gg directly (slow) and keep the answer a while. An empty answer is
    // most likely a start.gg hiccup (as syncTexasEvents says): kept minutes, not hours (round 636).
    if (snapshot.tournaments.length || snapshot.recent.length) cacheLife("hours");
    else cacheLife("minutes");
  }
  return { tournaments: snapshot.tournaments, expected: predictWeeklies(snapshot.recent, snapshot.tournaments, Math.floor(now / 1000)), recent: finishedThisWeek(snapshot, Math.floor(now / 1000)) };
}

/**
 * A region's events (any region in lib/regions.ts; Texas uses the original saved copy). Other regions
 * are saved in region_events: the first visitor from a new region waits for start.gg once, and the
 * scheduled job keeps regions with members fresh.
 */
export async function getRegionEvents(region: string): Promise<TexasEvents> {
  const events = !isRegion(region) || region === HOME_REGION ? await getTexasEvents() : await readRegionEvents(region);
  // The saved list can be hours old: drop tournaments that have finished since it was saved.
  return { ...events, tournaments: dropFinished(events.tournaments, Math.floor(Date.now() / 1000)) };
}

/**
 * Tournaments that haven't finished yet. Finished = past its end time (or, with no end time, 12 hours
 * after it started), plus a 2-hour grace so a running bracket doesn't vanish early.
 */
export function dropFinished<T extends { startAt: number; endAt: number | null }>(tournaments: T[], nowSec: number): T[] {
  return tournaments.filter((t) => (t.endAt ?? t.startAt + 12 * 3600) + 2 * 3600 > nowSec);
}

async function readRegionEvents(region: string): Promise<TexasEvents> {
  "use cache: remote"; // shared by every server (round 563): a fresh server took 3-11 s on Events
  const db = createAdminClient({ forPage: true }); // reading for a page (round 588)
  const { data: row, error: readError } = await db.from("region_events").select("data, saved_at").eq("region", region).maybeSingle();
  if (readError) throw new Error(`Saved region events unreadable: ${readError.message}`); // as above (round 588)
  const savedAt = row?.saved_at ? Date.parse(row.saved_at) : 0;
  const now = Date.now();
  let snapshot: Snapshot;
  if (row?.data && now - savedAt < MAX_SNAPSHOT_AGE_MS) {
    cacheLife({ stale: 60, revalidate: 120, expire: 600 });
    snapshot = row.data as Snapshot;
  } else {
    // The saved list is old: ask start.gg now. If start.gg is slow or sends nothing back, show the old
    // list (or none) for a couple of minutes instead of failing the page, and try again after that.
    try {
      snapshot = await syncRegionEvents(region);
      cacheLife("hours");
    } catch (e) {
      console.error("Region events refresh failed", region, e instanceof Error ? e.message : e);
      snapshot = (row?.data as Snapshot | undefined) ?? { tournaments: [], recent: [] };
      cacheLife({ stale: 60, revalidate: 120, expire: 600 });
    }
  }
  return { tournaments: snapshot.tournaments, expected: predictWeeklies(snapshot.recent, snapshot.tournaments, Math.floor(now / 1000)), recent: finishedThisWeek(snapshot, Math.floor(now / 1000)) };
}

/**
 * Fetches one region's events from start.gg and saves them. An empty answer when there was a list before
 * is almost certainly a start.gg hiccup: the old list is kept (and returned) instead.
 */
export async function syncRegionEvents(region: string): Promise<Snapshot> {
  const db = createAdminClient();
  const [tournaments, recent] = await Promise.all([getRegionTournaments(region), getRecentRegionTournaments(region)]);
  const now = new Date().toISOString();
  if (!tournaments.length && !recent.length) {
    const { data: old } = await db.from("region_events").select("data").eq("region", region).maybeSingle();
    const prev = old?.data as Snapshot | null;
    if (prev && (prev.tournaments?.length || prev.recent?.length)) {
      await db.from("region_events").update({ last_run: now, running_since: null }).eq("region", region);
      return prev;
    }
  }
  const { error } = await db
    .from("region_events")
    .upsert({ region, data: { tournaments, recent }, saved_at: now, last_run: now, running_since: null }, { onConflict: "region" });
  if (error) console.error("Saving region events failed", region, error.message);
  return { tournaments, recent };
}

/**
 * Page views keep a region's saved list fresh (like Texas): if it's over 3 hours old and nobody else is
 * refreshing it right now, refresh it in the background (call with after()).
 */
export async function refreshRegionIfStale(region: string) {
  if (!isRegion(region) || region === HOME_REGION) return refreshEventsIfStale();
  const db = createAdminClient();
  const due = new Date(Date.now() - EVENTS_REFRESH_MINUTES * 60_000).toISOString();
  const stuck = new Date(Date.now() - 10 * 60_000).toISOString();
  // Claim the refresh (one at a time per region): only rows that are due and not already being refreshed.
  const { data: claimed } = await db
    .from("region_events")
    .update({ running_since: new Date().toISOString() })
    .eq("region", region)
    .lt("last_run", due)
    .or(`running_since.is.null,running_since.lt.${stuck}`)
    .select("region");
  if (!claimed?.length) return;
  try {
    await syncRegionEvents(region);
  } catch (e) {
    // The claim is left in place: it counts as stuck after 10 minutes, and only then do page views
    // try again (not on the very next view while start.gg is failing).
    console.error("Region events refresh failed", region, e instanceof Error ? e.message : e);
  }
}

/**
 * The scheduled job: refreshes the saved events of every region someone on Smashy plays in (Texas has
 * its own job), oldest first, a few per run so the job stays quick.
 */
export async function syncActiveRegions(maxRegions = 20): Promise<number> {
  const db = createAdminClient();
  const { data: people } = await db.from("profiles").select("region").not("region", "is", null).neq("region", HOME_REGION).limit(5000);
  const active = [...new Set((people ?? []).map((p) => p.region as string))].filter(isRegion);
  if (!active.length) return 0;
  const { data: saved } = await db.from("region_events").select("region, saved_at").in("region", active);
  const savedAt = new Map((saved ?? []).map((r) => [r.region as string, r.saved_at ? Date.parse(r.saved_at) : 0]));
  const due = active
    .filter((r) => Date.now() - (savedAt.get(r) ?? 0) > EVENTS_REFRESH_MINUTES * 60_000)
    .sort((a, b) => (savedAt.get(a) ?? 0) - (savedAt.get(b) ?? 0))
    .slice(0, maxRegions);
  for (const region of due) {
    try {
      await syncRegionEvents(region);
    } catch (e) {
      console.error("Region events refresh failed", region, e instanceof Error ? e.message : e);
    }
  }
  return due.length;
}

/**
 * An expected weekly by its id: looked up in Texas first, then in the other regions' saved lists (only
 * ones saved in the last day; this never waits on start.gg, so an old or made-up link is a quick 404).
 */
export async function getExpectedWeekly(id: string): Promise<ExpectedWeekly | null> {
  const { expected } = await getTexasEvents();
  return expected.find((e) => e.id === id) ?? (await findWeeklyInOtherRegions(id));
}

/**
 * The same lookup in the other regions' saved lists. Kept for a couple of minutes like the saved
 * lists themselves (`readRegionEvents`): it reads the clock to work out the next date, and a page
 * can only be prepared ahead of a visit when the clock is read inside a kept answer. Before this,
 * every visit to a weekly outside the home region logged "Next.js encountered the unstable value
 * Date.now() while prerendering" (the page still loaded).
 */
async function findWeeklyInOtherRegions(id: string): Promise<ExpectedWeekly | null> {
  "use cache: remote"; // shared by every server (round 564)
  cacheLife({ stale: 60, revalidate: 120, expire: 600 });
  const now = Date.now();
  const since = new Date(now - MAX_SNAPSHOT_AGE_MS).toISOString();
  const { data: rows, error } = await createAdminClient({ forPage: true }).from("region_events").select("data").not("data", "is", null).gt("saved_at", since).limit(200);
  if (error) throw error; // a busy database isn't "no such weekly", kept for minutes (round 636)
  const nowSec = Math.floor(now / 1000);
  for (const row of rows ?? []) {
    const snap = row.data as Snapshot;
    const found = predictWeeklies(snap.recent ?? [], snap.tournaments ?? [], nowSec).find((e) => e.id === id);
    if (found) return found;
  }
  return null;
}

/** A region's recent (finished) tournaments from the saved copy only: no start.gg request. Empty when none is saved. */
export async function getSavedRecentTournaments(region: string): Promise<SmashyTournament[]> {
  const db = createAdminClient();
  const { data } = !isRegion(region) || region === HOME_REGION
    ? await db.from("events_sync").select("data").eq("id", 1).maybeSingle()
    : await db.from("region_events").select("data").eq("region", region).maybeSingle();
  return ((data?.data as Snapshot | null)?.recent ?? []) as SmashyTournament[];
}

/**
 * Tournaments that finished in the last 7 days: the latest day first and, within a day,
 * the biggest first (a Thursday's 99-player local before its 7-player ones). From the saved past
 * list plus ones that were still upcoming when the list was saved and have ended since.
 */
function finishedThisWeek(snapshot: Snapshot, nowSec: number): SmashyTournament[] {
  const ended = (t: SmashyTournament) => (t.endAt ?? t.startAt + 12 * 3600) < nowSec;
  const byId = new Map<string, SmashyTournament>();
  for (const t of [...(snapshot.recent ?? []), ...(snapshot.tournaments ?? [])]) {
    if (t.startAt > nowSec - 7 * 86400 && ended(t)) byId.set(t.id, t);
  }
  const day = (t: SmashyTournament) => {
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: t.timezone ?? "UTC" }).format(new Date(t.startAt * 1000)); // "2026-11-12", the venue's day
    } catch {
      return new Date(t.startAt * 1000).toISOString().slice(0, 10);
    }
  };
  return [...byId.values()]
    .sort((a, b) => day(b).localeCompare(day(a)) || (b.numAttendees ?? 0) - (a.numAttendees ?? 0) || b.startAt - a.startAt);
}

/**
 * A region's upcoming tournaments from the saved lists only (round 704, for "More smash near" on event
 * pages): never a start.gg request, so a busy event page can't use up start.gg's limit. Texas uses its
 * usual saved copy; another region with nothing saved yet gives an empty list.
 */
export async function getSavedUpcomingTournaments(region: string): Promise<SmashyTournament[]> {
  if (!isRegion(region)) return [];
  const list = region === HOME_REGION ? (await getTexasEvents()).tournaments : await readSavedRegionUpcoming(region);
  return dropFinished(list, Math.floor(Date.now() / 1000));
}

async function readSavedRegionUpcoming(region: string): Promise<SmashyTournament[]> {
  "use cache: remote";
  cacheLife({ stale: 60, revalidate: 300, expire: 1800 });
  const { data, error } = await createAdminClient({ forPage: true }).from("region_events").select("data").eq("region", region).maybeSingle();
  if (error) throw new Error(`Saved region events unreadable: ${error.message}`);
  return ((data?.data as Snapshot | null)?.tournaments ?? []) as SmashyTournament[];
}
