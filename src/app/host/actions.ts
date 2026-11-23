"use server";

import { isTimeZone } from "@/lib/timeZone";
import { sentInAnyLanguage, translatorsFor, type Tr } from "@/lib/i18n/recipients";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { actionError, type ActionResult } from "@/lib/actionErrors";
import { GAME_KEYS, GAMES, type GameKey } from "@/lib/games";
import { challongeConfigured, copyToChallonge } from "@/lib/challonge";
import { getPrNames, nameForCopy, savePrName } from "@/lib/prNames";
import { contactInfoReason } from "@/lib/guardrails";
import { cleanPublicText } from "@/lib/wordFilter";
import { createClient, getVerifiedUserId } from "@/lib/supabase/server";
import { disqualified, fixResult, outSoFar, reportResult, undoResult } from "@/lib/bracketEngine";
import { BRACKET_NAME_MIN, MAX_EXTRA_BRACKETS, bracketFullName, cleanBracketName, planBringOver } from "@/lib/eventBrackets";
import { getHostedEntrants, getHostedEvent, runsEvent } from "@/lib/hostedEvents";
import { cleanTeamName, readPartner, TEAM_NAME_MAX } from "@/lib/teams";
import { connectedMessage, postDiscord, readWebhook, signupMessage } from "@/lib/discordMessages";
import { getHook, sendTo } from "@/lib/discord";
import { siteUrl } from "@/lib/siteMeta";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSiteAdmin } from "@/lib/scenes";
import { officialAccountId } from "@/lib/official";
import { getLang, getT } from "@/lib/i18n/server";
import { ordinalFor } from "@/lib/i18n/ordinal";
import { sameLocalTimeLater } from "@/lib/weeklies";
import { IMPORT_MAX, isEventSlug, planImport, readStartggLink } from "@/lib/startggImport";
import { getStartggEntrantList, getStartggEventChoices } from "@/lib/brackets/startgg";
import { bracketEntrants, bracketPlayers, createBracket, deleteBracket, loadEngineSets, nextSwissRound, playersWithAccounts, redoSwissRound, saveChanges, startFinalBracket, withBracketLock } from "@/lib/hostedBracket";
import { orNull } from "@/lib/supabase/loose";

export type HostFormState = { error?: string };

const FORMATS = ["double_elim", "single_elim", "round_robin", "swiss", "social"] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireUser() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/signin");
  return userId;
}

function intIn(v: FormDataEntryValue | null, min: number, max: number, fallback: number) {
  const n = Number.parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

/**
 * Create an event, or save changes to one you host (`id` set). With `parent_id`, it's an extra
 * bracket of that event (a Redemption bracket, a second game): it has its own short name, and takes
 * the main event's place and time zone.
 */
export async function saveHostedEvent(_prev: HostFormState, formData: FormData): Promise<HostFormState> {
  const userId = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (id && !UUID.test(id)) return { error: (await getT())("entering.err.eventUnavailable") };
  const supabase = await createClient();
  const { data: before } = id ? await supabase.from("hosted_events").select("starts_at, parent_id").eq("id", id).maybeSingle() : { data: null };
  if (id && !before) return { error: (await getT())("entering.err.eventUnavailable") };
  // Which event a bracket belongs to is set when it's made; afterwards it's read from the bracket itself.
  const mainId = id ? ((before?.parent_id as string | null) ?? "") : String(formData.get("parent_id") ?? "");
  let main: { id: string; name: string; online: boolean; location: string | null; region: string | null; timezone: string; official: boolean } | null = null;
  if (mainId) {
    const { data: m } = UUID.test(mainId)
      ? await supabase.from("hosted_events").select("id, host_id, name, online, location, region, timezone, parent_id, removed_at, official").eq("id", mainId).maybeSingle()
      : { data: null };
    if (!m || m.host_id !== userId || m.parent_id || m.removed_at) return { error: (await getT())("hostrun.err.onlyOwnBrackets") };
    main = { id: m.id as string, name: m.name as string, online: !!m.online, location: (m.location as string | null) ?? null, region: (m.region as string | null) ?? null, timezone: (m.timezone as string) || "America/Chicago", official: !!m.official };
  }
  const bracketName = main ? cleanBracketName(formData.get("bracket_name")) : "";
  if (main && bracketName.length < BRACKET_NAME_MIN) return { error: (await getT())("hostrun.err.bracketName") };
  // A bracket goes by "<main event>: <its own name>" wherever one name is shown.
  const name = main ? bracketFullName(main.name, bracketName) : String(formData.get("name") ?? "").replace(/\s+/g, " ").trim();
  const game = String(formData.get("game") ?? "") as GameKey;
  const online = main ? main.online : formData.get("online") !== "in_person";
  const location = main ? main.location : online ? null : String(formData.get("location") ?? "").trim() || null;
  const region = main ? main.region : online ? String(formData.get("region") ?? "").trim().slice(0, 40) || null : null;
  const startsAt = String(formData.get("starts_at_iso") ?? "");
  const tzSent = String(formData.get("timezone") ?? "").slice(0, 60);
  const timezone = main ? main.timezone : isTimeZone(tzSent) ? tzSent : "America/Chicago"; // round 635: a made-up zone broke times later
  const format = String(formData.get("format") ?? "double_elim");
  const social = format === "social"; // no bracket: its bracket settings are left at their defaults
  const rulesetRaw = social ? "" : String(formData.get("ruleset_id") ?? "");
  // A final bracket for the top players: only after round robin pools or Swiss.
  const finalRaw = String(formData.get("final_format") ?? "");
  const finalFormat = (format === "round_robin" || format === "swiss") && (finalRaw === "single_elim" || finalRaw === "double_elim") ? finalRaw : null;
  const description = String(formData.get("description") ?? "").replace(/\r\n/g, "\n").trim() || null;

  if (name.length < 3 || name.length > 80) return { error: (await getT())("hostrun.err.name") };
  if (!GAME_KEYS.includes(game)) return { error: (await getT())("hostrun.err.pickGame") };
  if (!(FORMATS as readonly string[]).includes(format)) return { error: (await getT())("hostrun.err.pickFormat") };
  const when = Date.parse(startsAt);
  if (!Number.isFinite(when)) return { error: (await getT())("hostrun.err.pickTime") };
  if (!main && !online && (!location || location.length < 2)) return { error: (await getT())("hostrun.err.addWhere") };
  if (description && description.length > 2000) return { error: (await getT())("hostrun.err.description") };
  // No phone numbers, emails or links to other apps in event details (the same rule as chat).
  const blocked =
    contactInfoReason(name) ??
    (description ? contactInfoReason(description) : null) ??
    (location ? contactInfoReason(location) : null) ??
    (region ? contactInfoReason(region) : null);
  if (blocked) return { error: blocked.replace("in chat", "in event details") };

  const row = {
    name,
    game,
    online,
    location,
    region,
    starts_at: new Date(when).toISOString(),
    timezone,
    format,
    ruleset_id: UUID.test(rulesetRaw) ? rulesetRaw : null,
    best_of: intIn(formData.get("best_of"), 1, 9, 3),
    best_of_top: formData.get("best_of_top") ? intIn(formData.get("best_of_top"), 1, 9, 5) : null,
    // Swiss only: how many rounds. Empty = the usual number for however many players start.
    swiss_rounds: format === "swiss" && formData.get("swiss_rounds") ? intIn(formData.get("swiss_rounds"), 1, 12, 4) : null,
    final_format: finalFormat,
    final_size: finalFormat ? intIn(formData.get("final_size"), 2, 64, 8) : null,
    entrant_cap: intIn(formData.get("entrant_cap"), 2, 512, 64),
    checkin_minutes: social ? 0 : intIn(formData.get("checkin_minutes"), 0, 240, main ? 0 : 30),
    // A night that runs itself: how many setups to hand out, and the no-show clock. Empty = off.
    setups: !social && formData.get("setups") ? intIn(formData.get("setups"), 1, 64, 4) : null,
    no_show_minutes: !social && formData.get("no_show_minutes") ? intIn(formData.get("no_show_minutes"), 3, 60, 10) : null,
    description,
    ...(main ? { bracket_name: bracketName } : {}),
  };

  if (id) {
    // The game is fixed once an event exists (the form shows it greyed out), and the database refuses
    // a save that includes it: sending it along made every edit fail with "Couldn't save that".
    const changes: Partial<typeof row> = { ...row };
    delete changes.game;
    // Only before the bracket starts: changing the format or ruleset mid-bracket would break it.
    const { data: saved, error } = await supabase.from("hosted_events").update(changes).eq("id", id).eq("host_id", userId).in("status", ["open", "closed"]).select("id");
    if (error) return { error: actionError(error).error ?? (await getT())("hostrun.err.saveFailed") };
    if (!saved?.length) return { error: (await getT())("hostrun.err.notEditable") };
    if (before && Math.abs(Date.parse(before.starts_at as string) - Date.parse(row.starts_at)) > 60_000 && !(await toldRecently(id, "alert.ev.newTime", 30))) {
      await notifyEntrants(id, (t) => t("alert.ev.newTime", { event: name }));
    }
    if (!main) await syncBrackets(supabase, id, row).catch(() => {}); // never undoes the save
    redirect(`/host/${id}`);
  }
  let seriesRaw = main ? "" : String(formData.get("series_id") ?? "");
  if (UUID.test(seriesRaw)) {
    const { data: root } = await supabase.from("hosted_events").select("host_id").eq("id", seriesRaw).maybeSingle();
    if (root?.host_id !== userId) seriesRaw = ""; // only your own series
  }
  // An official Smashy event (round 457): a site admin hosts as Smashy. Extra brackets follow their main event.
  const official = main ? main.official : formData.get("official") === "on" && (await isSiteAdmin(userId).catch(() => false));
  const { data, error } = await supabase
    .from("hosted_events")
    // Singles or doubles is chosen here and fixed after that (the entries would have to be remade).
    .insert({ ...row, host_id: userId, ...(official ? { official: true } : {}), ...(formData.get("team_size") === "2" ? { team_size: 2 } : {}), ...(main ? { parent_id: main.id } : {}), ...(UUID.test(seriesRaw) ? { series_id: seriesRaw } : {}) })
    .select("id")
    .single();
  if (error) {
    if (error.code === "P0429") return { error: main ? (await getT())("hostrun.err.manyBrackets") : (await getT())("hostrun.err.manyEvents") };
    return { error: actionError(error).error ?? (main ? (await getT())("hostrun.err.addBracketFailed") : (await getT())("hostrun.err.createFailed")) };
  }
  if (!main && formData.get("share") === "on") {
    // A post with the event's card (it shows sign-ups now, and results later). Never blocks creating.
    // An official event is announced by Smashy's own account.
    const smashy = official ? await officialAccountId().catch(() => null) : null;
    const db = smashy ? createAdminClient() : supabase;
    await db.from("posts").insert({ author_id: smashy ?? userId, game, body: (await getT())("hostrun.post.hosting", { event: name }), hosted_event_id: data.id });
  }
  redirect(`/host/${data.id}`);
}

/** A main event was edited: its extra brackets keep its name in theirs, and happen where it does. */
async function syncBrackets(
  supabase: Awaited<ReturnType<typeof createClient>>,
  mainId: string,
  main: { name: string; online: boolean; location: string | null; region: string | null; timezone: string },
) {
  const { data } = await supabase.from("hosted_events").select("id, bracket_name").eq("parent_id", mainId).limit(MAX_EXTRA_BRACKETS);
  await Promise.all(
    ((data ?? []) as { id: string; bracket_name: string | null }[]).map((b) =>
      supabase
        .from("hosted_events")
        .update({ name: bracketFullName(main.name, b.bracket_name ?? "Bracket"), online: main.online, location: main.location, region: main.region, timezone: main.timezone })
        .eq("id", b.id),
    ),
  );
}

async function rpc(fn: string, args: Record<string, unknown>): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  // The callers below pass the function's name and arguments as plain text, so they aren't checked
  // against the database types here; each database function checks its own arguments.
  const { error } = await supabase.rpc(fn as never, args as never);
  if (error) return actionError(error);
  refresh();
  return {};
}

