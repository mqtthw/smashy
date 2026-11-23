// The bracket of an event hosted on Smashy: loading it, turning it into the shared bracket format
// (so the usual bracket views show it), and saving changes from the bracket engine. Writes use the
// server key and must only be called after checking the request comes from the event's host.
import { offerToSeasons, refreshSeasonResults } from "./seasons";
import { sentInAnyLanguage, translatorsFor } from "./i18n/recipients";
import "server-only";
import { cache } from "react";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { avatarUrl } from "./avatarLinks";
import {
  buildElimination,
  buildFinal,
  buildRoundRobin,
  buildSwissRound,
  eliminationPlacements,
  eliminationSeeds,
  finalPlacements,
  firstPartDone,
  isElimination,
  isFinished,
  knockedOut,
  roundLabel,
  roundRobinStandings,
  swissDropped,
  swissProgress,
  swissSeeds,
  swissTable,
  swissTotalRounds,
  type EngineSet,
  type Placement,
  type PoolStanding,
} from "./bracketEngine";
import type { SwissStanding } from "./swiss";
import type { Bracket, BracketRound, BracketSet, SetPlayer } from "./brackets/types";
import { sortRounds } from "./brackets/types";
import type { HostedEvent } from "./hostedEvents";
import { createAdminClient } from "./supabase/admin";
import { accountsBehind } from "./hostedTeams";
import { assignSetups } from "./hostedSetups";
import { discordCalls, discordResults, discordStarted } from "./discord";
import { createClient } from "./supabase/server";
import { lockIsFree } from "./bracketLock";
import { freshLive, type LiveState } from "./liveSet";
import { pageAll } from "./pageAll";
import { liveScoresOf, reportedOf, stationsOf, type OpenSet } from "./openSets";
export type { OpenSet } from "./openSets";
import { clearResults, recordResults } from "./hostedPromotion";

type Row = {
  id: string; event_id: string; bracket: EngineSet["bracket"]; round: number; idx: number; pool: number | null; identifier: string | null;
  best_of: number; p1_id: string | null; p2_id: string | null; p1_bye: boolean; p2_bye: boolean; p1_score: number | null; p2_score: number | null;
  winner: 1 | 2 | null; state: EngineSet["state"]; winner_to: string | null; winner_slot: 1 | 2 | null; loser_to: string | null; loser_slot: 1 | 2 | null;
  completed_at: string | null;
};

const COLUMNS = "id, event_id, bracket, round, idx, pool, identifier, best_of, p1_id, p2_id, p1_bye, p2_bye, p1_score, p2_score, winner, state, winner_to, winner_slot, loser_to, loser_slot, completed_at";

function toEngine(r: Row): EngineSet {
  return {
    key: r.id,
    bracket: r.bracket,
    round: r.round,
    idx: r.idx,
    pool: r.pool,
    identifier: r.identifier,
    bestOf: r.best_of,
    p: [{ id: r.p1_id, bye: r.p1_bye }, { id: r.p2_id, bye: r.p2_bye }],
    score: [r.p1_score, r.p2_score],
    winner: r.winner,
    state: r.state,
    winnerTo: r.winner_to && r.winner_slot ? { key: r.winner_to, slot: r.winner_slot } : null,
    loserTo: r.loser_to && r.loser_slot ? { key: r.loser_to, slot: r.loser_slot } : null,
  };
}

function toRow(s: EngineSet, eventId: string, completedBefore?: string | null): Omit<Row, "completed_at"> & { completed_at: string | null; updated_at: string } {
  return {
    id: s.key,
    event_id: eventId,
    bracket: s.bracket,
    round: s.round,
    idx: s.idx,
    pool: s.pool,
    identifier: s.identifier,
    best_of: s.bestOf,
    p1_id: s.p[0].id,
    p2_id: s.p[1].id,
    p1_bye: s.p[0].bye,
    p2_bye: s.p[1].bye,
    p1_score: s.score[0],
    p2_score: s.score[1],
    winner: s.winner,
    state: s.state,
    winner_to: s.winnerTo?.key ?? null,
    winner_slot: s.winnerTo?.slot ?? null,
    loser_to: s.loserTo?.key ?? null,
    loser_slot: s.loserTo?.slot ?? null,
    completed_at: s.state === "done" ? (completedBefore ?? new Date().toISOString()) : null,
    updated_at: new Date().toISOString(),
  };
}

/** `db`: read with this client instead of the viewer's (link previews pass the guest client). */
export async function loadEngineSets(eventId: string, db?: SupabaseClient): Promise<EngineSet[]> {
  const supabase = db ?? (await createClient());
  // Big brackets have over 1,000 sets (the most one request returns): read them in pages.
  const rows = await pageAll<Row>((a, b) => supabase.from("hosted_sets").select(COLUMNS).eq("event_id", eventId).order("id").range(a, b) as unknown as PromiseLike<{ data: Row[] | null; error: unknown }>);
  return rows.map(toEngine);
}

