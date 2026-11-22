"use server";
// Seasons: creating one and everything its admins change. Every action checks who's asking (the
// season tables are server-only), then goes back to the manage page with a note or an error.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isGameKey } from "@/lib/games";
import { contactInfoReason } from "@/lib/guardrails";
import { isRegion } from "@/lib/regions";
import { canManageSeason, countOwnedSeasons, getSeason, resultsFromSmashy, resultsFromStartgg, type EventInError, type Season } from "@/lib/seasons";
import { DEFAULT_POINTS, isPlayerKey, readPointsTable, SEASON_LIMITS } from "@/lib/seasonsMath";
import { readStartggLink } from "@/lib/startggImport";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { sentInAnyLanguage, translatorsFor } from "@/lib/i18n/recipients";
import { cleanPublicText } from "@/lib/wordFilter";
import { isSiteAdmin } from "@/lib/scenes";

const str = (f: FormData, k: string, max = 500) => String(f.get(k) ?? "").trim().slice(0, max);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function back(id: string, note: { err?: string; msg?: string }, hash = ""): never {
  const q = note.err ? `?err=${note.err}` : note.msg ? `?msg=${note.msg}` : "";
  redirect(`/seasons/${id}/manage${q}${hash}`);
}

/** A public name (season or player): no contact details, nothing the word filter hides. */
function cleanName(raw: string, min: number, max: number): string | null {
  const s = raw.normalize("NFKC").replace(/\s+/g, " ").trim();
  if (s.length < min || s.length > max || contactInfoReason(s)) return null;
  const clean = cleanPublicText(s);
  return clean.flagged ? null : clean.text;
}

function datesOk(startsOn: string, endsOn: string): boolean {
  if (!DATE.test(startsOn) || !DATE.test(endsOn)) return false;
  const a = Date.parse(startsOn);
  const b = Date.parse(endsOn);
  return Number.isFinite(a) && Number.isFinite(b) && b >= a && b - a <= 731 * 86400_000;
}

/** The season, if this member may change it (else back with an error, or to sign-in). */
async function managed(id: string): Promise<{ season: Season; userId: string }> {
  const userId = await getVerifiedUserId();
  if (!userId) redirect(`/signin?next=${encodeURIComponent(`/seasons/${id}/manage`)}`);
  const season = await getSeason(id);
  if (!season || season.removed) redirect("/seasons");
  if (!(await canManageSeason(season, userId))) redirect(`/seasons/${id}`);
  return { season, userId };
}

const touch = async (id: string) => {
  await createAdminClient().from("seasons").update({ updated_at: new Date().toISOString() }).eq("id", id);
  revalidatePath(`/seasons/${id}`);
};

export async function createSeason(formData: FormData) {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/signin?next=/seasons/new");
  const fail = (err: string) => redirect(`/seasons/new?err=${err}`);
  const name = cleanName(str(formData, "name", 120), 3, 80);
  const game = str(formData, "game");
  const region = str(formData, "region");
  const startsOn = str(formData, "starts_on", 10);
  const endsOn = str(formData, "ends_on", 10);
  if (!name) fail("name");
  if (!isGameKey(game)) fail("game");
  if (!datesOk(startsOn, endsOn)) fail("dates");
  if ((await countOwnedSeasons(userId)) >= SEASON_LIMITS.seasonsPerMember) fail("tooMany");
  const { data, error } = await createAdminClient()
    .from("seasons")
    .insert({ owner_id: userId, name, game, region: isRegion(region) ? region : null, starts_on: startsOn, ends_on: endsOn, points: DEFAULT_POINTS })
    .select("id")
    .single();
  if (error || !data) {
    console.error("createSeason failed", error?.code, error?.message);
    fail("save");
  }
  redirect(`/seasons/${data!.id}/manage?msg=created`);
}

export async function saveSeasonSettings(formData: FormData) {
  const id = str(formData, "id", 40);
  const { season } = await managed(id);
  const name = cleanName(str(formData, "name", 120), 3, 80);
  const region = str(formData, "region");
  const startsOn = str(formData, "starts_on", 10);
  const endsOn = str(formData, "ends_on", 10);
  const points = readPointsTable(str(formData, "points", 2000));
  const bestRaw = str(formData, "best_of", 4);
  const bestOf = bestRaw ? Number(bestRaw) : null;
  const minEvents = Number(str(formData, "min_events", 3) || "1");
  const visibility = str(formData, "visibility") === "unlisted" ? "unlisted" : "public";
  if (!name) back(id, { err: "name" }, "#settings");
  if (!datesOk(startsOn, endsOn)) back(id, { err: "dates" }, "#settings");
  if (!points) back(id, { err: "points" }, "#settings");
  if (bestOf !== null && !(Number.isInteger(bestOf) && bestOf >= 1 && bestOf <= 200)) back(id, { err: "bestOf" }, "#settings");
  if (!(Number.isInteger(minEvents) && minEvents >= 1 && minEvents <= 50)) back(id, { err: "minEvents" }, "#settings");
  const { error } = await createAdminClient()
    .from("seasons")
    .update({ name, region: isRegion(region) ? region : null, starts_on: startsOn, ends_on: endsOn, points, best_of: bestOf, min_events: minEvents, visibility, updated_at: new Date().toISOString() })
    .eq("id", season.id);
  if (error) back(id, { err: "save" }, "#settings");
  revalidatePath(`/seasons/${id}`);
  back(id, { msg: "saved" }, "#settings");
}