export async function joinHostedEvent(ev: string) {
  return rpc("join_hosted_event", { ev });
}
export async function leaveHostedEvent(ev: string) {
  return rpc("leave_hosted_event", { ev });
}
export async function checkInHostedEvent(ev: string) {
  return rpc("check_in_hosted_event", { ev });
}
/** The event is full: get in line. When a spot opens, the first in line is signed up and told. */
export async function joinHostedWaitlist(ev: string) {
  return rpc("join_hosted_waitlist", { ev });
}
export async function leaveHostedWaitlist(ev: string) {
  return rpc("leave_hosted_waitlist", { ev });
}

/**
 * Host or co-TO: tick (or untick) an entry as paid. It's the TO's own checklist for the venue or
 * entry fee: Smashy never takes payments, and nobody else sees the ticks.
 */
export async function setEntryPaid(ev: string, entry: string, paid: boolean): Promise<ActionResult> {
  const userId = await requireUser();
  if (!UUID.test(ev) || !UUID.test(entry)) return { error: (await getT())("hostrun.err.couldntSave") };
  const event = await hostedEventForHost(ev);
  if (!event) return { error: (await getT())("hostrun.err.hostOrCohost") };
  const db = createAdminClient();
  if (!paid) {
    const { error } = await db.from("hosted_paid").delete().eq("event_id", event.id).eq("entry_id", entry);
    return error ? { error: (await getT())("common.tryAgain") } : {};
  }
  // Only someone who's in the event (a player, a walk-in or a team).
  const [{ data: player }, { data: named }] = await Promise.all([
    db.from("hosted_entrants").select("user_id").eq("event_id", event.id).eq("user_id", entry).maybeSingle(),
    db.from("hosted_guests").select("id").eq("event_id", event.id).eq("id", entry).maybeSingle(),
  ]);
  if (!player && !named) return { error: (await getT())("hostrun.err.notInEvent") };
  const { error } = await db.from("hosted_paid").upsert({ event_id: event.id, entry_id: entry, marked_by: userId }, { onConflict: "event_id,entry_id", ignoreDuplicates: true });
  return error ? { error: (await getT())("common.tryAgain") } : {};
}
export async function removeEntrant(ev: string, person: string) {
  return rpc("host_remove_entrant", { ev, person });
}

// ---------- Doubles: the entries are teams of two ----------

/** Sign up with a partner: "@handle" for someone on Smashy, or just their name if they have no account. */
export async function joinHostedTeam(ev: string, partner: string): Promise<ActionResult> {
  const userId = await requireUser();
  if (!UUID.test(ev)) return { error: (await getT())("entering.err.eventUnavailable") };
  const who = readPartner(partner);
  if (who.kind === "error") return { error: (await getT())(who.error, { n: TEAM_NAME_MAX }) };
  const supabase = await createClient();
  let partnerId: string | null = null;
  if (who.kind === "handle") {
    const { data: person } = await supabase.from("profiles").select("id").eq("handle", who.handle).maybeSingle();
    if (!person) return { error: (await getT())("entering.err.noHandle", { handle: who.handle }) };
    partnerId = person.id as string;
  }
  const { error } = await supabase.rpc("join_hosted_team", { ev, partner: orNull(partnerId), partner_name: orNull(who.kind === "name" ? who.name : null) });
  if (error) return actionError(error);
  if (partnerId) await tellTeammate(ev, userId, [partnerId], "joined").catch(() => {}); // a nice-to-have: never fails the sign-up
  refresh();
  return {};
}

/** Leave your team before the bracket starts. A team is two people, so the team leaves the event; your partner is told. */
export async function leaveHostedTeam(ev: string): Promise<ActionResult> {
  const userId = await requireUser();
  if (!UUID.test(ev)) return { error: (await getT())("entering.err.eventUnavailable") };
  const db = createAdminClient();
  const { data: mine } = await db.from("hosted_team_members").select("guest_id").eq("event_id", ev).eq("user_id", userId).maybeSingle();
  if (!mine) return { error: (await getT())("entering.err.notOnTeam") };
  const { data: mates } = await db.from("hosted_team_members").select("user_id").eq("guest_id", mine.guest_id).not("user_id", "is", null).neq("user_id", userId);
  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_hosted_team", { ev });
  if (error) return actionError(error);
  const { data: still } = await db.from("hosted_guests").select("id").eq("id", mine.guest_id).maybeSingle();
  if (still) return { error: (await getT())("entering.err.teamsLocked") };
  const others = ((mates ?? []) as { user_id: string }[]).map((m) => m.user_id);
  if (others.length) await tellTeammate(ev, userId, others, "left").catch(() => {});
  refresh();
  return {};
}

/** Either member checks the team in. */
export async function checkInHostedTeam(ev: string) {
  return rpc("check_in_hosted_team", { ev });
}

/** Host: add a team by typing two names (people at the venue without accounts), before the bracket starts. */
export async function addWalkInTeam(ev: string, first: string, second: string): Promise<ActionResult> {
  const [a, b] = [cleanTeamName(first), cleanTeamName(second)];
  if (!UUID.test(ev) || !a || !b) return { error: (await getT())("hostrun.err.teamNames") };
  return rpc("host_add_team", { ev, name1: a, name2: b });
}

