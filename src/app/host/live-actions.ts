"use server";

import { sentInAnyLanguage, translatorsFor } from "@/lib/i18n/recipients";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/actionErrors";
import { byPlayNow, reportResult } from "@/lib/bracketEngine";
import { loadEngineSets, playersWithAccounts, saveChanges, withBracketLock } from "@/lib/hostedBracket";
import { accountsBehind, slotInSet } from "@/lib/hostedTeams";
import { assignSetups } from "@/lib/hostedSetups";
import { getHostedEvent, runBy, runsEvent, type HostedEvent } from "@/lib/hostedEvents";
import { contactInfoReason } from "@/lib/guardrails";
import { applyLive, cleanStation, finalScoreProblem, finalsAgree, freshLive, livePhase, liveScore, recordGame, type LiveAction, type LiveState, type PlayerSlot } from "@/lib/liveSet";
import { eventRules } from "@/lib/hostedRules";
import type { StrikeRules } from "@/lib/striking";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getVerifiedUserId } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireUser() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/signin");
  return userId;
}

type SetRow = { id: string; event_id: string; p1_id: string | null; p2_id: string | null; state: string; best_of: number; live: LiveState | null; updated_at: string };

async function loadSet(setId: string): Promise<SetRow | null> {
  if (!UUID.test(setId)) return null;
  const { data } = await createAdminClient()
    .from("hosted_sets")
    .select("id, event_id, p1_id, p2_id, state, best_of, live, updated_at")
    .eq("id", setId)
    .maybeSingle();
  return (data as SetRow | null) ?? null;
}

/**
 * Save the new live state only if nobody else changed the set since we read it (two players tapping
 * at once), then finish the set in the bracket once someone has enough game wins.
 */
async function commit(row: SetRow, event: HostedEvent, rules: StrikeRules, next: LiveState): Promise<ActionResult> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("hosted_sets")
    .update({ live: next, state: "live", updated_at: new Date().toISOString() })
    .eq("id", row.id)
    .eq("updated_at", row.updated_at)
    .in("state", ["ready", "live"])
    .select("id");
  if (error) return { error: (await getT())("common.tryAgain") };
  if (!data?.length) return { error: (await getT())("setroom.err.setChanged") };
  const phase = livePhase(rules, row.best_of, next);
  if (phase.kind === "done") return finishInBracket(row, event, phase.winner, next);
  refresh();
  return {};
}

/**
 * Whether the set still has the two players it had when its games or reports were read (round 640). A
 * co-TO's fix can swap who is in a set between that read and the bracket lock; then the old pair's
 * result must not be recorded for the new pair.
 */
const samePair = (s: { p: { id: string | null }[] }, p1: string | null, p2: string | null) => s.p[0].id === p1 && s.p[1].id === p2;