const EVENT_ERRORS: Record<EventInError, string> = {
  notFinished: "notFinished", wrongGame: "wrongGame", teams: "teams", notFound: "notFound", startggDown: "startggDown", tooBig: "tooBig", empty: "empty",
};

/** Add an event: a Smashy bracket (picked, or its link pasted) or a start.gg event link. Its final standings are saved now. */
export async function addSeasonEvent(formData: FormData) {
  const id = str(formData, "id", 40);
  const { season, userId } = await managed(id);
  const db = createAdminClient();
  const { count } = await db.from("season_events").select("id", { count: "exact", head: true }).eq("season_id", id);
  if ((count ?? 0) >= SEASON_LIMITS.eventsPerSeason) back(id, { err: "tooManyEvents" }, "#events");

  const picked = str(formData, "hosted", 40);
  const sggEvent = str(formData, "sgg_event", 20);
  const link = str(formData, "link", 500);
  const smashyId = picked || link.match(/\/host\/([0-9a-f-]{36})/i)?.[1] || "";
  let found;
  if (smashyId) found = await resultsFromSmashy(smashyId, season.game);
  else if (/^\d{1,15}$/.test(sggEvent)) found = await resultsFromStartgg({ id: sggEvent }, season.game);
  else {
    const sgg = readStartggLink(link);
    if (!sgg) back(id, { err: "badLink" }, "#events");
    if (sgg!.kind !== "event") back(id, { err: "pickEvent" }, "#events");
    found = await resultsFromStartgg(sgg!.slug, season.game);
  }
  if (typeof found === "string") back(id, { err: EVENT_ERRORS[found] }, "#events");
  const weight = Number(str(formData, "weight", 5) || "1");
  const { error } = await db.from("season_events").insert({
    season_id: id, source: found.source, ref: found.ref, name: found.name, held_on: found.heldOn, entrants: found.entrants,
    weight: Number.isFinite(weight) && weight >= 0.25 && weight <= 5 ? weight : 1, results: found.results, added_by: userId,
  });
  if (error?.code === "23505") back(id, { err: "already" }, "#events");
  if (error) {
    console.error("addSeasonEvent failed", error.code, error.message);
    back(id, { err: "save" }, "#events");
  }
  await touch(id);
  back(id, { msg: "eventAdded" }, "#events");
}

export async function updateSeasonEvent(formData: FormData) {
  const id = str(formData, "id", 40);
  await managed(id);
  const eventId = str(formData, "event", 40);
  const db = createAdminClient();
  if (str(formData, "remove") === "1") {
    await db.from("season_events").delete().eq("id", eventId).eq("season_id", id);
    await touch(id);
    back(id, { msg: "eventRemoved" }, "#events");
  }
  const weight = Number(str(formData, "weight", 5));
  if (!(Number.isFinite(weight) && weight >= 0.25 && weight <= 5)) back(id, { err: "weight" }, "#events");
  await db.from("season_events").update({ weight }).eq("id", eventId).eq("season_id", id);
  await touch(id);
  back(id, { msg: "saved" }, "#events");
}

/** A player's name in this season, who they're merged into, and whether they're left out. */
export async function saveSeasonPlayer(formData: FormData) {
  const id = str(formData, "id", 40);
  await managed(id);
  const key = str(formData, "key", 80);
  if (!isPlayerKey(key)) back(id, { err: "save" }, "#players");
  const rawName = str(formData, "display_name", 120);
  const displayName = rawName ? cleanName(rawName, 1, 60) : null;
  if (rawName && !displayName) back(id, { err: "playerName" }, "#players");
  const into = str(formData, "merged_into", 80);
  const mergedInto = into && isPlayerKey(into) && into !== key ? into : null;
  const leftOut = str(formData, "left_out") === "1";
  const db = createAdminClient();
  if (!displayName && !mergedInto && !leftOut) await db.from("season_players").delete().eq("season_id", id).eq("player_key", key);
  else {
    const { error } = await db.from("season_players").upsert(
      { season_id: id, player_key: key, display_name: displayName, merged_into: mergedInto, left_out: leftOut, updated_at: new Date().toISOString() },
      { onConflict: "season_id,player_key" },
    );
    if (error) back(id, { err: "save" }, "#players");
  }
  await touch(id);
  back(id, { msg: "saved" }, "#players");
}