/**
 * A teammate with an account hears that they were put on a team (they didn't press anything, and can
 * leave), or that their partner left and the team is out of the event.
 */
async function tellTeammate(ev: string, byUser: string, to: string[], what: "joined" | "left") {
  const db = createAdminClient();
  const [{ data: event }, { data: me }] = await Promise.all([
    db.from("hosted_events").select("name").eq("id", ev).maybeSingle(),
    db.from("profiles").select("tag").eq("id", byUser).maybeSingle(),
  ]);
  if (!event) return;
  const who = (me?.tag as string | undefined) ?? "Your partner";
  const trOf = await translatorsFor(to); // each in their own language
  const text = (t: Tr) => t(what === "joined" ? "alert.ev.partnerJoined" : "alert.ev.partnerLeft", { who, event: event.name as string }).slice(0, 200);
  const { error } = await db.from("notifications").insert(to.map((user_id) => ({ user_id, actor_id: null, type: "event_update", event_name: text(trOf(user_id)), event_href: `/host/${ev}` })));
  if (error) console.error("team notifications failed", error.message);
}

/** Add a walk-in (someone at the venue without a Smashy account) before the bracket starts. */
export async function addWalkIn(ev: string, tag: string): Promise<ActionResult> {
  if (!UUID.test(ev) || typeof tag !== "string" || !tag.trim() || tag.trim().length > 30) return { error: (await getT())("hostrun.err.tagLength") };
  return rpc("host_add_guest", { ev, guest_tag: tag.trim() });
}

/** Save the seeding: entrants in order, seed 1 first. */
export async function setSeeds(ev: string, ordered: string[]): Promise<ActionResult> {
  if (!Array.isArray(ordered) || ordered.length > 512 || !ordered.every((x) => UUID.test(x))) return { error: (await getT())("hostrun.err.seedingFailed") };
  return rpc("host_set_seeds", { ev, ordered });
}

/** Open or close sign-ups, or cancel the event (hosts only; the database checks who's asking). */
export async function setHostedStatus(ev: string, status: "open" | "closed" | "canceled"): Promise<ActionResult> {
  const userId = await requireUser();
  if (!["open", "closed", "canceled"].includes(status) || !UUID.test(ev)) return { error: (await getT())("hostrun.err.updateFailed") };
  const supabase = await createClient();
  const { data: changed, error } = await supabase.from("hosted_events").update({ status }).eq("id", ev).eq("host_id", userId).in("status", ["open", "closed"]).select("name");
  if (error) return actionError(error);
  if (status === "canceled" && changed?.length) {
    const told = await notifyEntrants(ev, (t) => t("alert.ev.canceled", { event: changed[0].name as string }));
    // Its extra brackets that haven't started are canceled with it. Someone in both hears once.
    const { data: brackets } = await supabase.from("hosted_events").update({ status }).eq("parent_id", ev).eq("host_id", userId).in("status", ["open", "closed"]).select("id, name");
    for (const b of brackets ?? []) await notifyEntrants(b.id as string, (t) => t("alert.ev.canceled", { event: b.name as string }), told);
  }
  refresh();
  return {};
}

/** Tell everyone signed up about a change (canceled, new time), except people in `skip`. Returns who was told. */
/**
 * Whether entrants got this event's `key` notification in the last `minutes` (round 635: moving the start
 * time back and forth used to notify up to 600 people each time).
 */
async function toldRecently(eventId: string, key: Parameters<typeof sentInAnyLanguage>[0], minutes: number): Promise<boolean> {
  const { count } = await createAdminClient()
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("type", "event_update")
    .eq("event_href", `/host/${eventId}`)
    .or(sentInAnyLanguage(key))
    .gt("created_at", new Date(Date.now() - minutes * 60_000).toISOString());
  return (count ?? 0) > 0;
}

async function notifyEntrants(eventId: string, text: (t: Tr) => string, skip: Set<string> = new Set()): Promise<Set<string>> {
  const db = createAdminClient();
  const { data: people } = await db.from("hosted_entrants").select("user_id").eq("event_id", eventId).limit(600);
  const ids = (people ?? []).map((p) => p.user_id as string).filter((id) => !skip.has(id));
  const trOf = await translatorsFor(ids); // each in their own language
  const rows = ids.map((user_id) => ({ user_id, actor_id: null, type: "event_update", event_name: text(trOf(user_id)).slice(0, 200), event_href: `/host/${eventId}` }));
  const told = new Set(ids);
  if (!rows.length) return told;
  const { error } = await db.from("notifications").insert(rows);
  if (error) console.error("event_update notifications failed", error.message);
  return told;
}

/** Host: a short message to everyone signed up ("Bracket starts in 10", "Join the Discord for codes"). Max 5 a day per event. */
export async function announceToPlayers(eventId: string, message: string): Promise<ActionResult> {
  const event = await hostedEventForHost(eventId);
  if (!event || ["canceled", "completed"].includes(event.status)) return { error: (await getT())("hostrun.err.messageOwn") };
  if (event.entrantCount === 0) return { error: (await getT())("hostrun.err.nobodyYet") };
  const raw = String(message ?? "").replace(/\s+/g, " ").trim().slice(0, 160);
  if (raw.length < 3) return { error: (await getT())("hostrun.err.writeMessage") };
  const clean = cleanPublicText(raw);
  if (clean.flagged || !clean.text) return { error: (await getT())("hostrun.err.messageBlocked") };
  const db = createAdminClient();
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await db
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("type", "event_update")
    .eq("event_href", `/host/${eventId}`)
    .or(sentInAnyLanguage("alert.ev.hostSays"))
    .gt("created_at", since);
  if ((count ?? 0) >= 5 * Math.max(1, event.entrantCount)) return { error: (await getT())("hostrun.err.messageLimit") };
  await notifyEntrants(eventId, (t) => t("alert.ev.hostSays", { text: clean.text, event: event.name }));
  return {};
}

/** Host: check someone in (they're here but missed the button). */
export async function hostCheckIn(ev: string, person: string): Promise<ActionResult> {
  if (!UUID.test(ev) || !UUID.test(person)) return { error: (await getT())("hostrun.err.checkInFailed") };
  return rpc("host_check_in", { ev, person });
}

// ---------- Bracket (phase 2): the host starts it, reports results, fixes mistakes ----------

/** The event, if the signed-in person runs it (host or co-TO). */
async function hostedEventForHost(eventId: string) {
  const userId = await requireUser();
  if (!UUID.test(eventId)) return null;
  const event = await getHostedEvent(eventId);
  return event && !event.removed && (await runsEvent(event, userId)) ? event : null;
}

/** Add a co-TO by their Smashy handle (host only). */
export async function addCohost(ev: string, handle: string): Promise<ActionResult> {
  await requireUser();
  const h = String(handle ?? "").trim().replace(/^@/, "").toLowerCase();
  if (!UUID.test(ev) || !/^[a-z0-9_]{2,30}$/.test(h)) return { error: (await getT())("hostrun.err.enterHandle") };
  const supabase = await createClient();
  const { data: person } = await supabase.from("profiles").select("id").eq("handle", h).maybeSingle();
  if (!person) return { error: (await getT())("hostrun.err.noHandle", { handle: h }) };
  const res = await rpc("host_add_cohost", { ev, person: person.id });
  if (!res.error) await tellNewCohost(ev, person.id as string).catch(() => {}); // a nice-to-have: never fails the add
  return res;
}

/**
 * They're listed publicly on the event as a co-TO, so they should hear about it: it gets them there
 * on time, and lets them step down if they'd rather not. Once per person per event.
 */
async function tellNewCohost(ev: string, personId: string) {
  const db = createAdminClient();
  const href = `/host/${ev}`;
  const [{ data: event }, { count }] = await Promise.all([
    db.from("hosted_events").select("name").eq("id", ev).maybeSingle(),
    db.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", personId).eq("type", "event_update").eq("event_href", href).or(sentInAnyLanguage("alert.ev.cohost")),
  ]);
  if (!event || (count ?? 0) > 0) return;
  const t = (await translatorsFor([personId]))(personId);
  const text = t("alert.ev.cohost", { event: event.name as string }).slice(0, 200);
  await db.from("notifications").insert({ user_id: personId, actor_id: null, type: "event_update", event_name: text, event_href: href });
}

/** Remove a co-TO (host), or step down (the co-TO themselves). */
export async function removeCohost(ev: string, person: string): Promise<ActionResult> {
  if (!UUID.test(ev) || !UUID.test(person)) return { error: (await getT())("hostrun.err.removeFailed") };
  return rpc("host_remove_cohost", { ev, person });
}