/** Every game is played: record the set in the bracket (one bracket change at a time, on freshly loaded sets). */
async function finishInBracket(row: SetRow, event: HostedEvent, winner: PlayerSlot, live: LiveState): Promise<ActionResult> {
  try {
    await withBracketLock(event.id, async () => {
      const sets = await loadEngineSets(event.id);
      const me = sets.find((x) => x.key === row.id);
      if (me && !samePair(me, row.p1_id, row.p2_id)) throw new Error((await getT())("setroom.err.setChanged"));
      if (me && (me.state === "ready" || me.state === "live")) await saveChanges(event.id, sets, reportResult(sets, row.id, winner, liveScore(live)));
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : (await getT())("setroom.err.finishFailed") };
  }
  refresh();
  return {};
}

/**
 * The games are all played but the bracket never recorded the set: the last game was saved, then
 * the bracket step failed (it was busy, or the request was cut off). Either player or the TO can
 * finish it. Without this the set stayed "live" with nothing anyone but the TO could do.
 */
export async function finishSet(setId: string): Promise<ActionResult> {
  const userId = await requireUser();
  const row = await loadSet(setId);
  if (!row) return { error: (await getT())("setroom.err.setGone") };
  const event = await getHostedEvent(row.event_id);
  if (!event || event.status !== "in_progress") return { error: (await getT())("setroom.err.notRunning") };
  const isPlayer = !!(await slotInSet(row, userId));
  if (!isPlayer && !(await runsEvent(event, userId))) return { error: (await getT())("setroom.err.playersOrTO") };
  if (row.state !== "ready" && row.state !== "live") {
    refresh(); // it's already recorded: just show the result
    return {};
  }
  const live = row.live ?? freshLive();
  const phase = livePhase(await eventRules(event), row.best_of, live);
  if (phase.kind !== "done") return { error: (await getT())("setroom.err.notFinished") };
  return finishInBracket(row, event, phase.winner, live);
}

/** A player's move in their set: strike, ban, pick a stage, or report who won the game. */
export async function liveMove(setId: string, action: LiveAction): Promise<ActionResult> {
  const userId = await requireUser();
  const row = await loadSet(setId);
  if (!row) return { error: (await getT())("setroom.err.setGone") };
  const by: PlayerSlot | null = await slotInSet(row, userId);
  if (!by) return { error: (await getT())("setroom.err.playersOnly") };
  if (row.state !== "ready" && row.state !== "live") return { error: (await getT())("setroom.err.notPlaying") };
  const event = await getHostedEvent(row.event_id);
  if (!event || event.status !== "in_progress") return { error: (await getT())("setroom.err.notRunning") };
  const rules = await eventRules(event);
  let next: LiveState;
  try {
    next = applyLive(rules, row.best_of, row.live ?? freshLive(), by, action);
  } catch (e) {
    return { error: e instanceof Error ? e.message : (await getT())("setroom.err.moveNotAllowed") };
  }
  return commit(row, event, rules, next);
}

/** The host settles a disputed game (or records one for the players). */
export async function hostRecordGame(setId: string, winner: PlayerSlot): Promise<ActionResult> {
  const userId = await requireUser();
  const row = await loadSet(setId);
  if (!row) return { error: (await getT())("setroom.err.setGone") };
  const event = await getHostedEvent(row.event_id);
  if (!event || !(await runsEvent(event, userId))) return { error: (await getT())("hostbracket.err.hostOnly") };
  if (row.state !== "ready" && row.state !== "live") return { error: (await getT())("setroom.err.notPlaying") };
  const rules = await eventRules(event);
  const live = row.live ?? freshLive();
  const phase = livePhase(rules, row.best_of, live);
  if (phase.kind !== "play") return { error: (await getT())("hostbracket.err.pickStageFirst") };
  return commit(row, event, rules, recordGame(live, phase.stage, winner === 2 ? 2 : 1));
}

/** The name of each side of a set: a player's tag, a walk-in's, or a team's ("A / B"). */
async function sideTags(row: SetRow): Promise<(id: string | null, fallback: string) => string> {
  const ids = [row.p1_id, row.p2_id].filter(Boolean) as string[];
  const db = createAdminClient();
  const [{ data: profiles }, { data: named }] = await Promise.all([db.from("profiles").select("id, tag").in("id", ids), db.from("hosted_guests").select("id, tag").in("id", ids)]);
  const tags = new Map(([...(profiles ?? []), ...(named ?? [])] as { id: string; tag: string }[]).map((t) => [t.id, t.tag]));
  return (id, fallback) => (id ? tags.get(id) : undefined) ?? fallback;
}

/** Everyone who runs the event: the host and any co-TOs. */
async function runnersOf(event: HostedEvent): Promise<string[]> {
  const { data } = await createAdminClient().from("hosted_cohosts").select("user_id").in("event_id", runBy(event));
  return [...new Set([event.hostId, ...((data ?? []) as { user_id: string }[]).map((c) => c.user_id)])];
}

/** Save the set's live state if nobody changed it since we read it (no bracket change). */
async function saveLive(row: SetRow, next: LiveState): Promise<string | null> {
  const { data, error } = await createAdminClient()
    .from("hosted_sets")
    .update({ live: next, updated_at: new Date().toISOString() })
    .eq("id", row.id)
    .eq("updated_at", row.updated_at)
    .in("state", ["ready", "live"])
    .select("id");
  if (error) return (await getT())("common.tryAgain");
  if (!data?.length) return (await getT())("setroom.err.setChanged");
  return null;
}

/**
 * Quick reporting: a player sends the set's final score (e.g. played on a setup without the
 * game-by-game room). It waits for the TO to confirm or deny it; the TO gets a notification.
 * Reporting again replaces your own report.
 */
export async function reportFinalScore(setId: string, winner: PlayerSlot, score: [number, number]): Promise<ActionResult> {
  const userId = await requireUser();
  const row = await loadSet(setId);
  if (!row) return { error: (await getT())("setroom.err.setGone") };
  const by: PlayerSlot | null = await slotInSet(row, userId);
  if (!by) return { error: (await getT())("setroom.err.playersOnlyReport") };
  if (row.state !== "ready" && row.state !== "live") return { error: (await getT())("setroom.err.setOver") };
  const event = await getHostedEvent(row.event_id);
  if (!event || event.removed || event.status !== "in_progress") return { error: (await getT())("setroom.err.notRunning") };
  const w: PlayerSlot = winner === 2 ? 2 : 1;
  const s: [number, number] = [Number(score?.[0]), Number(score?.[1])];
  const problem = finalScoreProblem(row.best_of, w, s);
  if (problem) return { error: problem };
  const live = row.live ?? freshLive();
  const next: LiveState = { ...live, finals: { ...live.finals, [String(by)]: { winner: w, score: s, at: new Date().toISOString() } } };
  const err = await saveLive(row, next);
  if (err) return { error: err };

  // Tell whoever runs the event (once every 5 minutes per set, so changing a report doesn't spam them).
  const db = createAdminClient();
  const href = `/host/set/${row.id}`;
  const to = (await runnersOf(event)).filter((id) => id !== userId);
  const { count } = await db
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .in("user_id", to)
    .eq("type", "event_update")
    .eq("event_href", href)
    .gt("created_at", new Date(Date.now() - 5 * 60_000).toISOString());
  if (to.length && !(count ?? 0)) {
    const tag = await sideTags(row);
    const [p1, p2] = [tag(row.p1_id, "Player"), tag(row.p2_id, "Player")];
    const trOf = await translatorsFor(to);
    const values = { winner: w === 1 ? p1 : p2, loser: w === 1 ? p2 : p1, score: `${Math.max(...s)}–${Math.min(...s)}`, event: event.name };
    await db.from("notifications").insert(to.map((id) => ({ user_id: id, actor_id: null, type: "event_update", event_name: trOf(id)("alert.ev.toConfirm", values).slice(0, 200), event_href: href })));
  }

  // Ask the other side to report too (if they haven't): when both agree, the TO confirms with one tap.
  // The other side's accounts: one player, or a team's members (a walk-in has nobody to ask).
  const opponent = by === 1 ? row.p2_id : row.p1_id;
  const others = opponent && !next.finals?.[by === 1 ? "2" : "1"] ? ((await accountsBehind([opponent], db)).get(opponent) ?? []) : [];
  if (others.length) {
    const { count: pinged } = await db
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .in("user_id", others)
      .eq("type", "event_update")
      .eq("event_href", href)
      .gt("created_at", new Date(Date.now() - 5 * 60_000).toISOString());
    if (!pinged) {
      const tag = await sideTags(row);
      const reporter = tag(by === 1 ? row.p1_id : row.p2_id, "Your opponent");
      const winnerTag = tag(w === 1 ? row.p1_id : row.p2_id, "Your opponent");
      const trOf = await translatorsFor(others);
      const values = { reporter, winner: winnerTag, score: `${Math.max(...s)}–${Math.min(...s)}`, event: event.name };
      await db.from("notifications").insert(others.map((user_id) => ({ user_id, actor_id: null, type: "event_update", event_name: trOf(user_id)("alert.ev.reported", values).slice(0, 200), event_href: href })));
    }
  }
  refresh();
  return {};
}

/** A player takes back their reported score (before the TO decides). */
export async function withdrawFinalScore(setId: string): Promise<ActionResult> {
  const userId = await requireUser();
  const row = await loadSet(setId);
  const slot = row ? await slotInSet(row, userId) : null;
  const by = slot ? (String(slot) as "1" | "2") : null;
  if (!row || !by || !row.live?.finals?.[by]) return { error: (await getT())("setroom.err.noReport") };
  const finals = { ...row.live.finals };
  delete finals[by];
  const err = await saveLive(row, { ...row.live, finals });
  if (err) return { error: err };
  refresh();
  return {};
}

/**
 * The TO reviews a reported score. Confirm records it in the bracket (players move on). `from` picks
 * which player's report when they differ. Deny clears the reports and tells both players to check in
 * with the TO.
 */
export async function reviewFinalScore(setId: string, decision: "confirm" | "deny", from?: PlayerSlot): Promise<ActionResult> {
  const userId = await requireUser();
  const row = await loadSet(setId);
  if (!row) return { error: (await getT())("setroom.err.setGone") };
  const event = await getHostedEvent(row.event_id);
  if (!event || !(await runsEvent(event, userId))) return { error: (await getT())("hostbracket.err.toReview") };
  if (row.state !== "ready" && row.state !== "live") return { error: (await getT())("setroom.err.setOver") };
  const finals = row.live?.finals ?? {};
  const agreed = finalsAgree(finals);
  // Both players reported and they differ: the TO has to say whose result to record. (A one-tap
  // Confirm from a page loaded before the second report must not quietly pick player 1's.)
  if (decision === "confirm" && !agreed && finals["1"] && finals["2"] && !from) {
    return { error: (await getT())("hostbracket.err.differentResults") };
  }
  const report = agreed ?? (from ? finals[String(from) as "1" | "2"] : (finals["1"] ?? finals["2"]));
  if (!report) return { error: (await getT())("hostbracket.err.noReports") };

  if (decision === "deny") {
    const err = await saveLive(row, { ...(row.live ?? freshLive()), finals: {} });
    if (err) return { error: err };
    const players = await playersWithAccounts([row.p1_id, row.p2_id]);
    const trOf = await translatorsFor(players);
    if (players.length) await createAdminClient().from("notifications").insert(players.map((id) => ({ user_id: id, actor_id: null, type: "event_update", event_name: trOf(id)("alert.ev.denied", { event: event.name }).slice(0, 200), event_href: `/host/set/${row.id}` })));
    refresh();
    return {};
  }

  try {
    await withBracketLock(event.id, async () => {
      const sets = await loadEngineSets(event.id);
      const me = sets.find((x) => x.key === row.id);
      if (!me || (me.state !== "ready" && me.state !== "live")) throw new Error((await getT())("setroom.err.setOver"));
      if (!samePair(me, row.p1_id, row.p2_id)) throw new Error((await getT())("setroom.err.setChanged"));
      await saveChanges(event.id, sets, reportResult(sets, row.id, report.winner, report.score));
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : (await getT())("hostbracket.err.recordFailed") };
  }
  refresh();
  return {};
}

/**
 * The TO confirms every set where both players reported the same final score, in one go. Sets where
 * they disagree, or only one player reported, are left for the TO to look at.
 */
export async function confirmAgreedResults(eventId: string): Promise<ActionResult & { confirmed?: number }> {
  const userId = await requireUser();
  if (!UUID.test(eventId)) return { error: (await getT())("entering.err.eventUnavailable") };
  const event = await getHostedEvent(eventId);
  if (!event || !(await runsEvent(event, userId))) return { error: (await getT())("hostbracket.err.toConfirm") };
  if (event.status !== "in_progress") return { error: (await getT())("hostbracket.err.notRunning") };
  const { data } = await createAdminClient().from("hosted_sets").select("id, live, p1_id, p2_id").eq("event_id", event.id).in("state", ["ready", "live"]);
  const agreed = ((data ?? []) as { id: string; live: LiveState | null; p1_id: string | null; p2_id: string | null }[]).flatMap((s) => {
    const r = finalsAgree(s.live?.finals);
    return r ? [{ id: s.id, r, p1: s.p1_id, p2: s.p2_id }] : [];
  });
  if (!agreed.length) return { error: (await getT())("hostbracket.err.noneAgreed") };
  let confirmed = 0;
  try {
    // One bracket change at a time, each on freshly loaded sets (an earlier result can call a later set).
    await withBracketLock(event.id, async () => {
      for (const { id, r, p1, p2 } of agreed) {
        const sets = await loadEngineSets(event.id);
        const me = sets.find((x) => x.key === id);
        if (!me || (me.state !== "ready" && me.state !== "live")) continue;
        if (!samePair(me, p1, p2)) continue; // its players changed since the reports: left for the TO (round 640)
        await saveChanges(event.id, sets, reportResult(sets, id, r.winner, r.score));
        confirmed++;
      }
    });
  } catch (e) {
    refresh();
    return { error: e instanceof Error ? e.message : (await getT())("hostbracket.err.recordAllFailed"), confirmed };
  }
  refresh();
  return { confirmed };
}

/**
 * The TO says where a set is played ("Setup 3", "Stream"). Both players get told (once per setup), and
 * it shows on their set, the event page and "On now". An empty value clears it.
 */
export async function setStation(setId: string, raw: string): Promise<ActionResult> {
  const userId = await requireUser();
  const row = await loadSet(setId);
  if (!row) return { error: (await getT())("setroom.err.setGone") };
  const event = await getHostedEvent(row.event_id);
  if (!event || !(await runsEvent(event, userId))) return { error: (await getT())("hostbracket.err.toSetups") };
  if (row.state !== "ready" && row.state !== "live") return { error: (await getT())("setroom.err.setOver") };
  const station = cleanStation(raw);
  if (station && contactInfoReason(station)) return { error: (await getT())("hostbracket.err.setupName") };
  const live = row.live ?? freshLive();
  if ((live.station ?? null) === station) return {};
  const next: LiveState = { ...live };
  if (station) {
    next.station = station;
    next.stationAt = new Date().toISOString(); // the no-show clock starts over at the new place
  } else {
    delete next.station;
    delete next.stationAt;
  }
  const err = await saveLive(row, next);
  if (err) return { error: err };
  // Told once per set in 10 minutes, so switching a set between setups doesn't keep notifying them (round 635).
  const recently = station
    ? (
        await createAdminClient()
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("type", "event_update")
          .eq("event_href", `/host/set/${row.id}`)
          .or(sentInAnyLanguage("alert.ev.onStation"))
          .gt("created_at", new Date(Date.now() - 10 * 60_000).toISOString())
      ).count ?? 0
    : 0;
  if (station && !recently) {
    const players = await playersWithAccounts([row.p1_id, row.p2_id]);
    const trOf = await translatorsFor(players);
    if (players.length) await createAdminClient().from("notifications").insert(players.map((id) => ({ user_id: id, actor_id: null, type: "event_update", event_name: trOf(id)("alert.ev.onStation", { event: event.name, station }).slice(0, 200), event_href: `/host/set/${row.id}` })));
  }
  // The numbered setup this set left (or the one it didn't take) can go to a set that's waiting.
  await assignSetups(event.id);
  refresh();
  return {};
}

/**
 * A player at their setup says so. It stops the no-show clock for their side, and shows the TO who
 * turned up. Tapping again changes nothing.
 */
export async function imHere(setId: string): Promise<ActionResult> {
  const userId = await requireUser();
  // Twice, in case the set changed between reading and saving (the opponent tapping at the same moment).
  for (let attempt = 0; attempt < 2; attempt++) {
    const row = await loadSet(setId);
    if (!row) return { error: (await getT())("entering.err.setUnavailable") };
    const slot = await slotInSet(row, userId);
    if (!slot) return { error: (await getT())("entering.err.onlyPlayers") };
    if (row.state !== "ready" && row.state !== "live") return { error: (await getT())("entering.err.setOver") };
    const live = row.live ?? freshLive();
    const key = String(slot) as "1" | "2";
    if (!live.here?.[key]) {
      const err = await saveLive(row, { ...live, here: { ...live.here, [key]: new Date().toISOString() } });
      if (err) continue;
    }
    refresh();
    return {};
  }
  return { error: (await getT())("entering.err.setChanged") };
}

/** Save your connect code for an event (Slippi code, arena ID or friend code). */
export async function saveConnectCode(eventId: string, code: string): Promise<ActionResult> {
  const userId = await requireUser();
  const value = String(code ?? "").trim();
  if (!UUID.test(eventId)) return { error: (await getT())("entering.err.eventUnavailable") };
  if (value && !/^[A-Za-z0-9#: /-]{2,40}$/.test(value)) return { error: (await getT())("entering.err.codeChars") };
  if (value && !/^SW[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}$/i.test(value) && contactInfoReason(value)) return { error: (await getT())("entering.err.codePhone") };
  const supabase = await createClient();
  // Codes live in their own table: only you can read yours (the server shows it to your opponent and the host).
  let error: unknown = null;
  if (!value) {
    ({ error } = await supabase.from("hosted_connect_codes").delete().eq("event_id", eventId).eq("user_id", userId));
  } else {
    const upd = await supabase.from("hosted_connect_codes").update({ code: value, updated_at: new Date().toISOString() }).eq("event_id", eventId).eq("user_id", userId).select("user_id");
    error = upd.error;
    if (!error && !upd.data?.length) ({ error } = await supabase.from("hosted_connect_codes").insert({ event_id: eventId, user_id: userId, code: value }));
  }
  if (error) return { error: (await getT())("entering.err.codeSave") };
  if (value) await tellOpponentCode(eventId, userId, value).catch(() => {}); // a nice-to-have: never fails the save
  refresh();
  return {};
}

/**
 * Online sets: when a player in a called set saves their code, their opponent is told (with the
 * code), since the opponent's set page doesn't update on its own for codes. At most once every
 * 2 minutes per set, so fixing a typo doesn't spam them.
 */
async function tellOpponentCode(eventId: string, userId: string, code: string) {
  const db = createAdminClient();
  // The set they should be playing now (in a round robin a player has several open at once).
  const { data: open } = await db
    .from("hosted_sets")
    .select("id, p1_id, p2_id, state, bracket, round, pool, idx")
    .eq("event_id", eventId)
    .in("state", ["ready", "live"])
    .or(`p1_id.eq.${userId},p2_id.eq.${userId}`)
    .limit(50);
  type Open = { id: string; p1_id: string | null; p2_id: string | null } & Parameters<typeof byPlayNow>[0];
  const set = ((open ?? []) as Open[]).sort(byPlayNow)[0];
  const opponent = set ? (set.p1_id === userId ? set.p2_id : set.p1_id) : null;
  if (!set || !opponent) return;
  const href = `/host/set/${set.id}`;
  const { count } = await db
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", opponent)
    .eq("type", "event_update")
    .eq("event_href", href)
    .or(sentInAnyLanguage("alert.ev.code"))
    .gt("created_at", new Date(Date.now() - 2 * 60_000).toISOString());
  if ((count ?? 0) > 0) return;
  const [{ data: me }, event] = await Promise.all([db.from("profiles").select("tag").eq("id", userId).maybeSingle(), getHostedEvent(eventId)]);
  if (!event || event.status !== "in_progress") return;
  const t = (await translatorsFor([opponent]))(opponent);
  const text = t("alert.ev.code", { event: event.name, who: (me?.tag as string | undefined) ?? t("alert.ev.yourOpponent"), code }).slice(0, 200);
  await db.from("notifications").insert({ user_id: opponent, actor_id: null, type: "event_update", event_name: text, event_href: href });
}

/**
 * A player asks the host for help with their set (a dispute, lag, a no-show, a rules question).
 * The host gets a notification (and push) that opens the set. At most once every 5 minutes per set.
 */
export async function callHost(setId: string): Promise<ActionResult> {
  const userId = await requireUser();
  const row = await loadSet(setId);
  if (!row || !(await slotInSet(row, userId))) return { error: (await getT())("entering.err.onlyPlayersCall") };
  if (!["ready", "live"].includes(row.state)) return { error: (await getT())("entering.err.setOver") };
  const event = await getHostedEvent(row.event_id);
  if (!event || event.removed || event.status !== "in_progress") return { error: (await getT())("entering.err.notRunning") };
  if (event.hostId === userId) return { error: (await getT())("entering.err.youreHost") };
  const db = createAdminClient();
  const href = `/host/set/${row.id}`;
  const { count } = await db
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", event.hostId)
    .eq("type", "event_update")
    .eq("event_href", href)
    .gt("created_at", new Date(Date.now() - 5 * 60_000).toISOString());
  if ((count ?? 0) > 0) return { error: (await getT())("entering.err.justCalled") };
  const [{ data: me }, { data: set }] = await Promise.all([
    db.from("profiles").select("tag").eq("id", userId).maybeSingle(),
    db.from("hosted_sets").select("identifier").eq("id", row.id).maybeSingle(),
  ]);
  const text = (t: (key: "alert.ev.help" | "alert.ev.aPlayer", values?: Record<string, string>) => string) =>
    t("alert.ev.help", { who: (me?.tag as string | undefined) ?? t("alert.ev.aPlayer"), set: set?.identifier ?? "", event: event.name }).replace(/\s+/g, " ").slice(0, 200);
  // The host and any co-TOs (not the player calling, if they're a co-TO too).
  const { data: cohosts } = await db.from("hosted_cohosts").select("user_id").in("event_id", runBy(event));
  const to = [...new Set([event.hostId, ...((cohosts ?? []) as { user_id: string }[]).map((c) => c.user_id)])].filter((id) => id !== userId);
  const trOf = await translatorsFor(to);
  const { error } = await db.from("notifications").insert(to.map((id) => ({ user_id: id, actor_id: null, type: "event_update", event_name: text(trOf(id)), event_href: href })));
  if (error) return { error: (await getT())("entering.err.cantReachHost") };
  return {};
}