export async function addSeasonAdmin(formData: FormData) {
  const id = str(formData, "id", 40);
  const { season, userId } = await managed(id);
  const handle = str(formData, "handle", 40).replace(/^@/, "").toLowerCase();
  const db = createAdminClient();
  const { data: who } = await db.from("profiles").select("id").eq("handle", handle).maybeSingle();
  if (!who) back(id, { err: "noMember" }, "#admins");
  if (who!.id === season.ownerId) back(id, { msg: "saved" }, "#admins");
  // Someone who and the inviter (or the season's creator) have blocked each other can't be invited; it
  // reads as "no such member", so it doesn't tell either of them about the block (round 639).
  const pair = [userId, season.ownerId];
  const [{ data: b1 }, { data: b2 }] = await Promise.all([
    db.from("blocks").select("blocked_id").in("blocker_id", pair).eq("blocked_id", who!.id).limit(1),
    db.from("blocks").select("blocker_id").eq("blocker_id", who!.id).in("blocked_id", pair).limit(1),
  ]);
  if (b1?.length || b2?.length) back(id, { err: "noMember" }, "#admins");
  const { count } = await db.from("season_admins").select("user_id", { count: "exact", head: true }).eq("season_id", id);
  if ((count ?? 0) >= 10) back(id, { err: "tooManyAdmins" }, "#admins");
  // An invite (round 639, Matthew: "ask them first"): they become a co-admin only once they accept.
  const { data: made } = await db
    .from("season_admins")
    .upsert({ season_id: id, user_id: who!.id, added_by: userId, accepted_at: null }, { onConflict: "season_id,user_id", ignoreDuplicates: true })
    .select("user_id");
  // One invite alert per person per season (round 692, security review): removing and re-inviting
  // someone over and over used to send a new alert each time.
  const { count: told } = made?.length
    ? await db.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", who!.id).eq("type", "event_update").eq("event_href", `/seasons/${id}`).or(sentInAnyLanguage("alert.season.invite"))
    : { count: 1 };
  if (made?.length && !told) {
    const { data: me } = await db.from("profiles").select("tag").eq("id", userId).maybeSingle();
    const tr = (await translatorsFor([who!.id]))(who!.id);
    const text = tr("alert.season.invite", { name: (me?.tag as string | undefined) ?? "", season: season.name }).slice(0, 200);
    const { error } = await db.from("notifications").insert({ user_id: who!.id, actor_id: userId, type: "event_update", event_name: text, event_href: `/seasons/${id}` });
    if (error) console.error("season invite notification failed", error.message);
  }
  back(id, { msg: "adminInvited" }, "#admins");
}

/** The invited member accepts: they now help run the season (round 639). */
export async function acceptSeasonInvite(formData: FormData) {
  const id = str(formData, "id", 40);
  const userId = await getVerifiedUserId();
  if (!userId) redirect(`/signin?next=${encodeURIComponent(`/seasons/${id}`)}`);
  const { data } = await createAdminClient()
    .from("season_admins")
    .update({ accepted_at: new Date().toISOString() })
    .eq("season_id", id)
    .eq("user_id", userId)
    .is("accepted_at", null)
    .select("season_id");
  if (!data?.length) redirect(`/seasons/${id}`);
  back(id, { msg: "inviteAccepted" });
}

/** The invited member says no: the invite goes away (round 639). */
export async function declineSeasonInvite(formData: FormData) {
  const id = str(formData, "id", 40);
  const userId = await getVerifiedUserId();
  if (!userId) redirect(`/signin?next=${encodeURIComponent(`/seasons/${id}`)}`);
  await createAdminClient().from("season_admins").delete().eq("season_id", id).eq("user_id", userId).is("accepted_at", null);
  redirect(`/seasons/${id}`);
}

/** The creator removes a co-admin, or a co-admin steps down. */
export async function removeSeasonAdmin(formData: FormData) {
  const id = str(formData, "id", 40);
  const { season, userId } = await managed(id);
  const target = str(formData, "user", 40);
  if (season.ownerId !== userId && target !== userId) back(id, { err: "ownerOnly" }, "#admins");
  await createAdminClient().from("season_admins").delete().eq("season_id", id).eq("user_id", target);
  if (target === userId && season.ownerId !== userId) redirect(`/seasons/${id}`);
  back(id, { msg: "saved" }, "#admins");
}

export async function deleteSeason(formData: FormData) {
  const id = str(formData, "id", 40);
  const { season, userId } = await managed(id);
  if (season.ownerId !== userId) back(id, { err: "ownerOnly" }, "#danger");
  if (str(formData, "confirm") !== "1") back(id, { err: "confirmDelete" }, "#danger");
  await createAdminClient().from("seasons").delete().eq("id", id);
  redirect("/seasons?msg=deleted");
}

/** Moderators: hide a season from everyone (its page, the list, player pages and events), or restore it. */
export async function moderateSeason(formData: FormData) {
  const userId = await getVerifiedUserId();
  if (!userId || !(await isSiteAdmin(userId))) redirect("/seasons");
  const id = str(formData, "id", 40);
  const restore = str(formData, "restore") === "1";
  if (!restore && str(formData, "confirm") !== "1") redirect(`/seasons/${id}`);
  await createAdminClient().from("seasons").update({ removed_at: restore ? null : new Date().toISOString() }).eq("id", id);
  revalidatePath(`/seasons/${id}`);
  revalidatePath("/seasons");
  redirect(restore ? `/seasons/${id}` : "/seasons");
}