// ---------- Bring players over from start.gg ----------
// For a local that takes sign-ups on start.gg: the host pastes the event's link and its players are
// added here as names (the same as walk-ins: no account, the TO records their sets), in start.gg's
// seeding order. Nothing is written to start.gg.

export type StartggImportPreview = {
  slug: string;
  eventName: string;
  tournamentName: string | null;
  found: number;
  add: string[];
  already: string[];
  blocked: number;
  noRoom: string[];
  cap: number;
  checkIn: boolean;
};
export type StartggImportChoices = { tournamentName: string; events: { name: string; slug: string; players: number }[] };

// Smashy shares one start.gg key between everyone, so one person can't use it up: 20 lookups in
// 5 minutes each (counted per server, which is enough of a brake; previewing then adding is 2).
const IMPORT_LOOKUPS = new Map<string, number[]>();
function tooManyImportLookups(userId: string): boolean {
  const since = Date.now() - 5 * 60_000;
  const recent = (IMPORT_LOOKUPS.get(userId) ?? []).filter((t) => t > since);
  if (recent.length >= 20) return true;
  recent.push(Date.now());
  if (IMPORT_LOOKUPS.size > 500) IMPORT_LOOKUPS.clear();
  IMPORT_LOOKUPS.set(userId, recent);
  return false;
}

/** The event, the start.gg list, and who would be added right now. */
async function startggImportPlan(eventId: string, slug: string, userId: string) {
  const event = await hostedEventForHost(eventId);
  if (!event) return { error: (await getT())("hostrun.err.onlyHostAdd") } as const;
  if (tooManyImportLookups(userId)) return { error: (await getT())("hostrun.err.slowDown") } as const;
  if (event.teamSize === 2) return { error: (await getT())("hostrun.err.importDoubles") } as const;
  if (!["open", "closed"].includes(event.status)) return { error: (await getT())("hostrun.err.beforeStart") } as const;
  if (!isEventSlug(slug)) return { error: (await getT())("hostrun.err.notStartggLink") } as const;
  let list;
  try {
    list = await getStartggEntrantList(slug, IMPORT_MAX);
  } catch (e) {
    console.error("start.gg import: couldn't read the event", e instanceof Error ? e.message : e);
    return { error: (await getT())("hostrun.err.startggDown") } as const;
  }
  if (!list) return { error: (await getT())("hostrun.err.startggNoEvent") } as const;
  if (list.teams) return { error: (await getT())("hostrun.err.startggTeams") } as const;
  if (list.total > IMPORT_MAX) return { error: (await getT())("hostrun.err.tooBig", { n: list.total, max: IMPORT_MAX }) } as const;
  if (list.players.length === 0) return { error: (await getT())("hostrun.err.startggEmpty") } as const;

  const db = createAdminClient();
  const [{ data: people, error: peopleError }, { data: guests, error: guestsError }] = await Promise.all([
    db.from("hosted_entrants").select("seed, profile:profiles!hosted_entrants_user_id_fkey ( tag )").eq("event_id", event.id).limit(600),
    db.from("hosted_guests").select("tag, seed").eq("event_id", event.id).limit(600),
  ]);
  if (peopleError || guestsError) return { error: (await getT())("hostrun.err.readFailed") } as const;
  const signedUp = (people ?? []) as unknown as { seed: number | null; profile: { tag: string } | null }[];
  const walkIns = (guests ?? []) as { tag: string; seed: number | null }[];
  const existingTags = [...signedUp.map((p) => p.profile?.tag ?? ""), ...walkIns.map((g) => g.tag)].filter(Boolean);
  const highestSeed = Math.max(0, ...signedUp.map((p) => p.seed ?? 0), ...walkIns.map((g) => g.seed ?? 0));
  const room = Math.max(0, event.entrantCap - signedUp.length - walkIns.length);
  return { event, list, plan: planImport(list.players, existingTags, room, highestSeed) } as const;
}

/**
 * Step 1: read the link and say who would come over. A whole-tournament link with several events
 * comes back as `choices` (the host picks one); with a single event it goes straight to the preview.
 */
export async function previewStartggImport(eventId: string, link: string): Promise<{ error?: string; preview?: StartggImportPreview; choices?: StartggImportChoices }> {
  const userId = await requireUser();
  const read = readStartggLink(typeof link === "string" ? link.slice(0, 500) : "");
  if (!read) return { error: (await getT())("hostrun.err.pasteLink") };
  let slug = read.slug;
  if (read.kind === "tournament") {
    // Hosts only: this asks start.gg a question, so it isn't open to everyone.
    if (!(await hostedEventForHost(eventId))) return { error: (await getT())("hostrun.err.onlyHostAdd") };
    if (tooManyImportLookups(userId)) return { error: (await getT())("hostrun.err.slowDown") };
    let choices;
    try {
      choices = await getStartggEventChoices(read.slug);
    } catch (e) {
      console.error("start.gg import: couldn't read the tournament", e instanceof Error ? e.message : e);
      return { error: (await getT())("hostrun.err.startggDown") };
    }
    const events = (choices?.events ?? []).filter((e) => isEventSlug(e.slug));
    if (!choices || events.length === 0) return { error: (await getT())("hostrun.err.startggNoTournament") };
    if (events.length > 1) return { choices: { tournamentName: choices.tournamentName, events: events.slice(0, 30) } };
    slug = events[0].slug;
  }
  const res = await startggImportPlan(eventId, slug, userId);
  if ("error" in res) return { error: res.error };
  const { event, list, plan } = res;
  return {
    preview: {
      slug,
      eventName: list.eventName,
      tournamentName: list.tournamentName,
      found: list.players.length,
      add: plan.add.map((p) => p.tag),
      already: plan.already,
      blocked: plan.blocked,
      noRoom: plan.noRoom,
      cap: event.entrantCap,
      checkIn: event.checkinMinutes > 0,
    },
  };
}

/** Step 2: add them. Reads start.gg again (never trusts a list sent by the browser). */
export async function importStartggPlayers(eventId: string, slug: string): Promise<{ error?: string; added?: number; ids?: string[] }> {
  const userId = await requireUser();
  const res = await startggImportPlan(eventId, typeof slug === "string" ? slug : "", userId);
  if ("error" in res) return { error: res.error };
  const { event, plan } = res;
  if (plan.add.length === 0) return { error: (await getT())("hostrun.err.noOneNewImport") };
  const db = createAdminClient();
  const now = Date.now();
  // With check-in on, they aren't here yet: the host checks each one in at the door. Sign-up times
  // go up a millisecond per player so start.gg's order holds even where the seed numbers ran out.
  const rows = plan.add.map((p, i) => ({
    event_id: event.id,
    tag: p.tag,
    seed: p.seed,
    checked_in_at: event.checkinMinutes > 0 ? null : new Date(now).toISOString(),
    created_at: new Date(now + i).toISOString(),
  }));
  let ids: string[] = [];
  const { data, error } = await db.from("hosted_guests").insert(rows).select("id");
  if (!error) {
    ids = (data ?? []).map((r) => r.id as string);
  } else if (error.code === "23505") {
    // A name was added in the same moment (or two tags differ only in a way the database treats as
    // the same): add them one at a time and leave out the ones that are taken.
    for (const row of rows) {
      const one = await db.from("hosted_guests").insert(row).select("id").maybeSingle();
      if (one.data) ids.push(one.data.id as string);
      else if (one.error && one.error.code !== "23505") console.error("start.gg import: couldn't add a player", one.error.code, one.error.message);
    }
  } else {
    console.error("start.gg import: couldn't add players", error.code, error.message);
    return { error: (await getT())("hostrun.addPlayersFailed") };
  }
  refresh();
  if (ids.length === 0) return { error: (await getT())("hostrun.err.alreadyInEvent") };
  return { added: ids.length, ids };
}

/** Take back an import made a moment ago (only the names it added, and only before the bracket starts). */
export async function undoStartggImport(eventId: string, ids: string[]): Promise<ActionResult> {
  await requireUser();
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > IMPORT_MAX || !ids.every((x) => typeof x === "string" && UUID.test(x))) return { error: (await getT())("hostrun.err.undoFailed") };
  const event = await hostedEventForHost(eventId);
  if (!event) return { error: (await getT())("hostrun.err.onlyHostRemove") };
  if (!["open", "closed"].includes(event.status)) return { error: (await getT())("hostrun.err.resetFirst") };
  const { error } = await createAdminClient().from("hosted_guests").delete().eq("event_id", event.id).in("id", ids);
  if (error) {
    console.error("start.gg import: couldn't undo", error.code, error.message);
    return { error: (await getT())("hostrun.err.undoOneByOne") };
  }
  refresh();
  return {};
}

