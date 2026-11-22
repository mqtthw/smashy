// Smash history: a year's head-to-head grid among the top players at majors, the kind ranking voters
// keep by hand (e.g. the community's SSBMRank head-to-head sheets; Matthew, 2026-11-19). Counted from the
// sets saved at that year's majors (major_sets): facts only, no verdicts. The grid logic is plain (tested).
import "server-only";
import type { GameKey } from "./games";
import type { MajorEvent } from "./majorEvents";
import { sideId, tagOnly } from "./majorSets";
import { applyNameLinks, getNameLinks, linksForGame } from "./playerLinks";
import { playersHidingStats } from "./playerStats";
import { createClient } from "./supabase/server";
import { MAJOR_THRESHOLDS, getPastMajors } from "./majors";
import { getMajorEvents } from "./majorEvents";
import { yearTally } from "./yearTally";

export const GRID_PLAYERS = 12;

export type GridSet = {
  set_id: string;
  major_slug: string;
  round: string | null;
  sort_order: number;
  p1_id: string | null;
  p1_name: string;
  p1_score: number | null;
  p2_id: string | null;
  p2_name: string;
  p2_score: number | null;
  winner: 1 | 2;
};
export type GridPlayer = { playerId: string; name: string };
/** `cells[a][b]`: a's wins and losses against b (empty when they never played). */
export type Grid = {
  players: GridPlayer[];
  cells: Record<string, Record<string, { wins: number; losses: number }>>;
  totals: Record<string, { wins: number; losses: number }>;
  sets: number; // sets between two of these players
};

/** Counts the sets between the given players (by start.gg id, or a tag an admin linked to one). */
export function yearGrid(players: GridPlayer[], sets: GridSet[], links: Map<string, string>): Grid {
  const ids = new Set(players.map((p) => p.playerId));
  const cells: Grid["cells"] = {};
  const totals: Grid["totals"] = {};
  for (const p of players) {
    cells[p.playerId] = {};
    totals[p.playerId] = { wins: 0, losses: 0 };
  }
  let counted = 0;
  for (const s of sets) {
    const a = sideId(s.p1_id, s.p1_name, links);
    const b = sideId(s.p2_id, s.p2_name, links);
    if (!a || !b || a === b || !ids.has(a) || !ids.has(b)) continue;
    const [w, l] = s.winner === 1 ? [a, b] : [b, a];
    (cells[w][l] ??= { wins: 0, losses: 0 }).wins++;
    (cells[l][w] ??= { wins: 0, losses: 0 }).losses++;
    totals[w].wins++;
    totals[l].losses++;
    counted++;
  }
  return { players, cells, totals, sets: counted };
}

/** One set in a player's year, from their side. */
export type RecordSet = { setId: string; majorSlug: string; round: string | null; won: boolean; myScore: number | null; oppScore: number | null; opp: { playerId: string | null; name: string } };
export type YearRecord = { wins: number; losses: number; sets: RecordSet[] };

/**
 * Every saved set a player played at the year's majors, against anyone (the kind of wins-and-losses list
 * ranking voters keep): majors in the order given (newest first), then bracket order. `skip`: opponents
 * left out (players who asked not to be listed).
 */
