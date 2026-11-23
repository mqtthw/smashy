// Smash history, step A3 (docs/archive-plan.md): majors from before start.gg (1999 to 2016), added by
// hand by site admins. Facts only (name, dates, place, games, entrants, top 8) with a link to where the
// results come from; no copied text. Saved in `majors` (source 'manual', slug "manual/<year>-<name>")
// and `major_events`, so Smash history lists them with the rest. Project M brackets are filed under
// P+ (Matthew, 2026-11-16), keeping their own event name ("Project M Singles").
import "server-only";
import { connection } from "next/server";
import { GAMES, isGameKey, type GameKey } from "./games";
import type { MessageKey, Values } from "./i18n/core";
import type { MajorEvent, Top8Row } from "./majorEvents";
import { ARCHIVE_FIRST_YEAR, type Major } from "./majors";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";

export const MANUAL_PREFIX = "manual/";
export const isManualMajor = (slug: string) => slug.startsWith(MANUAL_PREFIX);
/** A bracket added by hand (from Liquipedia): every bracket of a hand-added major, and "manual-" ones a start.gg major gained. */
export const isManualEvent = (slug: string, eventId: string) => isManualMajor(slug) || eventId.startsWith("manual-");
/** Where a major opens: hand-added ones have their own page; the rest open the tournament page. */
export const majorHref = (slug: string) => (isManualMajor(slug) ? `/history/major/${slug.slice(MANUAL_PREFIX.length)}` : `/events/${slug}`);

export const HAND_FIRST_YEAR = 1999; // Smash 64's release
export const HAND_GAME_BLOCKS = 3; // games per form (most old majors ran up to three Smash games)
// Places for a double-elimination top 8 written one name per line: 5th and 7th are ties.
const TOP8_PLACES = [1, 2, 3, 4, 5, 5, 7, 7];

/**
 * "1. Ken\n2) Isai\nAzen" → top 8 rows. A place typed at the start of a line ("6 Shroomed", "5th Hax")
 * is kept; a line without one gets the usual double-elimination place for its position (1, 2, 3, 4,
 * 5, 5, 7, 7). A name that starts with a digit ("6WX", "9B") stays whole.
 */
export function parseTop8(text: string): Top8Row[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((line, i) => {
      const m = line.match(/^(\d{1,2})\s*(?:st|nd|rd|th)?\s*[.):-]?\s+(\S.*)$/i);
      const place = m && Number(m[1]) >= 1 && Number(m[1]) <= 8 ? Number(m[1]) : TOP8_PLACES[i];
      return { place, name: (m ? m[2] : line).trim().slice(0, 60), playerId: null };
    });
}

