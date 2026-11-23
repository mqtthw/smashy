"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { GAME_KEYS, type GameKey } from "@/lib/games";
import { CHAT_MAX_LENGTH, CHAT_ROOMS, chatContactInfoReason, contactInfoReason, type ChatRoom } from "@/lib/guardrails";
import type { ChatMessage } from "@/lib/play";
import { isPlayGame, LOOKING_MINUTES, tagsMatchmaking } from "@/lib/playGames";
import { taggedCharacters } from "@/lib/characterTags";
import { characterName } from "@/lib/characters";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getVerifiedUserId } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { isBirthdayNeeded } from "@/lib/birthdayNeeded";

async function requireUser() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/signin");
  return userId;
}

const DURATIONS = [30, 60, 120, 180];
const MODES = ["friendlies", "practice", "warmup", "doubles"];
const SKILLS = ["any", "beginner", "intermediate", "advanced"];

export type HostState = { error?: string; ok?: number };

export async function hostLobby(_prev: HostState, formData: FormData): Promise<HostState> {
  const userId = await requireUser();
  const game = String(formData.get("game")) as GameKey;
  const title = String(formData.get("title") ?? "").trim();
  const connectInfo = String(formData.get("connect_info") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim() || "Anywhere";
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const mode = String(formData.get("mode"));
  const skill = String(formData.get("skill"));
  const minutes = Number(formData.get("minutes"));
  const t = await getT();

  if (!GAME_KEYS.includes(game)) return { error: t("play.err.pickGame") };
  if (title.length < 3 || title.length > 60) return { error: t("play.err.titleLength") };
  if (!/^[A-Za-z0-9#: /-]{2,40}$/.test(connectInfo)) return { error: t("play.err.connectChars") };
  if (region.length < 2 || region.length > 40) return { error: t("play.err.regionLength") };
  if (notes && notes.length > 200) return { error: t("play.err.notesLength") };
  if (!MODES.includes(mode) || !SKILLS.includes(skill) || !DURATIONS.includes(minutes)) return { error: t("play.err.fillAll") };
  // Connect codes can't hold links or emails (no "." or "@"), but digits could be a phone number.
  // Switch friend codes (SW-1234-5678-9012) are 12 digits and fine.
  if (!/^SW[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}$/i.test(connectInfo) && contactInfoReason(connectInfo)) {
    return { error: t("play.err.phone") };
  }
  const blocked = contactInfoReason(title) ?? (notes ? contactInfoReason(notes) : null) ?? contactInfoReason(region);
  if (blocked) return { error: blocked };

  const supabase = await createClient();
  const { error } = await supabase.from("lobbies").insert({
    host_id: userId,
    game,
    title,
    mode,
    connect_info: connectInfo,
    region,
    skill,
    notes,
    closes_at: new Date(Date.now() + minutes * 60000).toISOString(),
  });
  if (error) {
    return { error: /already have an open lobby/.test(error.message) ? t("play.err.alreadyOpen") : t("play.err.openFailed") };
  }
  refresh();
  return { ok: Date.now() };
}

export async function closeLobby(lobbyId: string) {
  const userId = await requireUser();
  const supabase = await createClient();
  await supabase.from("lobbies").update({ closed_at: new Date().toISOString() }).eq("id", lobbyId).eq("host_id", userId);
  refresh();
}

export async function sendChat(room: string, body: string): Promise<{ error?: string; message?: ChatMessage; ping?: "sent" | "cooldown"; pingChars?: string[] }> {
  const userId = await requireUser();
  const text = body.replace(/\s+/g, " ").trim();
  const t = await getT();
  if (!CHAT_ROOMS.includes(room as ChatRoom)) return { error: t("play.err.unknownRoom") };
  if (!text) return { error: t("play.err.typeFirst") };
  if (text.length > CHAT_MAX_LENGTH) return { error: t("play.err.tooLong", { n: CHAT_MAX_LENGTH }) };
  const blocked = chatContactInfoReason(text);
  if (blocked) return { error: blocked };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({ room, author_id: userId, body: text } as never) // author_tag is filled in by the database
    .select("id, room, author_id, author_tag, body, created_at")
    .single();
  if (error) {
    if (/slow mode/i.test(error.message)) return { error: error.message.replace(/^.*?(Slow mode)/i, "$1") };
    if (error.code === "23514") return { error: t("play.err.notAllowed") };
    return { error: t("play.err.sendFailed") };
  }
  // @matchmaking, or a character tag like @Fox, in a game's room: the database pings everyone who turned
  // pings on (or just those who main the character), once per 30 minutes per sender.
  let ping: "sent" | "cooldown" | undefined;
  const chars = isPlayGame(room) && !tagsMatchmaking(text) ? taggedCharacters(room, text) : [];
  if (room !== "general" && (tagsMatchmaking(text) || chars.length > 0)) {
    const { data: s } = await supabase.from("play_settings").select("last_ping_at").eq("user_id", userId).maybeSingle();
    ping = s?.last_ping_at && Date.parse(s.last_ping_at) >= Date.parse(data.created_at) - 5000 ? "sent" : "cooldown";
  }
  return {
    message: { id: data.id, room: data.room as ChatRoom, authorId: data.author_id, authorTag: data.author_tag, body: data.body, createdAt: data.created_at },
    ping,
    pingChars: chars.length ? chars.map((c) => characterName(room as GameKey, c) ?? c) : undefined,
  };
}

const REASONS = ["spam", "harassment", "inappropriate", "off_topic", "other"];
const REPORTS_PER_HOUR = 10;

/**
 * Report a chat message or lobby. The server copies the text so moderators can still
 * see it after the 24-hour cleanup.
 */
export async function reportLive(kind: "chat" | "lobby" | "highlight" | "reel" | "message" | "profile" | "event" | "league" | "vod", targetId: string, reason: string, details: string): Promise<{ ok?: boolean; error?: string }> {
  const userId = await requireUser();
  const t = await getT();
  if (!REASONS.includes(reason) || !["chat", "lobby", "highlight", "reel", "message", "profile", "event", "league", "vod"].includes(kind)) return { error: t("play.err.pickReason") };
  if (typeof targetId !== "string" || targetId.length > 120) return { error: t("play.err.gone") };

  // Read the target as the reporter: you can only report what you can see.
  const supabase = await createClient();
  const db = createAdminClient();
  // Reports are saved by the server, where the database's own "10 an hour" rule can't tell who is
  // reporting, so it's counted here. Only people who finished joining can report.
  const [{ data: me }, { count: recent }] = await Promise.all([
    supabase.from("profiles").select("id").eq("id", userId).maybeSingle(),
    db.from("live_reports").select("id", { count: "exact", head: true }).eq("reporter_id", userId).gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString()),
  ]);
  if (!me) return { error: t("play.err.finishSetup") };
  if ((recent ?? 0) >= REPORTS_PER_HOUR) return { error: t("play.err.tooManyReports") };
  let snapshot: { author_id: string | null; text: string; room: string | null } | null = null;
  if (kind === "chat") {
    const { data } = await supabase.from("chat_messages").select("author_id, body, room").eq("id", targetId).maybeSingle();
    if (data) snapshot = { author_id: data.author_id, text: data.body, room: data.room };
  } else if (kind === "lobby") {
    const { data } = await supabase.from("lobbies").select("host_id, title, notes, connect_info, game").eq("id", targetId).maybeSingle();
    if (data) snapshot = { author_id: data.host_id, text: `${data.title}${data.notes ? ` — ${data.notes}` : ""} [${data.connect_info}]`, room: data.game };
  } else if (kind === "profile") {
    const { data } = await supabase.from("profiles").select("id, tag, handle, bio, home_city").eq("id", targetId).maybeSingle();
    if (data) snapshot = { author_id: data.id, text: `${data.tag} (@${data.handle})${data.home_city ? ` · ${data.home_city}` : ""}${data.bio ? `\nBio: ${data.bio}` : ""}`, room: "Profile" };
  } else if (kind === "message") {
    // A private message: only members can see it, so only members can report it. The text (and
    // which photo, if any) is copied so moderators can still see it if it's unsent.
    const { data } = await supabase.from("messages").select("sender_id, body, image_path, conversation_id, created_at").eq("id", targetId).is("deleted_at", null).maybeSingle();
    if (data) {
      // Context for moderators: the few messages before it, as the reporter saw them.
      const { data: before } = await supabase
        .from("messages")
        .select("body, sender:profiles!messages_sender_id_fkey ( tag ), deleted_at")
        .eq("conversation_id", data.conversation_id)
        .lt("created_at", data.created_at)
        .order("created_at", { ascending: false })
        .limit(5);
      const context = ((before ?? []) as unknown as { body: string; sender: { tag: string } | null; deleted_at: string | null }[])
        .reverse()
        .map((m) => `${m.sender?.tag ?? "Deleted account"}: ${m.deleted_at ? "(unsent)" : m.body || "(photo)"}`)
        .join("\n");
      snapshot = {
        author_id: data.sender_id,
        text: `${data.body || "(photo only)"}${context ? `\n\nEarlier in the chat:\n${context}` : ""}${data.image_path ? ` [photo:${data.image_path}]` : ""}`,
        room: "Direct message",
      };
    }
  } else if (kind === "event") {
    const { data } = await supabase.from("hosted_events").select("host_id, name, description, location, game").eq("id", targetId).maybeSingle();
    if (data) snapshot = { author_id: data.host_id, text: `Event: ${data.name}${data.location ? ` · ${data.location}` : ""}${data.description ? `\n${data.description.slice(0, 1500)}` : ""}`, room: data.game };
  } else if (kind === "league") {
    // Round 719. Read as the reporter, like the rest.
    const { data } = await supabase.from("leagues").select("host_id, name, description, location, game").eq("id", targetId).is("removed_at", null).maybeSingle();
    if (data) snapshot = { author_id: data.host_id, text: `League: ${data.name}${data.location ? ` · ${data.location}` : ""}${data.description ? `\n${data.description.slice(0, 1500)}` : ""}`, room: data.game };
  } else if (kind === "vod") {
    // A video someone attached to a set (round 719). Who added it isn't public, so that comes from the server's own read.
    const { data } = await supabase.from("set_vods").select("id, url, game, p1_tag, p2_tag, tournament").eq("id", targetId).maybeSingle();
    if (data) {
      const { data: owner } = await db.from("set_vods").select("added_by").eq("id", targetId).maybeSingle();
      snapshot = { author_id: (owner?.added_by as string | null) ?? null, text: `Set video: ${data.url} (${data.p1_tag ?? "?"} vs ${data.p2_tag ?? "?"}${data.tournament ? `, ${data.tournament}` : ""})`, room: data.game };
    }
  } else if (kind === "reel") {
    // A Reels clip: its "author" is whoever shared it (null for clips collected from channels).
    const { data } = await supabase.from("reels").select("title, channel_name, channel_login, platform, game, submitted_by").eq("clip_id", targetId).maybeSingle();
    if (data) {
      const link = data.platform === "youtube" ? `https://www.youtube.com/shorts/${targetId}` : `https://clips.twitch.tv/${targetId}`;
      snapshot = { author_id: data.submitted_by, text: `${data.title || "Untitled clip"} — ${data.channel_name ?? data.channel_login} [${link}]`, room: data.game };
    }
  } else {
    const { data } = await supabase.from("highlights").select("author_id, title, url, description, guide_body, game").eq("id", targetId).maybeSingle();
    if (data) {
      const guide = data.guide_body ? `\n\nGuide: ${data.guide_body.slice(0, 1500)}${data.guide_body.length > 1500 ? "…" : ""}` : "";
      snapshot = { author_id: data.author_id, text: `${data.title}${data.url ? ` [${data.url}]` : ""}${data.description ? ` — ${data.description}` : ""}${guide}`, room: data.game };
    }
  }
  if (!snapshot) return { error: t("play.err.gone") };
  if (snapshot.author_id && snapshot.author_id === userId) return { error: t("play.err.reportSelf") };

  const { error } = await db.from("live_reports").insert({
    kind,
    target_id: targetId,
    author_id: snapshot.author_id,
    snapshot: snapshot.text,
    room: snapshot.room,
    reporter_id: userId,
    reason,
    details: details.trim().slice(0, 500) || null,
  });
  if (error && error.code !== "23505") {
    return { error: error.code === "P0429" ? t("play.err.tooManyReports") : t("play.err.reportFailed") };
  }
  return { ok: true };
}

// ---------- "I want to play now" (round 398) ----------

/** A chat name's card: who they are (the chat only carries the tag). */
export async function playerCard(id: string): Promise<{ tag: string; handle: string } | null> {
  await requireUser();
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("tag, handle").eq("id", id).maybeSingle();
  return data ? { tag: data.tag, handle: data.handle } : null;
}

/**
 * Update a row of yours, or add it if there isn't one yet. (These tables let you change only some
 * columns, so a one-step "insert or update" isn't allowed.)
 */
async function saveOwnRow(table: "play_settings" | "play_codes", match: Record<string, string>, values: Record<string, unknown>) {
  const supabase = await createClient();
  let q = supabase.from(table).update(values as never); // two tables share this helper, so the columns aren't checked here
  for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
  const { data, error } = await q.select(Object.keys(match)[0]);
  if (error) return { error };
  if (data && data.length) return { error: null };
  // A new row gets its "last changed" time from the database (players can't set it).
  const { updated_at: _skip, ...fresh } = values;
  void _skip;
  const added = await supabase.from(table).insert({ ...match, ...fresh } as never);
  // Two taps at once: the other one added it first, so update it.
  if (added.error?.code === "23505") {
    let again = supabase.from(table).update(values as never);
    for (const [k, v] of Object.entries(match)) again = again.eq(k, v);
    return { error: (await again).error };
  }
  return { error: added.error };
}

/** "X wants to play Melee now": a push to them, 15 minutes to answer. */
export async function askToPlay(to: string, game: string): Promise<{ ok?: boolean; error?: string }> {
  await requireUser();
  const t = await getT();
  if (!isPlayGame(game)) return { error: t("play.err.pickGame") };
  const supabase = await createClient();
  const { error } = await supabase.rpc("ask_to_play", { p_to: to, p_game: game });
  if (error) {
    if (error.code === "P0409") return { error: t("playnow.err.alreadyAsked") };
    if (error.code === "P0429") return { error: t("playnow.err.tooMany") };
    if (isBirthdayNeeded(error)) return { error: t("people.err.needBirthday") };
    if (error.code === "P0403") return { error: t("playnow.err.cantAsk") };
    return { error: t("playnow.err.failed") };
  }
  refresh();
  return { ok: true };
}

export async function answerPlayRequest(id: string, accept: boolean): Promise<{ ok?: boolean; error?: string }> {
  await requireUser();
  const t = await getT();
  const supabase = await createClient();
  const { error } = await supabase.rpc("answer_play_request", { p_id: id, p_accept: accept === true });
  refresh();
  if (error) return { error: error.code === "P0409" ? t("playnow.err.ended") : t("playnow.err.failed") };
  return { ok: true };
}

export async function cancelPlayRequest(id: string) {
  await requireUser();
  const supabase = await createClient();
  await supabase.rpc("cancel_play_request", { p_id: id });
  refresh();
}

/** Both saved codes for an accepted request (only its two players get them). */
export async function playRequestCodes(id: string): Promise<{ from: string | null; to: string | null } | null> {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.rpc("play_request_codes", { p_id: id });
  const row = (data as { from_code: string | null; to_code: string | null }[] | null)?.[0];
  return row ? { from: row.from_code, to: row.to_code } : null;
}

/** Turn @matchmaking pings on or off for one game. */
export async function setPingGame(game: string, on: boolean): Promise<{ error?: string }> {
  const userId = await requireUser();
  const t = await getT();
  if (!isPlayGame(game)) return { error: t("play.err.pickGame") };
  const supabase = await createClient();
  const { data } = await supabase.from("play_settings").select("ping_games").eq("user_id", userId).maybeSingle();
  const cur = ((data?.ping_games as string[] | null) ?? []).filter(isPlayGame);
  const next = on ? [...new Set([...cur, game])] : cur.filter((g) => g !== game);
  const { error } = await saveOwnRow("play_settings", { user_id: userId }, { ping_games: next });
  if (error) return { error: t("playnow.err.failed") };
  refresh();
  return {};
}

/** The "Looking to play" switch: on for a game for 30/60/120 minutes, or off (minutes 0). */
export async function setLooking(game: string, minutes: number): Promise<{ error?: string }> {
  const userId = await requireUser();
  const t = await getT();
  const off = minutes === 0;
  if (!off && (!isPlayGame(game) || !(LOOKING_MINUTES as readonly number[]).includes(minutes))) return { error: t("play.err.fillAll") };
    const { error } = await saveOwnRow("play_settings", { user_id: userId }, {
    looking_game: off ? null : game,
    looking_until: off ? null : new Date(Date.now() + minutes * 60000).toISOString(),
  });
  if (error) return { error: t("playnow.err.failed") };
  refresh();
  return {};
}

/** Save (or clear, with an empty code) your netplay code for a game. Only you can read it. */
export async function savePlayCode(game: string, code: string): Promise<{ ok?: boolean; error?: string }> {
  const userId = await requireUser();
  const t = await getT();
  if (!isPlayGame(game)) return { error: t("play.err.pickGame") };
  const clean = String(code ?? "").trim();
  const supabase = await createClient();
  if (!clean) {
    await supabase.from("play_codes").delete().eq("user_id", userId).eq("game", game);
    refresh();
    return { ok: true };
  }
  if (!/^[A-Za-z0-9#: /-]{2,40}$/.test(clean)) return { error: t("play.err.connectChars") };
  if (!/^SW[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}$/i.test(clean) && contactInfoReason(clean)) return { error: t("play.err.phone") };
  const { error } = await saveOwnRow("play_codes", { user_id: userId, game }, { code: clean, updated_at: new Date().toISOString() });
  if (error) return { error: t("playnow.err.failed") };
  refresh();
  return { ok: true };
}