// ---------- Bring players over from another bracket of the same event ----------
// For a Redemption (or amateur) bracket: the players who went out of the main bracket early come
// over in one go, seeded by how they did there, instead of being typed in again. Players with a
// Smashy account come over as themselves (and are told); walk-ins come over as names.

export type BringPreview = {
  from: string; // the bracket they'd come from, in words
  add: string[];
  already: number;
  leftOut: string[]; // disqualified there
  stillIn: number;
  above: number;
  noRoom: number;
  checkIn: boolean;
};

/** This bracket, the one to bring players from, and who would come over right now. `cut` null = everyone in it. */
async function bringPlan(eventId: string, fromId: string, cut: number | null) {
  const event = await hostedEventForHost(eventId);
  if (!event) return { error: (await getT())("hostrun.err.onlyHostAdd") } as const;
  if (!["open", "closed"].includes(event.status)) return { error: (await getT())("hostrun.err.beforeStart") } as const;
  if (typeof fromId !== "string" || !UUID.test(fromId) || fromId === event.id) return { error: (await getT())("hostrun.err.pickSource") } as const;
  if (cut !== null && !(Number.isInteger(cut) && cut >= 2 && cut <= 512)) return { error: (await getT())("hostrun.bring.cutRange") } as const;
  const source = await getHostedEvent(fromId);
  // Only between brackets of one event (the main one and its extra brackets).
  if (!source || source.removed || (source.parentId ?? source.id) !== (event.parentId ?? event.id)) return { error: (await getT())("hostrun.err.notThisEvent") } as const;
  if (event.teamSize !== 1 || source.teamSize !== 1) return { error: (await getT())("hostrun.err.singlesOnly") } as const;
  const [from, here, sets] = await Promise.all([getHostedEntrants(source.id), getHostedEntrants(event.id), loadEngineSets(source.id)]);
  if (cut !== null && !sets.length) return { error: (await getT())("hostrun.err.sourceNotStarted") } as const;
  // Once that bracket has started, only the people actually in it (not someone who signed up and never checked in).
  const inBracket = new Set(sets.flatMap((x) => [x.p[0].id, x.p[1].id]).filter((x): x is string => !!x));
  const plan = planBringOver({
    players: from.filter((p) => !sets.length || inBracket.has(p.userId)).map((p) => ({ id: p.userId, tag: p.tag, guest: !!p.guest, seed: p.seed })),
    places: new Map(outSoFar(sets, source.status === "completed").map((p) => [p.id, p.place])),
    cut,
    disqualified: disqualified(sets),
    hereIds: new Set(here.filter((p) => !p.guest).map((p) => p.userId)),
    hereTags: here.map((p) => p.tag),
    room: Math.max(0, event.entrantCap - here.length),
    highestSeed: Math.max(0, ...here.map((p) => p.seed ?? 0)),
  });
  return { event, source, plan } as const;
}

const bringCut = (cut: unknown) => (cut === null || cut === undefined ? null : Number(cut));

/** Step 1: who would come over. */
export async function previewBringPlayers(eventId: string, fromId: string, cut: number | null): Promise<{ error?: string; preview?: BringPreview }> {
  const res = await bringPlan(eventId, fromId, bringCut(cut));
  if ("error" in res) return { error: res.error };
  const { event, source, plan } = res;
  return {
    preview: {
      from: source.bracketName ?? (await getT())("hostrun.bring.theMainBracket"),
      add: plan.add.map((p) => p.tag),
      already: plan.already.length,
      leftOut: plan.leftOut,
      stillIn: plan.stillIn,
      above: plan.above,
      noRoom: plan.noRoom.length,
      checkIn: event.checkinMinutes > 0,
    },
  };
}

/** Step 2: add them. Works it out again from the brackets as they are now (never trusts a list sent by the browser). */
export async function bringPlayers(eventId: string, fromId: string, cut: number | null): Promise<{ error?: string; added?: number; accounts?: string[]; guests?: string[] }> {
  const res = await bringPlan(eventId, fromId, bringCut(cut));
  if ("error" in res) return { error: res.error };
  const { event, plan } = res;
  if (plan.add.length === 0) return { error: (await getT())("hostrun.err.noOneNewBring") };
  const db = createAdminClient();
  const now = Date.now();
  // With check-in on, the host checks each one in once they say they're playing. Sign-up times go up
  // a millisecond per player so the order holds even where the seed numbers ran out.
  const checkedIn = event.checkinMinutes > 0 ? null : new Date(now).toISOString();
  const rows = plan.add.map((p, i) => ({ p, at: new Date(now + i).toISOString() }));
  // Like signing up (the database refuses it), nobody is brought in when they and the host have blocked
  // each other (round 635).
  const accountIds = rows.filter((r) => !r.p.guest).map((r) => r.p.id);
  const blockedHere = new Set<string>();
  if (accountIds.length) {
    const [mine, theirs] = await Promise.all([
      db.from("blocks").select("blocked_id").eq("blocker_id", event.hostId).in("blocked_id", accountIds),
      db.from("blocks").select("blocker_id").eq("blocked_id", event.hostId).in("blocker_id", accountIds),
    ]);
    if (mine.error || theirs.error) return { error: (await getT())("hostrun.addPlayersFailed") };
    for (const b of mine.data ?? []) blockedHere.add(b.blocked_id as string);
    for (const b of theirs.data ?? []) blockedHere.add(b.blocker_id as string);
  }
  const people = rows.filter((r) => !r.p.guest && !blockedHere.has(r.p.id)).map((r) => ({ event_id: event.id, user_id: r.p.id, seed: r.p.seed, checked_in_at: checkedIn, created_at: r.at }));
  const walkIns = rows.filter((r) => r.p.guest).map((r) => ({ event_id: event.id, tag: r.p.tag, seed: r.p.seed, checked_in_at: checkedIn, created_at: r.at }));
  const accounts: string[] = [];
  const guests: string[] = [];
  if (people.length) {
    // Someone who signed up themselves in the same moment is left as they are (and isn't in the list to undo).
    const { data, error } = await db.from("hosted_entrants").upsert(people, { onConflict: "event_id,user_id", ignoreDuplicates: true }).select("user_id");
    if (error) {
      console.error("bring players: couldn't add players", error.code, error.message);
      return { error: (await getT())("hostrun.addPlayersFailed") };
    }
    accounts.push(...(data ?? []).map((r) => r.user_id as string));
  }
  if (walkIns.length) {
    const { data, error } = await db.from("hosted_guests").insert(walkIns).select("id");
    if (!error) {
      guests.push(...(data ?? []).map((r) => r.id as string));
    } else if (error.code === "23505") {
      // A name was added in the same moment: add them one at a time and leave out the ones that are taken.
      for (const row of walkIns) {
        const one = await db.from("hosted_guests").insert(row).select("id").maybeSingle();
        if (one.data) guests.push(one.data.id as string);
        else if (one.error && one.error.code !== "23505") console.error("bring players: couldn't add a walk-in", one.error.code, one.error.message);
      }
    } else {
      console.error("bring players: couldn't add walk-ins", error.code, error.message);
    }
  }
  if (accounts.length) await tellBroughtOver(event, accounts).catch(() => {}); // a nice-to-have: never fails the add
  refresh();
  if (!accounts.length && !guests.length) return { error: (await getT())("hostrun.err.alreadyInBracket") };
  return { added: accounts.length + guests.length, accounts, guests };
}

/** They were put in a bracket without pressing anything, so they should hear about it (and can withdraw). Once per person per bracket. */
async function tellBroughtOver(event: { id: string; name: string }, userIds: string[]) {
  const db = createAdminClient();
  const href = `/host/${event.id}`;
  const { data: sent } = await db.from("notifications").select("user_id").eq("type", "event_update").eq("event_href", href).or(sentInAnyLanguage("alert.ev.addedByHost")).in("user_id", userIds);
  const told = new Set((sent ?? []).map((n) => n.user_id as string));
  const trOf = await translatorsFor(userIds);
  const rows = userIds.filter((id) => !told.has(id)).map((user_id) => ({ user_id, actor_id: null, type: "event_update", event_name: trOf(user_id)("alert.ev.addedByHost", { event: event.name }).slice(0, 200), event_href: href }));
  if (!rows.length) return;
  const { error } = await db.from("notifications").insert(rows);
  if (error) console.error("bring players: notifications failed", error.message);
}

