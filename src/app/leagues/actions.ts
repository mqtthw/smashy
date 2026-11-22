"use server";
// Leagues: start one, join, leave, the organizer removing a player before it starts (L1), and the
// organizer's setup: seeds, divisions, and starting the league with its weekly pairings (L2).
import { isTimeZone } from "@/lib/timeZone";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionError, type ActionResult } from "@/lib/actionErrors";
import { isGameKey } from "@/lib/games";
import { contactInfoReason } from "@/lib/guardrails";
import { getT } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getVerifiedUserId } from "@/lib/supabase/server";
import { roundRobinWeeks, weekDeadline } from "@/lib/leagueSchedule";
import { cleanPublicText } from "@/lib/wordFilter";

export type LeagueFormState = { error?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const str = (f: FormData, k: string, max = 2000) => String(f.get(k) ?? "").replace(/\r/g, "").trim().slice(0, max);
function intIn(v: FormDataEntryValue | null, min: number, max: number, fallback: number) {
  const n = Number.parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

export async function createLeague(_prev: LeagueFormState, formData: FormData): Promise<LeagueFormState> {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/signin?next=/leagues/new");
  const t = await getT();
  const rawName = str(formData, "name", 120).replace(/\s+/g, " ");
  if (rawName.length < 3 || rawName.length > 80) return { error: t("league.err.name") };
  if (contactInfoReason(rawName)) return { error: t("league.err.contact") };
  const name = cleanPublicText(rawName);
  if (name.flagged) return { error: t("league.err.name") };
  const game = str(formData, "game");
  if (!isGameKey(game)) return { error: t("league.err.game") };
  const startsAt = Date.parse(str(formData, "starts_at_iso", 40));
  if (!Number.isFinite(startsAt)) return { error: t("league.err.start") };
  const online = formData.get("online") !== "in_person";
  const location = online ? null : str(formData, "location", 120) || null;
  if (!online && (!location || location.length < 2)) return { error: t("league.err.location") };
  const rawDescription = str(formData, "description", 2000) || null;
  if ((rawDescription && contactInfoReason(rawDescription)) || (location && contactInfoReason(location))) return { error: t("league.err.contact") };
  // The description goes through the word filter like the name (round 719): swearing masked, worse refused.
  const cleanDescription = rawDescription ? cleanPublicText(rawDescription) : null;
  if (cleanDescription?.flagged) return { error: t("league.err.contact") };
  const description = cleanDescription?.text ?? null;
  const tzSent = str(formData, "timezone", 60);
  const tz = isTimeZone(tzSent) ? tzSent : "America/Chicago"; // round 635
  const playoffs = formData.get("playoffs") === "on";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leagues")
    .insert({
      host_id: userId,
      name: name.text,
      game,
      online,
      location,
      timezone: tz,
      starts_at: new Date(startsAt).toISOString(),
      weeks: intIn(formData.get("weeks"), 1, 20, 6),
      best_of: intIn(formData.get("best_of"), 1, 9, 3),
      playoff_size: playoffs ? intIn(formData.get("playoff_size"), 2, 16, 4) : null,
      player_cap: intIn(formData.get("player_cap"), 2, 256, 64),
      description,
    })
    .select("id")
    .single();
  if (error) return { error: actionError(error).error ?? t("league.err.save") };
  redirect(`/leagues/${data.id}`);
}

async function call(fn: "join_league" | "leave_league", id: string): Promise<ActionResult> {
  if (!UUID.test(id)) return { error: (await getT())("league.err.unavailable") };
  const userId = await getVerifiedUserId();
  if (!userId) redirect(`/signin?next=${encodeURIComponent(`/leagues/${id}`)}`);
  const { error } = await (await createClient()).rpc(fn, { lg: id });
  if (error) return actionError(error);
  revalidatePath(`/leagues/${id}`);
  return {};
}

export async function joinLeague(id: string) {
  return call("join_league", id);
}

export async function leaveLeague(id: string) {
  return call("leave_league", id);
}

export async function removeLeaguePlayer(id: string, person: string): Promise<ActionResult> {
  if (!UUID.test(id) || !UUID.test(person)) return { error: (await getT())("league.err.unavailable") };
  if (!(await getVerifiedUserId())) redirect(`/signin?next=${encodeURIComponent(`/leagues/${id}`)}`);
  const { error } = await (await createClient()).rpc("league_remove_player", { lg: id, person });
  if (error) return actionError(error);
  revalidatePath(`/leagues/${id}`);
  return {};
}

// ---------- Step L2: the organizer's setup (seeds, divisions) and starting the league ----------

/** The league, if the signed-in member organizes it and sign-ups are still open. */
async function organizing(id: string): Promise<{ userId: string; league: { id: string; starts_at: string; weeks: number; status: string } } | { error: string }> {
  const t = await getT();
  if (!UUID.test(id)) return { error: t("league.err.unavailable") };
  const userId = await getVerifiedUserId();
  if (!userId) redirect(`/signin?next=${encodeURIComponent(`/leagues/${id}/manage`)}`);
  const { data: league } = await createAdminClient().from("leagues").select("id, host_id, starts_at, weeks, status, removed_at").eq("id", id).maybeSingle();
  if (!league || league.removed_at || league.host_id !== userId) return { error: t("league.err.notOrganizer") };
  if (league.status !== "signups") return { error: t("league.err.started") };
  return { userId, league };
}

export type SetupRow = { userId: string; seed: number | null; division: number | null };

/** Saves seeds and divisions (players not listed keep theirs). */
export async function saveLeagueSetup(id: string, rows: SetupRow[]): Promise<ActionResult> {
  const org = await organizing(id);
  if ("error" in org) return org;
  const clean = rows.filter((r) => UUID.test(r.userId)).slice(0, 300).map((r) => ({
    userId: r.userId,
    seed: Number.isInteger(r.seed) && r.seed! >= 1 && r.seed! <= 256 ? r.seed : null,
    division: Number.isInteger(r.division) && r.division! >= 1 && r.division! <= 32 ? r.division : null,
  }));
  const db = createAdminClient();
  for (const r of clean) {
    const { error } = await db.from("league_players").update({ seed: r.seed, division: r.division }).eq("league_id", id).eq("user_id", r.userId);
    if (error) return { error: (await getT())("league.err.save") };
  }
  revalidatePath(`/leagues/${id}`);
  return {};
}

/**
 * Closes sign-ups and builds every week's pairings (a round robin inside each division). Every player
 * needs a division, and every division at least 2 players.
 */
export async function startLeague(id: string): Promise<ActionResult> {
  const org = await organizing(id);
  if ("error" in org) return org;
  const t = await getT();
  const db = createAdminClient();
  const { data: players } = await db.from("league_players").select("user_id, division, seed, created_at").eq("league_id", id);
  const rows = (players ?? []) as { user_id: string; division: number | null; seed: number | null; created_at: string }[];
  if (rows.length < 2) return { error: t("league.err.fewPlayers") };
  if (rows.some((r) => !r.division)) return { error: t("league.err.unplaced") };
  const divisions = new Map<number, typeof rows>();
  for (const r of rows) divisions.set(r.division!, [...(divisions.get(r.division!) ?? []), r]);
  if ([...divisions.values()].some((d) => d.length < 2)) return { error: t("league.err.smallDivision") };

  const start = Date.parse(org.league.starts_at);
  const sets: { league_id: string; division: number; week: number; p1_id: string; p2_id: string; deadline: string }[] = [];
  for (const [division, members] of divisions) {
    // Seed order inside the division (unseeded by sign-up time), so the schedule doesn't depend on chance.
    const order = [...members].sort((a, b) => (a.seed ?? Infinity) - (b.seed ?? Infinity) || a.created_at.localeCompare(b.created_at)).map((m) => m.user_id);
    roundRobinWeeks(order, org.league.weeks).forEach((week, i) => {
      for (const [p1, p2] of week) sets.push({ league_id: id, division, week: i + 1, p1_id: p1, p2_id: p2, deadline: weekDeadline(start, i + 1).toISOString() });
    });
  }
  // The status changes first and only from "signups", so a double tap can't build the schedule twice.
  const { data: started } = await db.from("leagues").update({ status: "running" }).eq("id", id).eq("status", "signups").select("id");
  if (!started?.length) return { error: t("league.err.started") };
  const { error } = await db.from("league_sets").insert(sets);
  if (error) {
    await db.from("leagues").update({ status: "signups" }).eq("id", id);
    console.error("startLeague: sets insert failed", error.code, error.message);
    return { error: t("league.err.save") };
  }
  revalidatePath(`/leagues/${id}`);
  redirect(`/leagues/${id}`);
}

// ---------- Step L3: reporting weekly sets, and the organizer settling them ----------

/** A player reports their set (the database checks it's theirs and the score is a finished set). */
export async function reportLeagueSet(leagueId: string, setId: string, mine: number, theirs: number): Promise<ActionResult & { state?: string }> {
  if (!UUID.test(leagueId) || !UUID.test(setId)) return { error: (await getT())("league.err.unavailable") };
  if (!(await getVerifiedUserId())) redirect(`/signin?next=${encodeURIComponent(`/leagues/${leagueId}`)}`);
  const { data, error } = await (await createClient()).rpc("report_league_set", { s: setId, mine, theirs });
  if (error) return actionError(error);
  revalidatePath(`/leagues/${leagueId}`);
  return { state: String(data) };
}

export type Settle = { kind: "score"; p1: number; p2: number } | { kind: "no_show"; winner: "p1" | "p2" } | { kind: "double_loss" } | { kind: "reset" };

/** The organizer settles a set: a score (confirmed), a no-show win, a double loss, or back to unplayed. */
export async function settleLeagueSet(leagueId: string, setId: string, how: Settle): Promise<ActionResult> {
  const t = await getT();
  if (!UUID.test(leagueId) || !UUID.test(setId)) return { error: t("league.err.unavailable") };
  const userId = await getVerifiedUserId();
  if (!userId) redirect(`/signin?next=${encodeURIComponent(`/leagues/${leagueId}/manage`)}`);
  const db = createAdminClient();
  const [{ data: league }, { data: set }] = await Promise.all([
    db.from("leagues").select("host_id, status, best_of, removed_at").eq("id", leagueId).maybeSingle(),
    db.from("league_sets").select("id, league_id, p1_id, p2_id").eq("id", setId).maybeSingle(),
  ]);
  if (!league || league.removed_at || league.host_id !== userId || !set || set.league_id !== leagueId) return { error: t("league.err.notOrganizer") };
  if (league.status !== "running") return { error: t("league.err.notRunning") };
  let change: Record<string, unknown>;
  if (how.kind === "score") {
    const need = Math.floor(league.best_of / 2) + 1;
    const ok = Number.isInteger(how.p1) && Number.isInteger(how.p2) && how.p1 >= 0 && how.p2 >= 0 && how.p1 !== how.p2 && Math.max(how.p1, how.p2) === need;
    if (!ok) return { error: t("league.err.score", { n: need }) };
    change = { state: "confirmed", p1_score: how.p1, p2_score: how.p2, winner_id: how.p1 > how.p2 ? set.p1_id : set.p2_id };
  } else if (how.kind === "no_show") {
    change = { state: "no_show", p1_score: null, p2_score: null, winner_id: how.winner === "p1" ? set.p1_id : set.p2_id };
  } else if (how.kind === "double_loss") {
    change = { state: "double_loss", p1_score: null, p2_score: null, winner_id: null };
  } else {
    change = { state: "pending", p1_score: null, p2_score: null, winner_id: null, reported_by: null, reported_at: null };
  }
  const { error } = await db.from("league_sets").update({ ...change, ...(how.kind !== "reset" ? { reported_by: userId, reported_at: new Date().toISOString() } : {}) }).eq("id", setId);
  if (error) return { error: t("league.err.save") };
  revalidatePath(`/leagues/${leagueId}`);
  revalidatePath(`/leagues/${leagueId}/manage`);
  return {};
}

/** The organizer deletes their league, with its players and sets (any time; it can't be undone). */
export async function deleteLeague(id: string): Promise<ActionResult> {
  const t = await getT();
  if (!UUID.test(id)) return { error: t("league.err.unavailable") };
  const userId = await getVerifiedUserId();
  if (!userId) redirect(`/signin?next=${encodeURIComponent(`/leagues/${id}/manage`)}`);
  const db = createAdminClient();
  const { data: league } = await db.from("leagues").select("host_id").eq("id", id).maybeSingle();
  if (!league || league.host_id !== userId) return { error: t("league.err.notOrganizer") };
  const { error } = await db.from("leagues").delete().eq("id", id).eq("host_id", userId);
  if (error) return { error: t("league.err.save") };
  revalidatePath("/leagues");
  redirect("/leagues");
}