/**
 * Every set with what was recorded game by game (stage and who won) and when it finished: for the
 * public results file. Only those parts of a set's live record are passed on (never player reports
 * waiting for the TO, or anything else in it).
 */
export async function loadSetsWithGames(eventId: string, db: SupabaseClient): Promise<{ set: EngineSet; games: { stage: string; winner: 1 | 2 }[]; completedAt: string | null }[]> {
  type WithLive = Row & { live: LiveState | null };
  const rows = await pageAll<WithLive>((a, b) => db.from("hosted_sets").select(`${COLUMNS}, live`).eq("event_id", eventId).order("id").range(a, b) as unknown as PromiseLike<{ data: WithLive[] | null; error: unknown }>);
  return rows.map((r) => {
    const recorded = r.live?.games;
    return {
      set: toEngine(r),
      games: (Array.isArray(recorded) ? recorded : [])
        .filter((g) => g && (g.winner === 1 || g.winner === 2))
        .map((g) => ({ stage: typeof g.stage === "string" ? g.stage : "", winner: g.winner })),
      completedAt: r.completed_at,
    };
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Run one change to an event's bracket at a time. The event's bracket_version is the lock: zero or
 * more means free; a change sets it to minus the current time ("in use since then"), does its work
 * on freshly loaded sets, then frees it. Two results saved at the same moment take turns instead of
 * overwriting each other.
 * If a request dies while holding the lock, the next change takes it over after 3 minutes, so a
 * bracket can never stay "busy" for good. A request only frees a lock that is still its own.
 */
export async function withBracketLock<T>(eventId: string, fn: () => Promise<T>): Promise<T> {
  const db = createAdminClient();
  for (let attempt = 0; attempt < 25; attempt++) {
    const { data } = await db.from("hosted_events").select("bracket_version").eq("id", eventId).maybeSingle();
    const v = (data?.bracket_version as number | undefined) ?? 0;
    const now = Math.floor(Date.now() / 1000);
    if (lockIsFree(v, now)) {
      const mine = -now;
      // Only one request can swap the value it just read for its own.
      const { data: got } = await db.from("hosted_events").update({ bracket_version: mine }).eq("id", eventId).eq("bracket_version", v).select("id");
      if (got?.length) {
        if (v < 0) console.error("bracket lock taken over from a request that never released it", eventId);
        try {
          return await fn();
        } finally {
          // Free it: one more than before (it counts the changes), or 1 after taking over a dead lock.
          const release = () => db.from("hosted_events").update({ bracket_version: v >= 0 ? v + 1 : 1 }).eq("id", eventId).eq("bracket_version", mine);
          const { error } = await release();
          if (error) await release(); // one more try; if that fails too, the lock expires on its own
        }
      }
    }
    await sleep(120 + Math.random() * 200);
  }
  throw new Error("The bracket is busy right now. Try again in a moment.");
}

/** Who plays: the seeding (seed 1 first, then unseeded people by sign-up), checked-in only if check-in is on. */
export async function bracketEntrants(event: Pick<HostedEvent, "id" | "checkinMinutes">): Promise<string[]> {
  const db = createAdminClient();
  const [{ data }, { data: guests }] = await Promise.all([
    db.from("hosted_entrants").select("user_id, seed, checked_in_at, created_at").eq("event_id", event.id).limit(600),
    // Walk-ins the host added (no Smashy account): checked in when added.
    db.from("hosted_guests").select("id, seed, checked_in_at, created_at").eq("event_id", event.id).limit(600),
  ]);
  const all = [
    ...((data ?? []) as { user_id: string; seed: number | null; checked_in_at: string | null; created_at: string }[]),
    ...((guests ?? []) as { id: string; seed: number | null; checked_in_at: string | null; created_at: string }[]).map((g) => ({ ...g, user_id: g.id })),
  ];
  return all
    .filter((e) => event.checkinMinutes === 0 || e.checked_in_at)
    .sort((a, b) => (a.seed ?? 1e9) - (b.seed ?? 1e9) || a.created_at.localeCompare(b.created_at))
    .map((e) => e.user_id);
}

/** Build and save the bracket (host already checked). Returns how many players are in it. */
export async function createBracket(event: HostedEvent): Promise<number> {
  if (event.format === "social") throw new Error("A social event has no bracket."); // round 757
  const seeds = await bracketEntrants(event);
  if (seeds.length < 2) throw new Error(event.checkinMinutes > 0 ? "At least 2 checked-in players are needed to start." : "At least 2 players are needed to start.");
  const built =
    event.format === "swiss"
      ? buildSwissRound(seeds.map((id, i) => ({ id, seed: i + 1 })), [], { bestOf: event.bestOf }) // round 1 only: each next round is paired when the one before is done
      : event.format === "round_robin"
        ? buildRoundRobin(seeds, { bestOf: event.bestOf })
        : buildElimination(seeds, { double: event.format === "double_elim", bestOf: event.bestOf, bestOfTop: event.bestOfTop });
  const withIds = linkedIds(built);
  const db = createAdminClient();
  // Claim the event first: only one "Start bracket" can win (a double click or a second tab gets an error).
  const { data: claimed } = await db.from("hosted_events").update({ status: "in_progress" }).eq("id", event.id).in("status", ["open", "closed"]).select("id");
  if (!claimed?.length) throw new Error("The bracket has already started.");
  try {
    await insertLinked(event.id, withIds);
  } catch (e) {
    await db.from("hosted_sets").delete().eq("event_id", event.id);
    await db.from("hosted_events").update({ status: "closed" }).eq("id", event.id);
    throw e;
  }
  await discordStarted(event.id, seeds.length); // before the first set calls, so the channel reads in order
  await setsCalled(event.id, withIds.filter((s) => s.state === "ready"));
  await assignSetups(event.id); // the first sets get the venue's setups (if the event counts them)
  return seeds.length;
}

/** Give every freshly built set a real id, and point the links between them at those ids. */
function linkedIds(built: EngineSet[]): EngineSet[] {
  const ids = new Map(built.map((s) => [s.key, randomUUID()]));
  return built.map((s) => ({
    ...s,
    key: ids.get(s.key)!,
    winnerTo: s.winnerTo ? { ...s.winnerTo, key: ids.get(s.winnerTo.key)! } : null,
    loserTo: s.loserTo ? { ...s.loserTo, key: ids.get(s.loserTo.key)! } : null,
  }));
}

/** Save new sets that link to each other: without the links first (they point at rows in the same batch), then with them. */
async function insertLinked(eventId: string, sets: EngineSet[]) {
  const db = createAdminClient();
  const rows = sets.map((s) => toRow(s, eventId));
  const { error } = await db.from("hosted_sets").insert(rows.map((r) => ({ ...r, winner_to: null, loser_to: null })));
  if (error) throw error;
  const { error: linkError } = await db.from("hosted_sets").upsert(rows);
  if (linkError) throw linkError;
}

/**
 * Pools or Swiss are done: build the final bracket from the top players and start it (host already
 * checked; call inside withBracketLock). Returns how many players are in it.
 */
export async function startFinalBracket(event: HostedEvent): Promise<number> {
  if (!event.finalFormat) throw new Error("This event has no final bracket.");
  const db = createAdminClient();
  const sets = await loadEngineSets(event.id, db);
  if (!sets.length) throw new Error("The bracket hasn't started yet.");
  if (sets.some(isElimination)) throw new Error("The final bracket has already started.");
  if (!firstPartDone(sets, event.swissRounds)) throw new Error(event.format === "swiss" ? "The Swiss rounds aren't finished yet." : "The pools still have sets without a result.");
  // The seeding the event started with settles ties at the cut (pools: players level on record and games).
  const seedOrder = await bracketEntrants(event);
  const built = linkedIds(buildFinal(sets, event.finalSize ?? 8, { double: event.finalFormat === "double_elim", bestOf: event.bestOf, bestOfTop: event.bestOfTop, seedOrder }));
  if (!built.length) throw new Error("Fewer than 2 players qualified for the final bracket.");
  try {
    await insertLinked(event.id, built);
  } catch (e) {
    await db.from("hosted_sets").delete().in("id", built.map((s) => s.key));
    throw e;
  }
  await setsCalled(event.id, built.filter((s) => s.state === "ready"));
  await assignSetups(event.id);
  return new Set(built.flatMap((s) => [s.p[0].id, s.p[1].id]).filter(Boolean)).size;
}

/**
 * The players who have a Smashy account. Walk-ins are a name only: they have no profile, and a
 * notification addressed to one is refused by the database (which would also drop the other
 * player's notification sent in the same request).
 */
export async function playersWithAccounts(ids: (string | null | undefined)[]): Promise<string[]> {
  // A team's members who have an account count too (doubles).
  return [...new Set([...(await accountsBehind(ids)).values()].flat())];
}

/**
 * Sets that just got both players: a fresh live state (coin flip for who strikes first) and a
 * "You're up" notification for both players (elimination sets; round robin sets all start at once).
 */
async function setsCalled(eventId: string, sets: EngineSet[]) {
  if (!sets.length) return;
  const db = createAdminClient();
  const calledAt = new Date().toISOString();
  // Each set gets its own coin flip, but they're saved together: one request per coin side (in
  // batches of 100), not one per set. A big bracket's first round used to send over 100 at once.
  const byState = new Map<string, { live: LiveState & { calledAt: string }; ids: string[] }>();
  for (const s of sets) {
    const live = { ...freshLive(), calledAt };
    const k = JSON.stringify(live);
    if (!byState.has(k)) byState.set(k, { live, ids: [] });
    byState.get(k)!.ids.push(s.key);
  }
  for (const { live, ids } of byState.values()) {
    for (let i = 0; i < ids.length; i += 100) {
      const { error } = await db.from("hosted_sets").update({ live, updated_at: new Date().toISOString() }).in("id", ids.slice(i, i + 100)); // round 632
      if (error) console.error("starting sets failed", error.message);
    }
  }
  const elim = sets.filter((s) => s.bracket !== "RR" && s.p[0].id && s.p[1].id);
  if (!elim.length) return;
  const { data: ev } = await db.from("hosted_events").select("name, setups").eq("id", eventId).maybeSingle();
  // Discord: the sets that are up. (An event that hands out setups posts each set when it gets one instead.)
  if (!ev?.setups) await discordCalls(eventId, elim.map((s) => ({ identifier: s.identifier, p1: s.p[0].id, p2: s.p[1].id, station: null })));
  const ids = [...new Set(elim.flatMap((s) => [s.p[0].id!, s.p[1].id!]))];
  const [{ data: profiles }, { data: guests }] = await Promise.all([
    db.from("profiles").select("id, tag").in("id", ids),
    db.from("hosted_guests").select("id, tag").in("id", ids),
  ]);
  const tag = new Map([...(profiles ?? []), ...(guests ?? [])].map((p) => [p.id as string, p.tag as string]));
  // Who to tell on each side: the player, or a team's members. Walk-ins have no account to notify.
  const accounts = await accountsBehind(ids, db);
  // Once per player per set and opponent: a result that's undone and replayed doesn't call them
  // again, but someone whose opponent changed (an earlier result was fixed) is told who it is now.
  const hrefs = elim.map((s) => `/host/set/${s.key}`);
  const { data: sent } = await db.from("notifications").select("user_id, event_href, event_name").eq("type", "set_ready").in("event_href", hrefs);
  const already = new Set((sent ?? []).map((n) => `${n.user_id}|${n.event_href}|${n.event_name}`));
  const trOf = await translatorsFor(elim.flatMap((s) => ([0, 1] as const).flatMap((i) => accounts.get(s.p[i].id!) ?? [])));
  const rows = elim
    .flatMap((s) =>
      ([0, 1] as const).flatMap((i) =>
        (accounts.get(s.p[i].id!) ?? []).map((user_id) => ({
          user_id,
          type: "set_ready",
          event_name: trOf(user_id)("alert.ev.youVs", { event: (ev?.name as string | undefined) ?? trOf(user_id)("alert.ev.yourEvent"), opponent: tag.get(s.p[1 - i].id!) ?? trOf(user_id)("alert.ev.opponent") }).slice(0, 200),
          event_href: `/host/set/${s.key}`,
        })),
      ),
    )
    .filter((r) => !already.has(`${r.user_id}|${r.event_href}|${r.event_name}`));
  if (!rows.length) return;
  const { error } = await db.from("notifications").insert(rows);
  if (error) console.error("set_ready notifications failed", error.message);
}

/**
 * A player was just knocked out (the event isn't over yet): tell them now instead of making them wait
 * for the whole bracket. Their final placement still comes when it finishes (event_result). Once per
 * player per event; walk-ins have no account.
 */
async function notifyKnockedOut(eventId: string, before: EngineSet[], after: EngineSet[], changed: EngineSet[]) {
  const wasDone = new Set(before.filter((s) => s.state === "done").map((s) => s.key));
  const out = changed.filter((c) => c.state === "done" && !wasDone.has(c.key)).map((c) => knockedOut(after, c)).filter((id): id is string => !!id);
  if (!out.length) return;
  const db = createAdminClient();
  const href = `/host/${eventId}/bracket`;
  // The accounts behind whoever went out: the player, or (doubles) the team's members.
  const users = [...new Set([...(await accountsBehind(out, db)).values()].flat())];
  if (!users.length) return;
  const [{ data: sent }, { data: ev }] = await Promise.all([
    db.from("notifications").select("user_id").eq("type", "event_update").eq("event_href", href).or(sentInAnyLanguage("alert.ev.out")).in("user_id", users),
    db.from("hosted_events").select("name").eq("id", eventId).maybeSingle(),
  ]);
  const already = new Set((sent ?? []).map((n) => n.user_id as string));
  const name = (ev?.name as string | undefined) ?? "the event";
  const trOf = await translatorsFor(users);
  const rows = users
    .filter((id) => !already.has(id))
    .map((id) => ({ user_id: id, actor_id: null, type: "event_update", event_name: trOf(id)("alert.ev.out", { event: name }).slice(0, 200), event_href: href }));
  if (!rows.length) return;
  const { error } = await db.from("notifications").insert(rows);
  if (error) console.error("knocked-out notifications failed", error.message);
}

/** Save the sets the engine changed, and mark the event finished when the bracket is. */
export async function saveChanges(eventId: string, before: EngineSet[], changed: EngineSet[]) {
  if (!changed.length) return;
  const db = createAdminClient();
  // Sets that were already finished keep the time they finished (round 632: a score fix used to stamp
  // them "just now", moving them to the top of latest results).
  const doneBefore = new Set(before.filter((s) => s.state === "done").map((s) => s.key));
  const keepTimes = changed.filter((s) => s.state === "done" && doneBefore.has(s.key)).map((s) => s.key);
  const finishedAt = new Map<string, string>();
  for (let i = 0; i < keepTimes.length; i += 100) {
    const { data } = await db.from("hosted_sets").select("id, completed_at").in("id", keepTimes.slice(i, i + 100));
    for (const r of data ?? []) if (r.completed_at) finishedAt.set(r.id as string, r.completed_at as string);
  }
  const { error } = await db.from("hosted_sets").upsert(changed.map((s) => toRow(s, eventId, finishedAt.get(s.key))));
  if (error) throw error;
  const all = new Map(before.map((s) => [s.key, s]));
  const prev = new Map(before.map((s) => [s.key, s]));
  const wasPlayable = new Set(before.filter((s) => s.state === "ready" || s.state === "live").map((s) => s.key));
  for (const c of changed) all.set(c.key, c);
  // A set is newly called when it becomes ready, or when it was already called and one of its
  // players changed (the host fixed an earlier result the other way). Either way it starts fresh:
  // the old pair's coin flip, strikes, game wins and score reports must not carry over.
  const samePlayers = (a: EngineSet, b: EngineSet | undefined) => !!b && a.p[0].id === b.p[0].id && a.p[1].id === b.p[1].id;
  await setsCalled(eventId, changed.filter((s) => s.state === "ready" && (!wasPlayable.has(s.key) || !samePlayers(s, prev.get(s.key)))));
  const after = [...all.values()];
  // Pools and Swiss end by the event's settings (how many Swiss rounds, whether a final bracket follows),
  // which the sets themselves don't say.
  let shape: { swissRounds?: number | null; finalFormat?: string | null } = {};
  if (after.some((s) => !isElimination(s))) {
    const { data: ev } = await db.from("hosted_events").select("swiss_rounds, final_format").eq("id", eventId).maybeSingle();
    shape = { swissRounds: (ev?.swiss_rounds as number | null | undefined) ?? null, finalFormat: (ev?.final_format as string | null | undefined) ?? null };
  }
  const done = isFinished(after, shape);
  const wasDone = isFinished(before, shape);
  await db.from("hosted_events").update({ status: done ? "completed" : "in_progress" }).eq("id", eventId);
  // A fixed result can change placements of a finished bracket: record them again.
  const winnerChanged = changed.some((c) => before.find((b) => b.key === c.key)?.winner !== c.winner);
  if (!done) await notifyKnockedOut(eventId, before, after, changed);
  if (done && (!wasDone || winnerChanged)) await recordResults(eventId, after);
  else if (!done && wasDone) await clearResults(eventId);
  if (done && !wasDone) await discordResults(eventId, finalPlacements(after)); // once, when the bracket finishes
  // Seasons: offer the finished bracket to its runners' seasons, and keep seasons that hold it up to date.
  if (done && !wasDone) await offerToSeasons(eventId).catch((e) => console.error("season offer failed", e));
  // Round 632: also when it finishes again after being reopened (a fix that sent it to a reset, or a replay).
  if (done && (!wasDone || winnerChanged)) await refreshSeasonResults(eventId).catch((e) => console.error("season refresh failed", e));
  // A finished set frees its setup, and newly called sets need one: hand them out.
  if (!done) await assignSetups(eventId);
}

/** Give freshly built sets real ids (Swiss rounds have no links between sets to repoint). */
const withRealIds = (sets: EngineSet[]): EngineSet[] => sets.map((s) => ({ ...s, key: randomUUID() }));

/**
 * Swiss: pair and start the next round (host already checked; call inside withBracketLock).
 * Allowed once every set of the current round has a result and rounds are left. Returns the round
 * it started.
 */
export async function nextSwissRound(event: HostedEvent): Promise<number> {
  const sets = await loadEngineSets(event.id, createAdminClient());
  const { round, complete } = swissProgress(sets);
  if (!round) throw new Error("The bracket hasn't started yet.");
  if (!complete) throw new Error(`Round ${round} still has sets without a result.`);
  if (round >= swissTotalRounds(sets, event.swissRounds)) throw new Error("That was the last round.");
  const dropped = swissDropped(sets);
  const built = withRealIds(buildSwissRound(swissSeeds(sets).filter((p) => !dropped.has(p.id)), sets, { bestOf: event.bestOf }));
  if (!built.length) throw new Error("Fewer than 2 players are left to pair.");
  await saveChanges(event.id, sets, built);
  return round + 1;
}

/**
 * Swiss: pair the current round again (a result from the round before was corrected, or someone
 * left). Only while nobody has played or started a set of this round. Returns the round.
 */
export async function redoSwissRound(event: HostedEvent): Promise<number> {
  const db = createAdminClient();
  const sets = await loadEngineSets(event.id, db);
  const { round } = swissProgress(sets);
  if (round < 2) throw new Error("Round 1 follows the seeding. To change it, reset the bracket and edit the seeds.");
  const current = sets.filter((s) => s.bracket === "SW" && s.round === round);
  if (current.some((s) => s.state === "done" || s.state === "live")) throw new Error(`Round ${round} is already being played.`);
  const { data: started } = await db.from("hosted_sets").select("id, live").in("id", current.map((s) => s.key));
  // A set whose players already began striking or reported a game has started, even if it has no result yet.
  if ((started ?? []).some((r) => { const live = r.live as { games?: unknown[]; struck?: unknown[]; report?: unknown } | null; return !!live && ((live.games?.length ?? 0) > 0 || (live.struck?.length ?? 0) > 0 || !!live.report); })) {
    throw new Error(`Round ${round} is already being played.`);
  }
  const { error } = await db.from("hosted_sets").delete().in("id", current.map((s) => s.key));
  if (error) throw error;
  // Their "You're up" notifications point at sets that no longer exist: the new pairings send their own.
  await db.from("notifications").delete().eq("type", "set_ready").in("event_href", current.map((s) => `/host/set/${s.key}`));
  const before = sets.filter((s) => !(s.bracket === "SW" && s.round === round));
  const dropped = swissDropped(before);
  const built = withRealIds(buildSwissRound(swissSeeds(before).filter((p) => !dropped.has(p.id)), before, { bestOf: event.bestOf }));
  await saveChanges(event.id, before, built);
  return round;
}

/** Remove the bracket so the host can change seeding and start again. */
export async function deleteBracket(eventId: string) {
  const db = createAdminClient();
  const { error } = await db.from("hosted_sets").delete().eq("event_id", eventId);
  if (error) throw error;
  await clearResults(eventId); // a reset bracket has no placements (profiles stop showing them)
  await db.from("hosted_events").update({ status: "closed", bracket_version: 0, challonge_url: null }).eq("id", eventId); // old copy is stale (round 632)
}

// ---------- Showing it ----------

export type PlayerInfo = { tag: string; handle: string; avatarUrl: string | null; seed: number | null };

/** `db`: read with this client instead of the viewer's (link previews pass the guest client). */
export async function bracketPlayers(eventId: string, db?: SupabaseClient): Promise<Map<string, PlayerInfo>> {
  const supabase = db ?? (await createClient());
  const [{ data }, { data: guests }] = await Promise.all([
    supabase
      .from("hosted_entrants")
      .select("user_id, seed, profile:profiles!hosted_entrants_user_id_fkey ( tag, handle, avatar_path )")
      .eq("event_id", eventId)
      .limit(600),
    supabase.from("hosted_guests").select("id, tag, seed").eq("event_id", eventId).limit(600),
  ]);
  const out = new Map<string, PlayerInfo>();
  // Walk-ins: a tag only (no profile to link to).
  for (const g of (guests ?? []) as { id: string; tag: string; seed: number | null }[]) out.set(g.id, { tag: g.tag, handle: "", avatarUrl: null, seed: g.seed });
  for (const r of (data ?? []) as unknown as { user_id: string; seed: number | null; profile: { tag: string; handle: string; avatar_path: string | null } | null }[]) {
    out.set(r.user_id, { tag: r.profile?.tag ?? "Player", handle: r.profile?.handle ?? "", avatarUrl: avatarUrl(r.profile?.avatar_path ?? null), seed: r.seed });
  }
  return out;
}

/** One part of a hosted bracket that can be shown by itself: a pool, the Swiss rounds, or the final bracket (`pool` null). */
export type BracketPart = { id: string; label: string; pool: number | null };

/**
 * The parts to pick between, in order: several round robin pools, and once pools or Swiss have a
 * final bracket, the first part and "Final bracket". Empty when there's only one thing to show.
 */
export function bracketParts(event: Pick<HostedEvent, "format">, sets: EngineSet[]): BracketPart[] {
  const pools = [...new Set(sets.map((s) => s.pool).filter((p): p is number => p !== null))].sort((a, b) => a - b);
  const hasFinal = pools.length > 0 && sets.some(isElimination);
  const first: BracketPart[] =
    pools.length > 1 ? pools.map((p) => ({ id: String(p), label: `Pool ${p}`, pool: p })) : hasFinal ? [{ id: String(pools[0]), label: event.format === "swiss" ? "Swiss rounds" : "Pool", pool: pools[0] }] : [];
  return hasFinal ? [...first, { id: "final", label: "Final bracket", pool: null }] : first;
}

/** The part a page shows: the one named in the link, else the final bracket once it exists, else the first pool. */
export function pickPart(parts: BracketPart[], group?: string | null): number | null {
  if (!parts.length) return null;
  return (parts.find((p) => p.id === group) ?? parts.find((p) => p.pool === null) ?? parts[0]).pool;
}

/**
 * The hosted bracket in the shared bracket format (byes and an unplayed reset are left out).
 * `pool`: which part. In an event with pools or Swiss AND a final bracket, a number is that pool
 * (Swiss rounds are pool 1) and null is the final bracket; otherwise null is everything.
 */
export function toBracket(event: HostedEvent, sets: EngineSet[], players: Map<string, PlayerInfo>, pool: number | null): Bracket {
  const twoParts = sets.some(isElimination) && sets.some((s) => !isElimination(s));
  const firstPart = event.format === "round_robin" || event.format === "swiss";
  // The elimination format: the event's own, or its final bracket's.
  const single = (firstPart ? event.finalFormat : event.format) === "single_elim";
  // Whether what's shown is an elimination bracket (a tree) or rounds with standings.
  const tree = twoParts ? pool === null : !firstPart;
  const maxW = Math.max(0, ...sets.filter((s) => s.bracket === "W").map((s) => s.round));
  const maxL = Math.max(0, ...sets.filter((s) => s.bracket === "L").map((s) => s.round));
  const byKey = new Map(sets.map((s) => [s.key, s]));
  // "Winner of B" / "Loser of C" for empty slots.
  const feeders = new Map<string, string>();
  for (const s of sets) {
    if (s.winnerTo) feeders.set(`${s.winnerTo.key}:${s.winnerTo.slot}`, `Winner of ${s.identifier ?? "?"}`);
    if (s.loserTo) feeders.set(`${s.loserTo.key}:${s.loserTo.slot}`, `Loser of ${s.identifier ?? "?"}`);
  }
  const shown = sets.filter((s) => s.state !== "bye" && s.state !== "skipped" && (twoParts ? s.pool === pool : pool === null || s.pool === pool));
  const usedSeeds = eliminationSeeds(sets);
  const player = (s: EngineSet, i: 0 | 1): SetPlayer | null => {
    const id = s.p[i].id;
    if (!id) return null;
    const info = players.get(id);
    return {
      entrantId: id,
      name: info?.tag ?? "Player",
      prefix: null,
      seed: usedSeeds.get(id) ?? info?.seed ?? null, // the seed the bracket was built from (saved seeds can be missing or have gaps)
      score: s.score[i],
      won: s.winner === i + 1,
    };
  };
  const toSet = (s: EngineSet): BracketSet => ({
    id: s.key,
    identifier: s.identifier,
    round: s.bracket === "L" ? -s.round : s.bracket === "GF" ? maxW + 1 : s.bracket === "GF2" ? maxW + 2 : s.round,
    roundLabel: roundLabel(s, maxW, maxL, single),
    winnersSide: s.bracket !== "L",
    state: s.state === "done" ? "done" : s.state === "live" ? "live" : "pending",
    players: [player(s, 0), player(s, 1)],
    waitingOn: [s.p[0].id ? null : feeders.get(`${s.key}:1`) ?? null, s.p[1].id ? null : feeders.get(`${s.key}:2`) ?? null],
    completedAt: null,
  });
  const map = new Map<string, BracketRound>();
  for (const s of shown) {
    const b = toSet(s);
    const key = `${b.winnersSide ? "w" : "l"}${Math.abs(b.round)}`;
    const r = map.get(key) ?? { key, label: b.roundLabel, winnersSide: b.winnersSide, round: b.round, sets: [] };
    r.sets.push(b);
    map.set(key, r);
  }
  for (const r of map.values()) r.sets.sort((a, b) => (byKey.get(a.id)?.idx ?? 0) - (byKey.get(b.id)?.idx ?? 0));
  const parts = bracketParts(event, sets);
  const finished = isFinished(sets, event);
  return {
    event: {
      source: "smashy",
      eventId: event.id,
      eventName: event.name,
      game: event.game,
      tournamentName: event.name,
      tournamentSlug: null,
      sourceUrl: `/host/${event.id}`,
      groups: parts.map((p) => ({ id: p.id, label: p.label, phase: p.pool === null ? "Final bracket" : event.format === "swiss" ? "Swiss" : "Round robin" })),
    },
    groupId: parts.find((p) => p.pool === pool)?.id ?? "",
    type: tree ? (single ? "single" : "double") : event.format === "swiss" ? "swiss" : "round_robin",
    rounds: sortRounds([...map.values()]),
    live: shown.some((s) => s.state === "live"),
    finished,
  };
}

export type Results =
  | { kind: "elimination"; placements: Placement[] }
  | { kind: "round_robin"; standings: PoolStanding[] }
  /** Swiss: the standings so far, the round being played, how many rounds there are, and who has left. */
  | { kind: "swiss"; standings: SwissStanding[]; round: number; roundDone: boolean; rounds: number; dropped: string[] };

/**
 * How the event stands: placements for an elimination bracket; standings for pools or Swiss; and
 * once pools or Swiss have a final bracket, everyone's placement across both parts.
 */
export function bracketResults(event: HostedEvent, sets: EngineSet[]): Results {
  const first = firstPartResults(event, sets);
  if (first && sets.some(isElimination)) return { kind: "elimination", placements: finalPlacements(sets) };
  return first ?? { kind: "elimination", placements: eliminationPlacements(sets) };
}

/** The standings of the pools or the Swiss rounds (null for an elimination event). */
export function firstPartResults(event: HostedEvent, sets: EngineSet[]): Results | null {
  if (event.format === "swiss") {
    const progress = swissProgress(sets);
    return { kind: "swiss", standings: swissTable(sets), round: progress.round, roundDone: progress.complete, rounds: swissTotalRounds(sets, event.swissRounds), dropped: [...swissDropped(sets)] };
  }
  return event.format === "round_robin" ? { kind: "round_robin", standings: roundRobinStandings(sets) } : null;
}

/** Game scores of the sets being played right now (from each set's live state), by set id. */
/** The last few finished sets, newest first (for "Latest results" on a running event's page). Byes and skipped sets aren't results. */
export async function latestResults(eventId: string, limit = 5): Promise<{ id: string; identifier: string | null; p: [string | null, string | null]; score: [number | null, number | null]; winner: 1 | 2 }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("hosted_sets")
    .select("id, identifier, p1_id, p2_id, p1_score, p2_score, winner, completed_at")
    .eq("event_id", eventId)
    .eq("state", "done")
    .not("p1_id", "is", null)
    .not("p2_id", "is", null)
    .order("completed_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as { id: string; identifier: string | null; p1_id: string; p2_id: string; p1_score: number | null; p2_score: number | null; winner: 1 | 2 }[]).map((r) => ({
    id: r.id,
    identifier: r.identifier,
    p: [r.p1_id, r.p2_id],
    score: [r.p1_score, r.p2_score],
    winner: r.winner,
  }));
}

