// Smash history: storylines from the records (Matthew, 2026-11-19: "the History tab can also feature
// storylines, memorable moments, and more"). Breakthroughs, the players whose first major win in Smash
// history's records came in a given year, and title defenses, a series won again by its last champion.
// Worked out from the saved results, not written by anyone, so it's facts only; "in Smash history's
// records" because a win at a major the archive lacks would move it.
import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { GameKey } from "./games";
import type { PlayerMajor, Top8Row } from "./majorEvents";
import { startggCharacterKey, tagOnly } from "./majorSets";
import { isSideEvent, pickMainEvent } from "./mainEvent";
import { MAJOR_THRESHOLDS, MAJORS_TAG } from "./majors";
import { linksForGame, nameKey } from "./playerLinks";
import { createAdminClient } from "./supabase/admin";

/** One major's main bracket of a game, with its date. */
export type WinBracket = { majorSlug: string; majorName: string; startAt: string; eventId: string; name: string; entrants: number | null; top8: Top8Row[] };
export type FirstWin = { key: string; playerId: string | null; name: string; majorSlug: string; majorName: string; startAt: string };

/**
 * Each major's main bracket of the game (pickMainEvent), oldest first, for the majors big enough to count:
 * the game's biggest bracket there reached the game's major size. Hand-added ones count whatever their size.
 */
function mainBrackets(brackets: WinBracket[], game: GameKey): WinBracket[] {
  const byMajor = new Map<string, WinBracket[]>();
  for (const b of brackets) if (b.top8[0]?.place === 1) byMajor.set(b.majorSlug, [...(byMajor.get(b.majorSlug) ?? []), b]);
  const out: WinBracket[] = [];
  for (const list of byMajor.values()) {
    const big = list.some((b) => b.eventId.startsWith("manual-") || b.entrants === null || b.entrants >= MAJOR_THRESHOLDS[game]);
    const main = big ? pickMainEvent(list) : undefined;
    if (main) out.push(main);
  }
  return out.sort((x, y) => x.startAt.localeCompare(y.startAt) || x.majorSlug.localeCompare(y.majorSlug));
}

/**
 * Who won a bracket: their start.gg player id, the player an admin linked their tag to, the one start.gg
 * player who placed under that tag in this game, or else their tag (sponsor and capitals ignored).
 */
/**
 * The start.gg player a name (key) stands for in a game's brackets: the one who placed under it, when only one
 * did or one did at least five times as often as all the others together (a stray second account placing once).
 */
export function idForName(brackets: WinBracket[]): (key: string) => string | null {
  const ids = new Map<string, Map<string, number>>();
  for (const b of brackets)
    for (const r of b.top8)
      if (r.playerId) {
        const k = nameKey(tagOnly(r.name));
        const m = ids.get(k) ?? new Map<string, number>();
        ids.set(k, m.set(r.playerId, (m.get(r.playerId) ?? 0) + 1));
      }
  return (k) => {
    const m = ids.get(k);
    if (!m) return null;
    const [[top, n], ...rest] = [...m].sort((x, y) => y[1] - x[1]);
    return n >= 5 * rest.reduce((sum, [, c]) => sum + c, 0) ? top : null;
  };
}

function winnerOf(brackets: WinBracket[], links: Map<string, string>) {
  // Results added by hand name players without an id: a name counts as the start.gg player who placed under
  // it in this game's brackets (Mango is Mang0, 1000; idForName).
  const alias = idForName(brackets);
  // The winner by default; any placing row when given one.
  return (b: WinBracket, row: Top8Row = b.top8[0]) => {
    const name = tagOnly(row.name);
    const playerId = row.playerId ?? links.get(nameKey(name)) ?? alias(nameKey(name));
    return { key: playerId ?? `name:${nameKey(name)}`, playerId, name };
  };
}