/** Take back players brought over a moment ago (only the ones that add put in, and only before the bracket starts). */
export async function undoBringPlayers(eventId: string, accounts: string[], guests: string[]): Promise<ActionResult> {
  await requireUser();
  const ok = (list: unknown): list is string[] => Array.isArray(list) && list.length <= 512 && list.every((x) => typeof x === "string" && UUID.test(x));
  if (!ok(accounts) || !ok(guests) || accounts.length + guests.length === 0) return { error: (await getT())("hostrun.err.undoFailed") };
  const event = await hostedEventForHost(eventId);
  if (!event) return { error: (await getT())("hostrun.err.onlyHostRemove") };
  if (!["open", "closed"].includes(event.status)) return { error: (await getT())("hostrun.err.resetFirst") };
  const db = createAdminClient();
  const [a, g] = await Promise.all([
    accounts.length ? db.from("hosted_entrants").delete().eq("event_id", event.id).in("user_id", accounts) : Promise.resolve({ error: null }),
    guests.length ? db.from("hosted_guests").delete().eq("event_id", event.id).in("id", guests) : Promise.resolve({ error: null }),
  ]);
  if (a.error || g.error) {
    console.error("bring players: couldn't undo", (a.error ?? g.error)!.message);
    return { error: (await getT())("hostrun.err.undoOneByOne") };
  }
  refresh();
  return {};
}

/** Start the bracket from the current seeding (checked-in players only, if check-in is on). */
export async function startBracket(eventId: string): Promise<ActionResult & { players?: number }> {
  const event = await hostedEventForHost(eventId);
  if (!event) return { error: (await getT())("hostrun.err.onlyHostStart") };
  if (event.format === "social") return { error: (await getT())("hostrun.err.socialNoBracket") };
  if (!["open", "closed"].includes(event.status)) return { error: (await getT())("hostrun.err.alreadyStarted") };
  if ((await loadEngineSets(event.id)).length) return { error: (await getT())("hostrun.err.alreadyStarted") };
  try {
    const players = await createBracket(event);
    refresh();
    return { players };
  } catch (e) {
    return { error: e instanceof Error && !("code" in e) ? e.message : (await getT())("hostrun.err.startFailed") };
  }
}

/** Swiss: pair and start the next round, once every set of the current one has a result. */
export async function startSwissRound(eventId: string): Promise<ActionResult & { round?: number }> {
  const event = await hostedEventForHost(eventId);
  if (!event || event.format !== "swiss") return { error: (await getT())("hostrun.err.onlyHostRound") };
  if (event.status !== "in_progress") return { error: event.status === "completed" ? (await getT())("hostrun.err.finished") : (await getT())("hostrun.err.notStarted") };
  try {
    const round = await withBracketLock(event.id, () => nextSwissRound(event));
    refresh();
    return { round };
  } catch (e) {
    return { error: e instanceof Error && !("code" in e) ? e.message : (await getT())("hostrun.err.roundFailed") };
  }
}

/** Pools or Swiss are done: build the final bracket from the top players and start it. */
export async function startFinal(eventId: string): Promise<ActionResult & { players?: number }> {
  const event = await hostedEventForHost(eventId);
  if (!event || !event.finalFormat) return { error: (await getT())("hostrun.err.onlyHostFinal") };
  if (event.status !== "in_progress") return { error: event.status === "completed" ? (await getT())("hostrun.err.finished") : (await getT())("hostrun.err.notStarted") };
  try {
    const players = await withBracketLock(event.id, () => startFinalBracket(event));
    refresh();
    return { players };
  } catch (e) {
    return { error: e instanceof Error && !("code" in e) ? e.message : (await getT())("hostrun.err.finalFailed") };
  }
}

/** Swiss: pair the current round again (after fixing a result from the round before), while nobody has played it yet. */
export async function repairSwissRound(eventId: string): Promise<ActionResult & { round?: number }> {
  const event = await hostedEventForHost(eventId);
  if (!event || event.format !== "swiss") return { error: (await getT())("hostrun.err.onlyHostRepair") };
  if (event.status !== "in_progress") return { error: (await getT())("hostrun.err.noRound") };
  try {
    const round = await withBracketLock(event.id, () => redoSwissRound(event));
    refresh();
    return { round };
  } catch (e) {
    return { error: e instanceof Error && !("code" in e) ? e.message : (await getT())("hostrun.err.repairFailed") };
  }
}