/** "Evo World 2007" on 2007-08-17 → "manual/2007-evo-world-2007". */
export function manualSlug(name: string, startDate: string): string {
  const words = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${MANUAL_PREFIX}${startDate.slice(0, 4)}-${words || "major"}`;
}

export type HandMajorInput = {
  name: string;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD, or "" for a one-day major
  city: string;
  country: string; // two letters, or ""
  sourceUrl: string;
  games: { game: string; eventName: string; entrants: string; top8: string }[];
};

type Checked = {
  slug: string;
  row: Record<string, unknown>;
  events: Omit<MajorEvent, "majorSlug">[];
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** What's wrong with a hand-added major, as a phrase (the admin form and the public suggestion form show it). */
export type HandProblem = { key: MessageKey; values?: Values };

/** Checks a hand-added major. Returns the rows to save, or what's wrong. */
export function checkHandMajor(input: HandMajorInput): Checked | { error: HandProblem } {
  const name = input.name.trim().slice(0, 120);
  if (!name) return { error: { key: "history.err.name" } };
  if (!DATE.test(input.start) || Number.isNaN(Date.parse(input.start))) return { error: { key: "history.err.start" } };
  const end = input.end || input.start;
  if (!DATE.test(end) || end < input.start) return { error: { key: "history.err.end" } };
  const year = Number(input.start.slice(0, 4));
  if (year < HAND_FIRST_YEAR || year >= ARCHIVE_FIRST_YEAR) {
    return { error: { key: "history.err.years", values: { first: HAND_FIRST_YEAR, last: ARCHIVE_FIRST_YEAR - 1 } } };
  }
  let source: URL;
  try {
    source = new URL(input.sourceUrl.trim());
  } catch {
    return { error: { key: "history.err.source" } };
  }
  if (source.protocol !== "https:") return { error: { key: "history.err.sourceHttps" } };
  const country = input.country.trim().toUpperCase();
  if (country && !/^[A-Z]{2}$/.test(country)) return { error: { key: "history.err.country" } };

  const events: Omit<MajorEvent, "majorSlug">[] = [];
  for (const [i, g] of input.games.entries()) {
    const top8 = parseTop8(g.top8);
    if (!g.game && !top8.length) continue;
    if (!isGameKey(g.game)) return { error: { key: "history.err.pickGame", values: { n: i + 1 } } };
    if (!top8.length) return { error: { key: "history.err.top8", values: { game: GAMES[g.game].short } } };
    const entrants = g.entrants.trim() ? Number(g.entrants) : null;
    if (entrants !== null && (!Number.isInteger(entrants) || entrants < 2 || entrants > 10000)) return { error: { key: "history.err.entrants", values: { game: GAMES[g.game].short } } };
    const game: GameKey = g.game;
    events.push({ eventId: `manual-${game}-${i + 1}`, game, name: g.eventName.trim().slice(0, 80) || `${GAMES[game].short} Singles`, entrants, teams: false, online: false, top8 });
  }
  if (!events.length) return { error: { key: "history.err.noGames" } };

  const slug = manualSlug(name, input.start);
  const games = [...new Set(events.map((e) => e.game))];
  return {
    slug,
    events,
    row: {
      slug,
      name,
      // Noon UTC on the first day, and the end of the last day: dates read the same everywhere.
      start_at: `${input.start}T12:00:00Z`,
      end_at: new Date(Date.parse(`${end}T00:00:00Z`) + 86400_000).toISOString(),
      games,
      entrants: Math.max(0, ...events.map((e) => e.entrants ?? 0)) || null,
      city: input.city.trim().slice(0, 80) || null,
      country: country || null,
      source: "manual",
      source_url: source.toString(),
      results_saved_at: new Date().toISOString(),
    },
  };
}

/** Saves a hand-added major (the caller has checked the admin). `suggestedBy`: the member whose suggestion this was. */
export async function addHandMajor(input: HandMajorInput, adminId: string, suggestedBy: string | null = null): Promise<{ ok?: boolean; slug?: string; error?: HandProblem }> {
  const checked = checkHandMajor(input);
  if ("error" in checked) return checked;
  const db = createAdminClient();
  const { data: existing } = await db.from("majors").select("slug").eq("slug", checked.slug).maybeSingle();
  if (existing) return { error: { key: "history.err.exists" } };
  const { error } = await db.from("majors").insert({ ...checked.row, added_by: adminId, suggested_by: suggestedBy, live_notified_at: new Date().toISOString() } as never); // checkHandMajor's row: its fields are checked there
  if (error) return { error: { key: "history.err.saveFailed" } };
  const { error: eventsError } = await db.from("major_events").insert(
    checked.events.map((e) => ({ major_slug: checked.slug, event_id: e.eventId, game: e.game, name: e.name, entrants: e.entrants, teams: e.teams, online: e.online, top8: e.top8 })),
  );
  if (eventsError) {
    await db.from("majors").delete().eq("slug", checked.slug);
    return { error: { key: "history.err.saveFailed" } };
  }
  return { ok: true, slug: checked.slug };
}

/** The most game blocks an edit form shows (Apex 2015 has four games; one more is left empty). */
export const HAND_MAX_BLOCKS = 6;

/** A hand-added major as the edit form fills it in (the top 8 written "1 Name" per line). */
export async function getHandMajorForEdit(id: string): Promise<(HandMajorInput & { slug: string }) | null> {
  await connection();
  const slug = MANUAL_PREFIX + id;
  const db = createAdminClient();
  const [{ data: m }, { data: events }] = await Promise.all([
    db.from("majors").select("slug, name, start_at, end_at, city, country, source_url").eq("slug", slug).eq("source", "manual").maybeSingle(),
    db.from("major_events").select("event_id, game, name, entrants, top8").eq("major_slug", slug),
  ]);
  if (!m) return null;
  const start = String(m.start_at).slice(0, 10);
  const lastDay = new Date(Date.parse(m.end_at as string) - 86400_000).toISOString().slice(0, 10);
  const order = (id: string) => Number(id.match(/-(\d+)$/)?.[1] ?? 0);
  return {
    slug,
    name: m.name as string,
    start,
    end: lastDay > start ? lastDay : "",
    city: (m.city as string | null) ?? "",
    country: (m.country as string | null) ?? "",
    sourceUrl: (m.source_url as string | null) ?? "",
    games: (events ?? [])
      .sort((a, b) => order(a.event_id as string) - order(b.event_id as string))
      .map((e) => ({
        game: e.game as string,
        eventName: e.name as string,
        entrants: e.entrants === null ? "" : String(e.entrants),
        top8: ((e.top8 as Top8Row[]) ?? []).map((r) => `${r.place} ${r.name}`).join("\n"),
      })),
  };
}

/**
 * Saves changes to a hand-added major (the caller has checked the admin): its details and every game's
 * results. It keeps its address (slug) even if the name or year changes, so links to it still work.
 */
export async function updateHandMajor(slug: string, input: HandMajorInput): Promise<{ ok?: boolean; error?: HandProblem }> {
  if (!isManualMajor(slug)) return { error: { key: "history.err.saveFailed" } };
  const checked = checkHandMajor(input);
  if ("error" in checked) return checked;
  const db = createAdminClient();
  const r = checked.row;
  const row = { name: r.name, start_at: r.start_at, end_at: r.end_at, games: r.games, entrants: r.entrants, city: r.city, country: r.country, source_url: r.source_url };
  const { data: updated, error } = await db.from("majors").update(row as never).eq("slug", slug).eq("source", "manual").select("slug");
  if (error || !updated?.length) return { error: { key: "history.err.saveFailed" } };
  // The edit form has no characters: keep the ones saved for a place and name that stay the same.
  const { data: before } = await db.from("major_events").select("game, top8").eq("major_slug", slug).like("event_id", "manual-%");
  const kept = new Map<string, string[]>();
  for (const e of before ?? []) for (const x of (e.top8 as Top8Row[]) ?? []) if (x.characters?.length) kept.set(keepKey(e.game as string, x), x.characters);
  // Brackets are updated in place, not deleted and added again: deleting one also deletes its sets read from
  // Liquipedia (major_sets; round 734). Only brackets the form no longer has are removed.
  const { error: upError } = await db.from("major_events").upsert(
    checked.events.map((e) => ({
      major_slug: slug, event_id: e.eventId, game: e.game, name: e.name, entrants: e.entrants, teams: e.teams, online: e.online,
      top8: e.top8.map((x) => (kept.has(keepKey(e.game, x)) ? { ...x, characters: kept.get(keepKey(e.game, x)) } : x)),
    })),
    { onConflict: "major_slug,event_id" },
  );
  if (upError) return { error: { key: "history.err.saveFailed" } };
  const keep = checked.events.map((e) => e.eventId);
  const { error: delError } = await db.from("major_events").delete().eq("major_slug", slug).like("event_id", "manual-%").not("event_id", "in", `(${keep.join(",")})`);
  return delError ? { error: { key: "history.err.saveFailed" } } : { ok: true };
}

/** A placing's identity across an edit: game, place and name (capitals and spacing ignored). */
export const keepKey = (game: string, row: Top8Row) => `${game}|${row.place}|${row.name.toLowerCase().replace(/s+/g, "")}`;

/** Removes a hand-added major and its results (start.gg majors are hidden instead, never deleted). */
export async function deleteHandMajor(slug: string) {
  if (!isManualMajor(slug)) return;
  const { error } = await createAdminClient().from("majors").delete().eq("slug", slug).eq("source", "manual");
  if (error) throw error;
}

/** Admin list: every hand-added major, oldest first. */
export async function listHandMajors(): Promise<{ slug: string; name: string; startAt: string; games: GameKey[] }[]> {
  await connection();
  const { data, error } = await createAdminClient().from("majors").select("slug, name, start_at, games").eq("source", "manual").order("start_at").limit(500);
  if (error) throw error;
  return (data ?? []).map((r) => ({ slug: r.slug, name: r.name, startAt: r.start_at, games: r.games as GameKey[] }));
}

export type HandMajor = Major & { sourceUrl: string | null; addedBy: string | null; suggestedBy: string | null };

/** A hand-added major for its page (null if there's none, or it's hidden). */
export async function getHandMajor(id: string): Promise<HandMajor | null> {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase
    .from("majors")
    .select("slug, name, start_at, end_at, games, entrants, city, country, timezone, source_url, added_by, suggested_by, hidden")
    .eq("slug", MANUAL_PREFIX + id)
    .eq("hidden", false)
    .maybeSingle();
  if (!data) return null;
  // Profiles follow their own privacy (a teen's isn't shown to guests): no name then.
  const handleOf = async (id: string | null) =>
    id ? (((await supabase.from("profiles").select("handle").eq("id", id).maybeSingle()).data?.handle as string | undefined) ?? null) : null;
  const [addedBy, suggestedBy] = await Promise.all([handleOf(data.added_by), handleOf(data.suggested_by)]);
  return {
    slug: data.slug,
    name: data.name,
    startAt: data.start_at,
    endAt: data.end_at,
    games: data.games as GameKey[],
    entrants: data.entrants,
    city: data.city,
    country: data.country,
    imageUrl: null,
    stream: null,
    source: "manual",
    hidden: false,
    live: false,
    timezone: data.timezone ?? null,
    sourceUrl: data.source_url,
    addedBy,
    suggestedBy,
  };
}