type Who = { key: string; playerId: string | null; name: string };
/** Two players who met in grand finals at least twice in a year: winner and runner-up always do. */
export type Rivalry = { a: Who; b: Who; aWins: number; bWins: number; finals: { majorSlug: string; majorName: string; winner: string }[] };

/** The year's grand-final pairings that happened twice or more, most meetings first. */
export function rivalriesIn(brackets: WinBracket[], game: GameKey, links: Map<string, string>, year: number): Rivalry[] {
  const player = winnerOf(brackets, links);
  const pairs = new Map<string, Rivalry>();
  for (const b of mainBrackets(brackets, game)) {
    if (Number(b.startAt.slice(0, 4)) !== year) continue;
    const second = b.top8.filter((r) => r.place === 2);
    if (second.length !== 1) continue; // a tie for 2nd isn't one final
    const w = player(b);
    const l = player(b, second[0]);
    if (w.key === l.key) continue;
    const [a, z] = w.key < l.key ? [w, l] : [l, w];
    const id = `${a.key}|${z.key}`;
    const p = pairs.get(id) ?? { a, b: z, aWins: 0, bWins: 0, finals: [] };
    if (w.key === a.key) p.aWins++;
    else p.bWins++;
    p.finals.push({ majorSlug: b.majorSlug, majorName: b.majorName, winner: w.key });
    pairs.set(id, p);
  }
  return [...pairs.values()]
    .filter((p) => p.finals.length >= 2)
    .map((p) => (p.bWins > p.aWins ? { ...p, a: p.b, b: p.a, aWins: p.bWins, bWins: p.aWins } : p))
    .sort((x, y) => y.finals.length - x.finals.length || y.aWins - x.aWins || x.a.name.localeCompare(y.a.name));
}

/** Each winner's first major win, oldest first. */
export function firstWins(brackets: WinBracket[], game: GameKey, links: Map<string, string>): FirstWin[] {
  const winner = winnerOf(brackets, links);
  const first = new Map<string, FirstWin>();
  for (const b of mainBrackets(brackets, game)) {
    const w = winner(b);
    if (!first.has(w.key)) first.set(w.key, { ...w, majorSlug: b.majorSlug, majorName: b.majorName, startAt: b.startAt });
  }
  return [...first.values()];
}

/**
 * A tournament series: the name up to its edition (a number, a year, a roman numeral, "X2", "#11", or a
 * leading "10th"), without punctuation or spaces: "GENESIS", "Genesis 9" and "Genesis X2" are one series,
 * as are "Tipped Off 17: Haunted", "Smash'N'Splash 3", "Smash 'N' Splash 2" and "篝火#11/KAGARIBI#11".
 */