/**
 * Every open set of an event, read once per page view (round 767) as the viewer. A page used to ask
 * for these rows up to four times (setups, live scores, player reports, my own set), on every reload
 * of a running bracket for every viewer. Read in pages: the separate reads stopped at 200 sets, and a
 * big round robin has more open at once.
 */
export const openSets = cache(async (eventId: string): Promise<OpenSet[]> => {
  const supabase = await createClient();
  return pageAll<OpenSet>(
    (a, b) =>
      supabase.from("hosted_sets").select("id, identifier, p1_id, p2_id, state, updated_at, live").eq("event_id", eventId).in("state", ["ready", "live"]).order("id").range(a, b) as unknown as PromiseLike<{ data: OpenSet[] | null; error: unknown }>,
  );
});

/** Sets with a player-reported final score waiting for the TO (shown as "reported" on the bracket). */
export async function reportedSetIds(eventId: string): Promise<Set<string>> {
  return reportedOf(await openSets(eventId));
}

/** Where each set being called is played ("Setup 3"), by set id (for "On now"). */
export async function setStations(eventId: string): Promise<Record<string, string>> {
  return stationsOf(await openSets(eventId));
}

export async function liveGameScores(eventId: string): Promise<Record<string, [number, number]>> {
  return liveScoresOf(await openSets(eventId));
}

/**
 * A player's connect code for an event, read on the server (codes are private: only the player can
 * read their own). Use it only to show a code to that player's opponent in a called set, or the TO.
 */
export async function connectCodeFor(eventId: string, userId: string): Promise<string | null> {
  const { data } = await createAdminClient().from("hosted_connect_codes").select("code").eq("event_id", eventId).eq("user_id", userId).maybeSingle();
  return (data?.code as string | undefined) ?? null;
}