export function yearRecord(playerId: string, sets: GridSet[], links: Map<string, string>, majorOrder: string[], skip: Set<string> = new Set()): YearRecord {
  const rank = new Map(majorOrder.map((slug, i) => [slug, i]));
  const out: { r: RecordSet; order: number; sort: number }[] = [];
  for (const s of sets) {
    const a = sideId(s.p1_id, s.p1_name, links);
    const b = sideId(s.p2_id, s.p2_name, links);
    const mine = a === playerId ? 1 : b === playerId ? 2 : 0;
    if (!mine || a === b) continue;
    const oppId = mine === 1 ? b : a;
    if (oppId && skip.has(oppId)) continue;
    out.push({
      r: {
        setId: s.set_id,
        majorSlug: s.major_slug,
        round: s.round,
        won: s.winner === mine,
        myScore: mine === 1 ? s.p1_score : s.p2_score,
        oppScore: mine === 1 ? s.p2_score : s.p1_score,
        opp: { playerId: oppId, name: tagOnly(mine === 1 ? s.p2_name : s.p1_name) },
      },
      order: rank.get(s.major_slug) ?? rank.size,
      sort: s.sort_order,
    });
  }
  out.sort((x, y) => x.order - y.order || x.sort - y.sort || x.r.setId.localeCompare(y.r.setId));
  const wins = out.filter((x) => x.r.won).length;
  return { wins, losses: out.length - wins, sets: out.map((x) => x.r) };
}

/** The players the grid is about: the year's most successful at majors (the tally's order), with a start.gg id. */
export function gridPlayers(byMajor: MajorEvent[][], game: GameKey, hidden: Set<string>, n = GRID_PLAYERS): GridPlayer[] {
  return yearTally(byMajor, game, MAJOR_THRESHOLDS[game])
    .rows.filter((r) => r.playerId && !hidden.has(r.playerId))
    .slice(0, n)
    .map((r) => ({ playerId: r.playerId!, name: tagOnly(r.name) }));
}

/**
 * A year's grid for one game, with how many of the year's majors have sets saved so far (they're
 * saved in the background over weeks). Null when it can't be checked who asked not to be listed.
 */
export async function getYearGrid(
  year: number,
  game: GameKey,
  playerId: string | null = null,
): Promise<(Grid & { majors: number; withSets: number; majorNames: Map<string, string>; record: (YearRecord & GridPlayer) | null }) | null> {
  const majors = (await getPastMajors(year)).filter((m) => m.games.includes(game)).sort((a, b) => b.startAt.localeCompare(a.startAt));
  const slugs = majors.map((m) => m.slug);
  const [events, allLinks] = await Promise.all([getMajorEvents(slugs), getNameLinks().catch(() => new Map<string, string>())]);
  const byMajor = majors.map((m) => applyNameLinks(events.get(m.slug) ?? [], allLinks));
  const links = linksForGame(allLinks, game); // the grid is one game's sets
  const tallied = yearTally(byMajor, game, MAJOR_THRESHOLDS[game]).rows.flatMap((r) => (r.playerId ? [r.playerId] : []));
  const hidden = tallied.length ? await playersHidingStats(tallied).catch(() => null) : new Set<string>();
  if (!hidden) return null;
  const players = gridPlayers(byMajor, game, hidden);
  let sets: GridSet[] = [];
  if (slugs.length && (players.length > 1 || playerId)) {
    const { data, error } = await (await createClient())
      .from("major_sets")
      .select("set_id, major_slug, round, sort_order, p1_id, p1_name, p1_score, p2_id, p2_name, p2_score, winner")
      .in("major_slug", slugs)
      .eq("game", game)
      .limit(20000);
    if (error) throw error;
    sets = (data ?? []) as GridSet[];
  }
  // A player's whole year (only the grid's players: they're the ones checked as fine to list).
  const who = playerId ? players.find((p) => p.playerId === playerId) : undefined;
  let record: (YearRecord & GridPlayer) | null = null;
  if (who) {
    const opps = yearRecord(who.playerId, sets, links, slugs).sets.flatMap((r) => (r.opp.playerId ? [r.opp.playerId] : []));
    const skip = opps.length ? await playersHidingStats([...new Set(opps)]).catch(() => null) : new Set<string>();
    if (skip) record = { ...who, ...yearRecord(who.playerId, sets, links, slugs, skip) };
  }
  return {
    ...yearGrid(players, sets, links),
    majors: majors.length,
    withSets: new Set(sets.map((s) => s.major_slug)).size,
    majorNames: new Map(majors.map((m) => [m.slug, m.name])),
    record,
  };
}