export function seriesOf(name: string): string {
  // A subtitle after " - " isn't part of the series ("Smash Summit - Spring 2017", "Glitch - Regen"), nor is
  // a leading edition ("10th Kanto") or year ("2005 MLG National Championships").
  const base = name.split(" - ")[0].toLowerCase().replace(/#/g, " ").replace(/\s+/g, " ").trim().replace(/^(\d+(st|nd|rd|th)|(19|20)\d\d) /, "");
  const cut = base.match(/^(.+?) (\d{1,4}(\.\d)?|[ivx]{1,5}|x\d{1,2})(?=$|[\s:,/!-])/u);
  const key = (cut ? cut[1] : base).replace(/[^\p{L}\p{N}]/gu, "");
  return SERIES_RENAMED[key] ?? key;
}

/** Tournaments that changed their name between editions, joined to one series. */
const SERIES_RENAMED: Record<string, string> = {
  lowtidecity: "lowtiercity", // Low Tier City became Low Tide City (2021)
  kumiteintexaslowtiercity: "lowtiercity", // Low Tier City 6, run with Kumite in Texas
  thebiggerbalc: "thebigbalc",
  theevenbiggerbalc: "thebigbalc",
  thebiggermilehighclub: "milehighclub",
  luminositymakesbigmoves: "letsmakebigmoves", // Let's Make Big Moves, renamed from 2024
  ubcesportspresentsbattleofbc: "battleofbc",
  evoworld: "evo", // EVO 2007 was "EVO World"
  mlgnationalchampionship: "mlgnationalchampionships",
};

/** A winner who also won the series' previous edition; `streak` counts the editions won in a row. */
export type Defense = FirstWin & { previousSlug: string; previousName: string; streak: number };

/** Every title defense in a game, oldest first. Two majors of a series on the same day aren't editions. */
export function titleDefenses(brackets: WinBracket[], game: GameKey, links: Map<string, string>): Defense[] {
  const winner = winnerOf(brackets, links);
  const last = new Map<string, { key: string; slug: string; name: string; day: string; streak: number }>();
  const out: Defense[] = [];
  for (const b of mainBrackets(brackets, game)) {
    const series = seriesOf(b.majorName);
    const day = b.startAt.slice(0, 10);
    const prev = last.get(series);
    if (prev?.day === day) continue;
    const w = winner(b);
    const streak = prev?.key === w.key ? prev.streak + 1 : 1;
    if (prev && streak > 1)
      out.push({ ...w, majorSlug: b.majorSlug, majorName: b.majorName, startAt: b.startAt, previousSlug: prev.slug, previousName: prev.name, streak });
    last.set(series, { key: w.key, slug: b.majorSlug, name: b.majorName, day, streak });
  }
  return out;
}

/** A major win that came at least two years after the player's previous one. */
export type Return = FirstWin & { previousSlug: string; previousName: string; previousAt: string };
export const RETURN_GAP_DAYS = 730;

/** Every return in a game, oldest first: a winner whose last major win was two years or more before. */
export function majorReturns(brackets: WinBracket[], game: GameKey, links: Map<string, string>): Return[] {
  const winner = winnerOf(brackets, links);
  const last = new Map<string, WinBracket>();
  const out: Return[] = [];
  for (const b of mainBrackets(brackets, game)) {
    const w = winner(b);
    const prev = last.get(w.key);
    if (prev && Date.parse(b.startAt) - Date.parse(prev.startAt) >= RETURN_GAP_DAYS * 86400_000)
      out.push({ ...w, majorSlug: b.majorSlug, majorName: b.majorName, startAt: b.startAt, previousSlug: prev.majorSlug, previousName: prev.majorName, previousAt: prev.startAt });
    last.set(w.key, b);
  }
  return out;
}

/** Every saved main bracket of a game (all years), shared by every server and refreshed every few hours. */
export async function winBrackets(game: GameKey): Promise<WinBracket[]> {
  "use cache: remote";
  cacheLife("hours");
  cacheTag(MAJORS_TAG); // round 634
  const db = createAdminClient();
  const [{ data: events, error }, { data: majors, error: majorsError }] = await Promise.all([
    db.from("major_events").select("major_slug, event_id, name, entrants, top8").eq("game", game).eq("teams", false).eq("online", false).limit(20000),
    db.from("majors").select("slug, name, start_at").eq("hidden", false).limit(20000),
  ]);
  if (error) throw error;
  if (majorsError) throw majorsError;
  const bySlug = new Map((majors ?? []).map((m) => [m.slug as string, m]));
  return (events ?? []).flatMap((e) => {
    const m = bySlug.get(e.major_slug as string);
    return m
      ? [{ majorSlug: m.slug as string, majorName: m.name as string, startAt: m.start_at as string, eventId: e.event_id as string, name: (e.name ?? "") as string, entrants: e.entrants as number | null, top8: (e.top8 ?? []) as Top8Row[] }]
      : [];
  });
}

/**
 * The first major wins that came in a year, in date order. None for the first year a game has records
 * (every win there is a first).
 */
export function firstWinsIn(all: FirstWin[], year: number): FirstWin[] {
  if (!all.length) return [];
  const firstYear = Number(all[0].startAt.slice(0, 4));
  if (year <= firstYear) return [];
  return all.filter((w) => Number(w.startAt.slice(0, 4)) === year);
}

/** The title defenses that came in a year, in date order. */
export const defensesIn = (all: Defense[], year: number): Defense[] => all.filter((d) => Number(d.startAt.slice(0, 4)) === year);

/** All-time records of a game (the records page): most major wins, longest title runs, longest returns. */
export type WinCount = { key: string; playerId: string | null; name: string; wins: number; firstAt: string; lastAt: string };
export type Top8Count = { key: string; playerId: string | null; name: string; top8s: number; firstAt: string; lastAt: string };
export type Records = { wins: WinCount[]; top8s: Top8Count[]; runs: Defense[]; returns: Return[] };
export const RECORDS_SHOWN = 10;

export function gameRecords(brackets: WinBracket[], game: GameKey, links: Map<string, string>): Records {
  const winner = winnerOf(brackets, links);
  const counts = new Map<string, WinCount>();
  for (const b of mainBrackets(brackets, game)) {
    const w = winner(b);
    const had = counts.get(w.key);
    if (had) Object.assign(had, { wins: had.wins + 1, lastAt: b.startAt, name: w.name, playerId: had.playerId ?? w.playerId });
    else counts.set(w.key, { ...w, wins: 1, firstAt: b.startAt, lastAt: b.startAt });
  }
  // Top 8 finishes: every placing of 8th or better in a main bracket, once per major.
  const top8s = new Map<string, Top8Count>();
  for (const b of mainBrackets(brackets, game)) {
    const seen = new Set<string>();
    for (const row of b.top8) {
      if (row.place > 8) continue;
      const p = winner(b, row);
      if (seen.has(p.key)) continue;
      seen.add(p.key);
      const had = top8s.get(p.key);
      if (had) Object.assign(had, { top8s: had.top8s + 1, lastAt: b.startAt, name: p.name, playerId: had.playerId ?? p.playerId });
      else top8s.set(p.key, { ...p, top8s: 1, firstAt: b.startAt, lastAt: b.startAt });
    }
  }
  // A run counts once, at its longest (Armada's three Smash Summits, not also his first two).
  const longest = new Map<string, Defense>();
  for (const d of titleDefenses(brackets, game, links)) {
    const run = `${d.key}|${seriesOf(d.majorName)}`;
    const had = longest.get(run);
    if (!had || d.streak > had.streak) longest.set(run, d);
  }
  const gap = (r: Return) => Date.parse(r.startAt) - Date.parse(r.previousAt);
  return {
    wins: [...counts.values()].sort((a, b) => b.wins - a.wins || a.firstAt.localeCompare(b.firstAt)),
    top8s: [...top8s.values()].sort((a, b) => b.top8s - a.top8s || a.firstAt.localeCompare(b.firstAt)),
    runs: [...longest.values()].filter((d) => d.streak >= 3).sort((a, b) => b.streak - a.streak || a.startAt.localeCompare(b.startAt)),
    returns: majorReturns(brackets, game, links).sort((a, b) => gap(b) - gap(a)),
  };
}

/** A player's milestones in one game (player pages): wins, the first, the longest run and the longest wait. */
export type Milestone = { game: GameKey; wins: number; first: FirstWin | null; run: Defense | null; wait: Return | null };

export function playerMilestone(brackets: WinBracket[], game: GameKey, links: Map<string, string>, playerId: string): Milestone | null {
  const records = gameRecords(brackets, game, links);
  const mine = <W extends { playerId: string | null }>(list: W[]) => list.filter((w) => w.playerId === playerId);
  const wins = mine(records.wins)[0];
  if (!wins) return null;
  const run = mine(titleDefenses(brackets, game, links)).sort((a, b) => b.streak - a.streak || a.startAt.localeCompare(b.startAt))[0] ?? null;
  return { game, wins: wins.wins, first: mine(firstWins(brackets, game, links))[0] ?? null, run, wait: mine(records.returns)[0] ?? null };
}

/**
 * A player's placings in results added by hand (no start.gg id), matched to them the way storylines match
 * winners: an admin's link, or the name they placed under at start.gg majors of this game (player pages).
 */
export function handAddedPlacings(brackets: WinBracket[], game: GameKey, links: Map<string, string>, playerId: string): PlayerMajor[] {
  const who = winnerOf(brackets, links);
  const out: PlayerMajor[] = [];
  for (const b of brackets) {
    if (!b.eventId.startsWith("manual-")) continue;
    for (const row of b.top8)
      if (!row.playerId && who(b, row).playerId === playerId)
        out.push({ slug: b.majorSlug, majorName: b.majorName, startAt: b.startAt, game, eventName: b.name, entrants: b.entrants, place: row.place, side: isSideEvent(b.name), eventId: b.eventId, characters: row.characters });
  }
  return out;
}

/** The names (keys) a player placed under at this game's majors, plus names an admin linked to them. */
export function playerNameKeys(brackets: WinBracket[], links: Map<string, string>, playerId: string): Set<string> {
  const out = new Set<string>();
  for (const b of brackets) for (const r of b.top8) if (r.playerId === playerId) out.add(nameKey(tagOnly(r.name)));
  for (const [k, id] of links) if (id === playerId) out.add(k);
  return out;
}

/** A placing under a name that isn't any start.gg player's (no id, no link, no clear match): the name pages. */
export type NamePlacing = PlayerMajor & { name: string; eventId: string; characters?: string[] };

/**
 * Every placing in a game under a name key that no start.gg player stands for, one per major (its best,
 * main brackets before side events), newest first. ZeRo's Smash 4 years, Ken's Melee ones.
 */
export function namePlacings(brackets: WinBracket[], game: GameKey, links: Map<string, string>, key: string): NamePlacing[] {
  const who = winnerOf(brackets, links);
  const best = new Map<string, NamePlacing>();
  for (const b of brackets)
    for (const row of b.top8) {
      if (row.playerId || nameKey(tagOnly(row.name)) !== key || who(b, row).playerId) continue;
      const p: NamePlacing = { slug: b.majorSlug, majorName: b.majorName, startAt: b.startAt, game, eventName: b.name, entrants: b.entrants, place: row.place, side: isSideEvent(b.name), name: tagOnly(row.name), eventId: b.eventId, characters: row.characters };
      const had = best.get(b.majorSlug);
      if (!had || (Number(p.side) - Number(had.side) || p.place - had.place) < 0) best.set(b.majorSlug, p);
    }
  return [...best.values()].sort((a, b) => b.startAt.localeCompare(a.startAt));
}

/** The page of a name no start.gg player stands for (src/app/history/name). */
export const nameHref = (name: string) => `/history/name/${encodeURIComponent(nameKey(tagOnly(name)))}`;

/** The name keys in a game's brackets that no start.gg player stands for (those with a name page). */
export function unlinkedNameKeys(brackets: WinBracket[], links: Map<string, string>): Set<string> {
  const who = winnerOf(brackets, links);
  const out = new Set<string>();
  for (const b of brackets) for (const row of b.top8) if (!row.playerId && !who(b, row).playerId) out.add(nameKey(tagOnly(row.name)));
  return out;
}

/** A name page a search can find: its tag, the games it has placings in and how many. */
export type HistoryNameHit = { key: string; name: string; games: GameKey[]; placings: number };

/**
 * Name pages whose tag matches a search (the whole tag, or its start for 3 letters or more), most placings
 * first: so "zero" finds Smash 4's ZeRo and "azen" finds Azen, who have no start.gg account.
 */
export async function searchHistoryNames(query: string, games: readonly GameKey[], getLinks: () => Promise<Map<string, string>>, limit = 5): Promise<HistoryNameHit[]> {
  const q = nameKey(tagOnly(query));
  if (q.length < 2) return [];
  const links = await getLinks().catch(() => new Map<string, string>());
  const hits = new Map<string, HistoryNameHit & { names: Map<string, number> }>();
  for (const game of games) {
    const brackets = await winBrackets(game).catch(() => []);
    const who = winnerOf(brackets, linksForGame(links, game));
    for (const b of brackets)
      for (const row of b.top8) {
        if (row.playerId || row.name.includes(" / ")) continue; // a doubles pair saved in a singles list
        const key = nameKey(tagOnly(row.name));
        if (!(key === q || (q.length >= 3 && key.startsWith(q))) || who(b, row).playerId) continue;
        const h = hits.get(key) ?? { key, name: "", games: [] as GameKey[], placings: 0, names: new Map<string, number>() };
        if (!h.games.includes(game)) h.games.push(game);
        h.placings++;
        const name = tagOnly(row.name);
        h.names.set(name, (h.names.get(name) ?? 0) + 1);
        hits.set(key, h);
      }
  }
  return [...hits.values()]
    .map(({ names, ...h }) => ({ ...h, name: [...names].sort((a, b) => b[1] - a[1])[0][0] }))
    .sort((a, b) => Number(b.key === q) - Number(a.key === q) || b.placings - a.placings)
    .slice(0, limit);
}

/** The characters a name played most across its placings (each placing counts each character once), most first. */
export function mostPlayedIn(placings: { characters?: string[] }[], max = 3): string[] {
  const n = new Map<string, number>();
  for (const p of placings) for (const c of new Set(p.characters ?? [])) n.set(c, (n.get(c) ?? 0) + 1);
  return [...n].sort((a, b) => b[1] - a[1]).slice(0, max).map(([c]) => c);
}

/** A major a game's winner won, with the characters they played there (where known). */
export type CharacterWin = { majorSlug: string; majorName: string; startAt: string; key: string; playerId: string | null; name: string; characters: string[] };

/**
 * Every major win in a game whose characters are known: a hand-added result's own (SmashWiki), else the sets
 * start.gg recorded for that bracket. Shared by every server, refreshed every few hours (character pages).
 */
export async function characterWins(game: GameKey): Promise<{ wins: CharacterWin[]; majors: number }> {
  "use cache: remote";
  cacheLife("hours");
  cacheTag(MAJORS_TAG); // round 634
  const { brackets, links, sets } = await characterSources(game);
  const winner = winnerOf(brackets, links);
  const main = mainBrackets(brackets, game);
  const wins: CharacterWin[] = [];
  for (const b of main) {
    const w = winner(b);
    // Only the character the winner played most there (the lists are most-played first). Round 874: counting
    // every character played gave Armada 12 Fox major wins and Ken a "first Fox win", which Melee players read
    // as wrong stats.
    const characters = rowCharacters(b, b.top8[0], w.playerId, sets).slice(0, 1);
    if (characters.length) wins.push({ majorSlug: b.majorSlug, majorName: b.majorName, startAt: b.startAt, ...w, characters });
  }
  return { wins, majors: main.length };
}

/** A top 8 row's characters: the row's own (SmashWiki), else the sets start.gg saved for that bracket. */
function rowCharacters(b: WinBracket, row: Top8Row, playerId: string | null, sets: Map<string, Record<string, string[]>>): string[] {
  const fromSets = sets.get(`${b.majorSlug}|${b.eventId}`);
  return row.characters ?? (playerId ? fromSets?.[playerId] : undefined) ?? fromSets?.[`name:${nameKey(tagOnly(row.name))}`] ?? [];
}

/** A game's brackets, its name links and the characters saved from start.gg's sets (admin client: cached callers). */
async function characterSources(game: GameKey) {
  const db = createAdminClient();
  const [brackets, progress, linkRows] = await Promise.all([
    winBrackets(game),
    db.from("major_set_progress").select("major_slug, event_id, characters").not("done_at", "is", null).limit(5000),
    db.from("player_name_links").select("name_key, player_id, game").limit(5000),
  ]);
  if (progress.error) throw progress.error;
  const links = linksForGame(new Map((linkRows.data ?? []).map((r) => [r.game ? `${r.game}:${r.name_key}` : (r.name_key as string), r.player_id as string])), game);
  const sets = new Map((progress.data ?? []).map((r) => [`${r.major_slug}|${r.event_id}`, (r.characters ?? {}) as Record<string, string[]>]));
  return { brackets, links, sets };
}

/** A major's main bracket with each top 8 placing's characters ([] where unknown). */
export type MajorTop8Characters = { majorSlug: string; startAt: string; rows: string[][] };

/** Every major's top 8 characters in a game (characterWins' sources, every placing). Shared, refreshed every few hours. */
export async function top8Characters(game: GameKey): Promise<MajorTop8Characters[]> {
  "use cache: remote";
  cacheLife("hours");
  cacheTag(MAJORS_TAG); // round 634
  const { brackets, links, sets } = await characterSources(game);
  const who = winnerOf(brackets, links);
  return mainBrackets(brackets, game).map((b) => ({
    majorSlug: b.majorSlug,
    startAt: b.startAt,
    rows: b.top8.filter((r) => r.place <= 8 && !r.name.includes(" / ")).map((r) => rowCharacters(b, r, who(b, r).playerId, sets)),
  }));
}

/**
 * A year's top 8 characters: how many top 8 placings each was played in (a placing counts each character once),
 * most first, and how many of the year's placings had their characters known.
 */
export function yearCharacters(majors: MajorTop8Characters[], year: number) {
  return countCharacters(majors.filter((m) => Number(m.startAt.slice(0, 4)) === year));
}

/** yearCharacters for any set of majors (every year: the records page). */
export function countCharacters(majors: MajorTop8Characters[]) {
  const counts = new Map<string, { key: string; name: string; n: number }>();
  let placings = 0;
  let known = 0;
  let majorCount = 0;
  for (const m of majors) {
    majorCount++;
    for (const chars of m.rows) {
      placings++;
      if (chars.length) known++;
      // One count per character per placing, whichever source spelled it (SmashWiki's or start.gg's).
      for (const key of new Set(chars.map((c) => startggCharacterKey(c)))) {
        const had = counts.get(key);
        counts.set(key, { key, name: had?.name ?? chars.find((c) => startggCharacterKey(c) === key)!, n: (had?.n ?? 0) + 1 });
      }
    }
  }
  const characters = [...counts.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
  return { characters, placings, known, majors: majorCount };
}

/**
 * One character's share of each year's major top 8 placings, for the years where at least 8 placings, and at
 * least half of them, have known characters (yearCharacters' rule), oldest first.
 */
export function characterByYear(majors: MajorTop8Characters[], character: string) {
  const years = [...new Set(majors.map((m) => Number(m.startAt.slice(0, 4))))].sort((a, b) => a - b);
  return years.flatMap((year) => {
    const y = yearCharacters(majors, year);
    if (y.known < 8 || y.known * 2 < y.placings) return [];
    return [{ year, n: y.characters.find((c) => c.key === character)?.n ?? 0, known: y.known }];
  });
}

/** Each character's first major win in the records (characterWins is oldest first), keyed by character. */
export function firstCharacterWins(wins: CharacterWin[]): Map<string, CharacterWin> {
  const firsts = new Map<string, CharacterWin>();
  for (const w of [...wins].sort((a, b) => a.startAt.localeCompare(b.startAt)))
    for (const key of new Set(w.characters.map((c) => startggCharacterKey(c)))) if (!firsts.has(key)) firsts.set(key, w);
  return firsts;
}