async function setForHost(setId: string) {
  if (!UUID.test(setId)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("hosted_sets").select("event_id").eq("id", setId).maybeSingle();
  if (!data) return null;
  const event = await hostedEventForHost(data.event_id as string);
  return event && (event.status === "in_progress" || event.status === "completed") ? event : null;
}

/** Report a set's result (host). `score` = games won by player 1 and 2; -1 = DQ. */
export async function reportSet(setId: string, winner: 1 | 2, score: [number, number]): Promise<ActionResult> {
  const event = await setForHost(setId);
  if (!event) return { error: (await getT())("hostrun.err.onlyHostReport") };
  try {
    // One change to the bracket at a time, on freshly loaded sets.
    await withBracketLock(event.id, async () => {
      const sets = await loadEngineSets(event.id);
      await saveChanges(event.id, sets, reportResult(sets, setId, winner === 2 ? 2 : 1, [Number(score[0]), Number(score[1])]));
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : (await getT())("hostrun.err.resultFailed") };
  }
  refresh();
  return {};
}

/** Undo a result (host), if no later set has been played. */
export async function undoSet(setId: string): Promise<ActionResult> {
  const event = await setForHost(setId);
  if (!event) return { error: (await getT())("hostrun.err.onlyHostChange") };
  try {
    await withBracketLock(event.id, async () => {
      const sets = await loadEngineSets(event.id);
      await saveChanges(event.id, sets, undoResult(sets, setId));
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : (await getT())("hostrun.err.undoResultFailed") };
  }
  refresh();
  return {};
}

/**
 * Fix a result after later sets were played (host). Same winner: only the score changes. A different
 * winner clears the later sets that depended on it (they get played again).
 */
export async function fixSet(setId: string, winner: 1 | 2, score: [number, number]): Promise<ActionResult> {
  const event = await setForHost(setId);
  if (!event) return { error: (await getT())("hostrun.err.onlyHostChange") };
  try {
    await withBracketLock(event.id, async () => {
      const sets = await loadEngineSets(event.id);
      await saveChanges(event.id, sets, fixResult(sets, setId, winner === 2 ? 2 : 1, [Number(score[0]), Number(score[1])]).changed);
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : (await getT())("hostrun.err.fixFailed") };
  }
  refresh();
  return {};
}

/**
 * Set a player's name on the scene's PR (host or co-TO), used when the bracket is copied to Challonge
 * for Braacket. Remembered for the host's later events; an empty name clears it.
 */
export async function setPrName(eventId: string, playerId: string, name: string): Promise<ActionResult> {
  const event = await hostedEventForHost(eventId);
  if (!event) return { error: (await getT())("hostrun.err.onlyHost") };
  if (!UUID.test(playerId) || typeof name !== "string" || name.length > 120) return { error: (await getT())("common.tryAgain") };
  const db = createAdminClient();
  const [{ data: member }, { data: guest }] = await Promise.all([
    db.from("hosted_entrants").select("user_id").eq("event_id", event.id).eq("user_id", playerId).maybeSingle(),
    db.from("hosted_guests").select("tag").eq("event_id", event.id).eq("id", playerId).maybeSingle(),
  ]);
  if (!member && !guest) return { error: (await getT())("common.tryAgain") };
  try {
    await savePrName(event.hostId, member ? { userId: playerId } : { guestTag: (guest as { tag: string }).tag }, name);
  } catch {
    return { error: (await getT())("common.tryAgain") };
  }
  refresh(); // the "n of N set" count
  return {};
}

/**
 * Copy a finished elimination bracket to Challonge (host or co-TO), so it can be imported into a
 * ranking league on Braacket. Once per event; the link is saved on the event.
 */
export async function copyBracketToChallonge(eventId: string): Promise<ActionResult & { url?: string }> {
  const event = await hostedEventForHost(eventId);
  if (!event) return { error: (await getT())("hostrun.err.onlyHost") };
  if (event.status !== "completed") return { error: (await getT())("hostrun.err.copyWhenDone") };
  if (event.challongeUrl) return { url: event.challongeUrl };
  const format = event.format;
  if (format === "social") return { error: (await getT())("hostrun.err.copyWhenDone") }; // no bracket to copy
  if (format === "swiss") return { error: (await getT())("hostrun.err.challongeSwiss") };
  if (event.finalFormat) return { error: (await getT())("hostrun.err.challongeFinal") };
  if (!challongeConfigured()) return { error: (await getT())("hostrun.err.challongeOff") };
  try {
    const url = await withBracketLock(event.id, async () => {
      const db = createAdminClient();
      const { data: again } = await db.from("hosted_events").select("challonge_url").eq("id", event.id).single();
      if (again?.challonge_url) return again.challonge_url as string; // a second click while the first ran
      const [sets, seeded, players] = await Promise.all([loadEngineSets(event.id), bracketEntrants(event), bracketPlayers(event.id)]);
      // A round robin with several pools isn't one "everyone plays everyone" bracket, which is all Challonge's round robin is.
      if (sets.some((s) => (s.pool ?? 1) > 1)) throw new Error((await getT())("hostrun.err.challongePools"));
      const inBracket = new Set(sets.flatMap((s) => [s.p[0].id, s.p[1].id]).filter(Boolean) as string[]);
      const order = seeded.filter((id) => inBracket.has(id));
      // Names on the scene's PR (set by the host), so Braacket matches the league's existing players.
      const pr = await getPrNames(event.hostId, players);
      const link = await copyToChallonge({
        name: event.name,
        gameName: GAMES[event.game].name,
        format,
        startsAt: event.startsAt,
        // Tags as the host sees them; anyone hidden by privacy rules (e.g. a teen) goes out as "Player 4".
        players: order.map((id, i) => ({ id, tag: nameForCopy(players.get(id)?.tag ?? `Player ${i + 1}`, pr.get(id)), seed: i + 1 })),
        sets,
      });
      await db.from("hosted_events").update({ challonge_url: link }).eq("id", event.id);
      return link;
    });
    refresh();
    return { url };
  } catch (e) {
    return { error: e instanceof Error ? e.message : (await getT())("hostrun.err.challongeFailed") };
  }
}

/** Throw the bracket away so the host can fix the seeding and start again. */
export async function resetBracket(eventId: string): Promise<ActionResult> {
  const event = await hostedEventForHost(eventId);
  if (!event) return { error: (await getT())("hostrun.err.onlyHostReset") };
  // Only an event that has a bracket: resetting a canceled one would quietly reopen it.
  if (event.status !== "in_progress" && event.status !== "completed") return { error: (await getT())("hostrun.err.noBracket") };
  try {
    await withBracketLock(event.id, () => deleteBracket(event.id));
  } catch {
    return { error: (await getT())("hostrun.err.resetFailed") };
  }
  refresh();
  return {};
}

/** Share a finished event: the host posts the results; a player posts their placement. */
export async function shareHostedResult(eventId: string): Promise<ActionResult & { postId?: string }> {
  const userId = await requireUser();
  if (!UUID.test(eventId)) return { error: (await getT())("entering.err.eventUnavailable") };
  const event = await getHostedEvent(eventId);
  if (!event || event.removed || event.status !== "completed") return { error: (await getT())("hostrun.err.shareWhenOver") };
  const supabase = await createClient();
  const [t, lang] = await Promise.all([getT(), getLang()]);
  let body: string;
  if (event.hostId === userId) {
    body = t("hostrun.post.results", { event: event.name });
  } else {
    const { data: me } = await supabase.from("hosted_entrants").select("placement").eq("event_id", eventId).eq("user_id", userId).maybeSingle();
    let n = (me?.placement as number | null | undefined) ?? null;
    if (!n && event.teamSize === 2) {
      // Doubles: the placement is the team's.
      const { data: mine } = await supabase.from("hosted_team_members").select("team:hosted_guests!inner ( placement )").eq("event_id", eventId).eq("user_id", userId).maybeSingle();
      n = (mine as unknown as { team: { placement: number | null } } | null)?.team.placement ?? null;
    }
    if (!n) return { error: t("hostrun.err.sharePlacement") };
    body = t(event.teamSize === 2 ? "hostrun.post.wePlaced" : "hostrun.post.iPlaced", { place: ordinalFor(lang, n), event: event.name });
  }
  const { data, error } = await supabase.from("posts").insert({ author_id: userId, game: event.game, body, hosted_event_id: eventId }).select("id").single();
  if (error) return actionError(error);
  refresh();
  return { postId: data.id as string };
}

/** Anyone: post an upcoming event to your feed (with its card), once per event. */
export async function postHostedEvent(eventId: string): Promise<ActionResult & { postId?: string }> {
  const userId = await requireUser();
  if (!UUID.test(eventId)) return { error: (await getT())("entering.err.eventUnavailable") };
  const event = await getHostedEvent(eventId);
  if (!event || event.removed || !["open", "closed", "in_progress"].includes(event.status)) return { error: (await getT())("hostrun.err.postUpcoming") };
  const supabase = await createClient();
  const { data: already } = await supabase.from("posts").select("id").eq("author_id", userId).eq("hosted_event_id", eventId).is("removed_at", null).limit(1);
  if (already?.length) return { postId: already[0].id as string };
  const { data: me } = await supabase.from("hosted_entrants").select("user_id").eq("event_id", eventId).eq("user_id", userId).maybeSingle();
  const t = await getT();
  const body = t(
    event.hostId === userId ? "hostrun.post.hosting" : event.status === "in_progress" ? "hostrun.post.live" : me ? "hostrun.post.imIn" : "hostrun.post.checkOut",
    { event: event.name },
  );
  const { data, error } = await supabase.from("posts").insert({ author_id: userId, game: event.game, body, hosted_event_id: eventId }).select("id").single();
  if (error) return actionError(error);
  refresh();
  return { postId: data.id as string };
}

/** "Weekly #13" -> "Weekly #14"; a name without a number gets "#2". */
function nextName(name: string): string {
  const m = name.match(/^(.*?#\s*)(\d+)(\s*)$/);
  return (m ? `${m[1]}${Number(m[2]) + 1}${m[3]}` : `${name} #2`).slice(0, 80);
}

/** Run it again: the same event a week later (the next number), linked as the same series, with the same co-TOs. */
export async function runHostedAgain(eventId: string): Promise<ActionResult & { id?: string }> {
  const userId = await requireUser();
  if (!UUID.test(eventId)) return { error: (await getT())("entering.err.eventUnavailable") };
  const supabase = await createClient();
  const { data: e } = await supabase
    .from("hosted_events")
    .select("host_id, name, game, online, location, region, starts_at, timezone, format, ruleset_id, best_of, best_of_top, swiss_rounds, final_format, final_size, entrant_cap, checkin_minutes, description, series_id, parent_id, team_size, setups, no_show_minutes")
    .eq("id", eventId)
    .maybeSingle();
  if (!e || e.host_id !== userId) return { error: (await getT())("hostrun.err.onlyHostAgain") };
  if (e.parent_id) return { error: (await getT())("hostrun.err.runMain") };
  // The same local clock time a week later (7:00 PM stays 7:00 PM across a clock change).
  const tz = (e.timezone as string) || "America/Chicago";
  const startSec = Math.floor(Date.parse(e.starts_at as string) / 1000);
  let weeks = 1;
  let when = sameLocalTimeLater(startSec, 7, tz) * 1000;
  while (when < Date.now() + 3_600_000 && weeks < 60) when = sameLocalTimeLater(startSec, 7 * ++weeks, tz) * 1000; // the next week still ahead
  const { data, error } = await supabase
    .from("hosted_events")
    .insert({
      host_id: userId,
      name: nextName(e.name as string),
      game: e.game,
      online: e.online,
      location: e.location,
      region: e.region,
      starts_at: new Date(when).toISOString(),
      timezone: e.timezone,
      format: e.format,
      ruleset_id: e.ruleset_id,
      best_of: e.best_of,
      best_of_top: e.best_of_top,
      swiss_rounds: e.swiss_rounds,
      final_format: e.final_format,
      final_size: e.final_size,
      entrant_cap: e.entrant_cap,
      checkin_minutes: e.checkin_minutes,
      description: e.description,
      team_size: e.team_size,
      setups: e.setups,
      no_show_minutes: e.no_show_minutes,
      series_id: (e.series_id as string | null) ?? eventId,
    })
    .select("id")
    .single();
  if (error) return { error: error.code === "P0429" ? (await getT())("hostrun.err.manyEvents") : (actionError(error).error ?? (await getT())("hostrun.err.nextFailed")) };
  // The same crew usually runs a weekly: this edition's co-TOs come along. The database applies the
  // usual rules (host only, no one blocked, 5 at most); each is told, and can step down. A co-TO who
  // can't be added is skipped: it never stops the new event from being made.
  const nextId = data.id as string;
  try {
    const { data: crew } = await supabase.from("hosted_cohosts").select("user_id").eq("event_id", eventId).limit(5);
    for (const c of crew ?? []) {
      const { error: addError } = await supabase.rpc("host_add_cohost", { ev: nextId, person: c.user_id });
      if (!addError) await tellNewCohost(nextId, c.user_id as string).catch(() => {});
    }
  } catch {
    // the host can add them by hand
  }
  // So does the Discord connection, so next week posts to the same channel.
  try {
    const admin = createAdminClient();
    const { data: hook } = await admin.from("hosted_webhooks").select("url, calls").eq("event_id", eventId).maybeSingle();
    if (hook) await admin.from("hosted_webhooks").insert({ event_id: nextId, url: hook.url, calls: hook.calls, created_by: userId });
  } catch {
    // the host can connect it again
  }
  // Its extra brackets come along too (same names and settings, the same time of day), empty.
  try {
    const { data: brackets } = await supabase
      .from("hosted_events")
      .select("bracket_name, game, starts_at, format, ruleset_id, best_of, best_of_top, swiss_rounds, final_format, final_size, entrant_cap, checkin_minutes, description, team_size, setups, no_show_minutes")
      .eq("parent_id", eventId)
      .is("removed_at", null)
      .neq("status", "canceled")
      .order("starts_at")
      .limit(MAX_EXTRA_BRACKETS);
    const mainName = nextName(e.name as string);
    for (const b of brackets ?? []) {
      const start = sameLocalTimeLater(Math.floor(Date.parse(b.starts_at as string) / 1000), 7 * weeks, tz) * 1000;
      const { bracket_name, starts_at: _was, ...settings } = b;
      void _was;
      await supabase.from("hosted_events").insert({
        ...settings,
        host_id: userId,
        parent_id: nextId,
        bracket_name,
        name: bracketFullName(mainName, (bracket_name as string | null) ?? "Bracket"),
        online: e.online,
        location: e.location,
        region: e.region,
        timezone: e.timezone,
        starts_at: new Date(start).toISOString(),
      });
    }
  } catch {
    // the host can add them by hand
  }
  refresh();
  return { id: nextId };
}

/** Host: nudge both players of a set that's waiting to start ("Your set is waiting"). Once every 5 minutes per set. */
export async function nudgeSet(setId: string): Promise<ActionResult> {
  if (!UUID.test(setId)) return { error: (await getT())("hostrun.err.setNotFound") };
  const db = createAdminClient();
  const { data: set } = await db.from("hosted_sets").select("id, event_id, p1_id, p2_id, state, identifier").eq("id", setId).maybeSingle();
  if (!set || !set.p1_id || !set.p2_id || !["ready", "live"].includes(set.state as string)) return { error: (await getT())("hostrun.err.setNotWaiting") };
  const event = await hostedEventForHost(set.event_id as string);
  if (!event || event.status !== "in_progress") return { error: (await getT())("hostrun.err.onlyHostNudge") };
  const href = `/host/set/${set.id}`;
  const { count } = await db
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("type", "event_update")
    .eq("event_href", href)
    .or(sentInAnyLanguage("alert.ev.setWaiting"))
    .gt("created_at", new Date(Date.now() - 5 * 60_000).toISOString());
  if ((count ?? 0) > 0) return { error: (await getT())("hostrun.err.nudgedRecently") };
  const text = (t: Tr) => t("alert.ev.setWaiting", { set: set.identifier ?? "", event: event.name }).replace(/\s+/g, " ").slice(0, 200);
  // Online: a player who hasn't added their connect code is told that's what's missing.
  const { data: codes } = event.online
    ? await db.from("hosted_connect_codes").select("user_id").eq("event_id", event.id).in("user_id", [set.p1_id, set.p2_id])
    : { data: null };
  const hasCode = new Set(((codes ?? []) as { user_id: string }[]).map((c) => c.user_id));
  // Walk-ins have no account to notify; nudge whoever does (each in their own language).
  const players = await playersWithAccounts([set.p1_id as string, set.p2_id as string]);
  const trOf = await translatorsFor(players);
  const textFor = (id: string) => (event.online && !hasCode.has(id) ? trOf(id)("alert.ev.addCode", { text: text(trOf(id)) }).slice(0, 200) : text(trOf(id)));
  if (!players.length) return { error: (await getT())("hostrun.err.nudgeWalkIns") };
  const { error } = await db.from("notifications").insert(
    players.map((user_id) => ({ user_id, actor_id: null, type: "event_update", event_name: textFor(user_id), event_href: href })),
  );
  if (error) return { error: (await getT())("hostrun.err.nudgeFailed") };
  return {};
}

// ---------- Discord: post to the scene's own server ----------
// The host pastes a channel's webhook link (made in that Discord server's settings). Smashy posts
// there when the bracket starts, when sets are called, and the results. The link is a key to that
// channel, so it's saved where no member can read it and is never sent back to a page.

const discordTries = new Map<string, number[]>(); // per host, on this server: connecting sends a message, so it's limited

/** The event, if the signed-in person is its main host and it's a main event (extra brackets use the main event's channel). */
async function mainEventForHost(ev: string) {
  const userId = await requireUser();
  if (!UUID.test(ev)) return { userId, event: null };
  const event = await getHostedEvent(ev);
  return { userId, event: event && !event.removed && event.hostId === userId && !event.parentId ? event : null };
}

/** Connect a Discord channel: checks the link by sending one message there, then saves it. */
export async function connectDiscord(ev: string, link: string): Promise<ActionResult> {
  const { userId, event } = await mainEventForHost(ev);
  if (!event) return { error: (await getT())("hostrun.err.discordMain") };
  if (event.status === "canceled" || event.status === "completed") return { error: (await getT())("hostrun.err.eventOver") };
  const url = readWebhook(typeof link === "string" ? link.slice(0, 300) : "");
  if (!url) return { error: (await getT())("hostrun.err.badWebhook") };
  const now = Date.now();
  const tries = (discordTries.get(userId) ?? []).filter((t) => now - t < 10 * 60_000);
  if (tries.length >= 6) return { error: (await getT())("hostrun.err.manyTries") };
  discordTries.set(userId, [...tries, now]);
  const sent = await postDiscord(url, connectedMessage(event.name, new URL(`/host/${event.id}`, siteUrl()).toString()));
  if (!sent.ok) return { error: sent.gone ? (await getT())("hostrun.err.webhookGone") : (await getT())("hostrun.err.discordDown") };
  const { error } = await createAdminClient().from("hosted_webhooks").upsert({ event_id: event.id, url, calls: true, created_by: userId, announced_at: null });
  if (error) return { error: (await getT())("hostrun.err.connectedNotSaved") };
  refresh();
  return {};
}

export async function disconnectDiscord(ev: string): Promise<ActionResult> {
  const { event } = await mainEventForHost(ev);
  if (!event) return { error: (await getT())("hostrun.err.onlyHost") };
  const { error } = await createAdminClient().from("hosted_webhooks").delete().eq("event_id", event.id);
  if (error) return { error: (await getT())("hostrun.err.disconnectFailed") };
  refresh();
  return {};
}

/** Whether set calls are posted (the start and the results always are). */
export async function setDiscordCalls(ev: string, on: boolean): Promise<ActionResult> {
  const { event } = await mainEventForHost(ev);
  if (!event) return { error: (await getT())("hostrun.err.onlyHost") };
  const { error } = await createAdminClient().from("hosted_webhooks").update({ calls: !!on }).eq("event_id", event.id);
  return error ? { error: (await getT())("common.tryAgain") } : {};
}

/** Post the sign-up link in the connected channel (before the bracket starts; at most once every 10 minutes). */
export async function announceOnDiscord(ev: string): Promise<ActionResult> {
  const { event } = await mainEventForHost(ev);
  if (!event) return { error: (await getT())("hostrun.err.onlyHost") };
  if (!["open", "closed"].includes(event.status)) return { error: (await getT())("hostrun.err.alreadyStarted") };
  const hook = await getHook(event.id);
  if (!hook) return { error: (await getT())("hostrun.err.discordGone") };
  if (hook.announcedAt && Date.now() - Date.parse(hook.announcedAt) < 10 * 60_000) return { error: (await getT())("hostrun.err.postedRecently") };
  const when = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: event.timezone, timeZoneName: "short" }).format(new Date(event.startsAt));
  const entries = (await getHostedEntrants(event.id)).length;
  const text = signupMessage(
    { name: event.name, when, where: event.online ? (event.region ?? "Online") : (event.location ?? "In person"), entries, cap: event.entrantCap, teams: event.teamSize === 2 },
    new URL(`/host/${event.id}`, siteUrl()).toString(),
  );
  if (!(await sendTo(hook, text))) return { error: (await getT())("hostrun.err.postFailed") };
  await createAdminClient().from("hosted_webhooks").update({ announced_at: new Date().toISOString() }).eq("event_id", event.id);
  refresh();
  return {};
}

