"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { blockedReason, checkImage, hasImageSafetyKey } from "@/lib/imageSafety";
import { getMessage, getMessageablePeople, getNewerMessages, getOlderMessages, MESSAGE_IMAGES_BUCKET, MESSAGE_MAX_LENGTH, MESSAGE_REACTIONS, type ChatMessage } from "@/lib/messages";
import { overLimit } from "@/lib/limits";
import { processImage } from "@/lib/postImages";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getVerifiedUserId } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { isBirthdayNeeded } from "@/lib/birthdayNeeded";

async function requireUser() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/signin");
  return userId;
}

const isId = (s: unknown): s is string => typeof s === "string" && /^[0-9a-f-]{36}$/.test(s);

/** Database messages (from the safety rules) are already written for people; anything else gets a generic one. */
async function friendly(error: { code?: string; message: string } | null, fallback?: string): Promise<string> {
  const t = await getT();
  const generic = fallback ?? t("play.msg.err.generic");
  if (!error) return generic;
  if (isBirthdayNeeded(error)) return t("people.err.needBirthday");
  if (error.code === "P0001" || error.code === "P0429") return error.message;
  if (error.code === "42501") return t("play.msg.err.cantSendHere");
  console.error("messages action failed", error.code, error.message);
  return generic;
}

/** Open (or find) a direct chat and go to it. */
export async function startDirect(otherId: string) {
  await requireUser();
  if (!isId(otherId)) return { error: (await getT())("play.msg.err.accountUnavailable") };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_direct", { other: otherId });
  if (error) return { error: await friendly(error) };
  redirect(`/messages/${data}`);
}

export async function createGroup(title: string, people: string[]) {
  await requireUser();
  const ids = (Array.isArray(people) ? people : []).filter(isId).slice(0, 19);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_group", { title: String(title ?? "").slice(0, 60), people: ids });
  if (error) return { error: await friendly(error) };
  redirect(`/messages/${data}`);
}

/** Search people to message (used as you type). */
export async function searchPeople(q: string) {
  await requireUser();
  return getMessageablePeople(String(q ?? ""));
}

export type SendResult = { message?: ChatMessage; error?: string };

const PHOTOS_PER_HOUR = 30;

/** Send a message: text, a photo, or both. Photos go through the same safety check as post photos. */
export async function sendMessage(conversationId: string, formData: FormData): Promise<SendResult> {
  const userId = await requireUser();
  const t = await getT();
  if (!isId(conversationId)) return { error: t("play.msg.err.chatUnavailable") };
  const body = String(formData.get("body") ?? "").replace(/\r\n/g, "\n").trim();
  if (body.length > MESSAGE_MAX_LENGTH) return { error: t("play.msg.err.tooLong", { n: MESSAGE_MAX_LENGTH }) };
  const file = formData.get("photo");
  const hasPhoto = file instanceof File && file.size > 0;
  if (!body && !hasPhoto) return { error: t("play.msg.err.writeFirst") };

  const supabase = await createClient();
  let photo: { path: string; width: number; height: number } | null = null;
  if (hasPhoto) {
    // Check they can send here before doing any work on the photo.
    const { data: allowed } = await supabase.rpc("conversation_can_send", { conv: conversationId });
    if (allowed !== true) return { error: t("play.msg.err.cantSendHere") };
    if (!hasImageSafetyKey()) return { error: t("play.msg.err.photosOff") };
    // At most 30 photos an hour, counted here on the server (unsent ones still count: they keep
    // their size). This used to be a database call that signed-in people lost permission to make,
    // which broke every photo.
    const { count: recentPhotos } = await createAdminClient()
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("sender_id", userId)
      .not("image_width", "is", null)
      .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
    if ((recentPhotos ?? 0) >= PHOTOS_PER_HOUR) return { error: t("play.msg.err.photosTooFast") };
    // Counted before the paid safety check, so blocked photos (never saved) count too (round 637).
    if (await overLimit("photo_check")) return { error: t("play.msg.err.photosTooFast") };
    if (file.size > 8 * 1024 * 1024) return { error: t("play.msg.err.photoTooBig") };
    let image;
    try {
      image = await processImage(Buffer.from(await file.arrayBuffer()));
    } catch {
      return { error: t("play.msg.err.photoUnreadable") };
    }
    try {
      const reason = blockedReason(await checkImage(image.data));
      if (reason) {
        console.warn("Message photo blocked by safety check", { userId, reason });
        return { error: t("play.msg.err.photoBlocked") };
      }
    } catch (e) {
      console.error("Message photo check failed", e instanceof Error ? e.message : e);
      return { error: t("play.msg.err.photoCheck") };
    }
    const path = `${conversationId}/${userId}/${randomUUID()}.webp`;
    const { error: upError } = await createAdminClient().storage.from(MESSAGE_IMAGES_BUCKET).upload(path, image.data, { contentType: "image/webp" });
    if (upError) {
      console.error("Message photo upload failed", upError.message);
      return { error: t("play.msg.err.photoSend") };
    }
    photo = { path, width: image.width, height: image.height };
  }

  const replyTo = String(formData.get("reply_to") ?? "");
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: userId,
      body,
      ...(isId(replyTo) ? { reply_to_id: replyTo } : {}),
      ...(photo ? { image_path: photo.path, image_width: photo.width, image_height: photo.height } : {}),
    })
    .select("id")
    .single();
  if (error) {
    if (photo) await createAdminClient().storage.from(MESSAGE_IMAGES_BUCKET).remove([photo.path]);
    return { error: await friendly(error, t("play.msg.err.sendFailed")) };
  }
  const message = await getMessage(data.id);
  return message ? { message } : {};
}

/** A message that arrived live: fetched again so its photo gets a link (photos are private). */
export async function loadMessage(id: string): Promise<ChatMessage | null> {
  await requireUser();
  return getMessage(String(id));
}

/**
 * Unsend your own message (and delete its photo). A photo that has been reported stays in storage,
 * out of the chat, until a moderator has dealt with the report (then it's deleted: admin/actions.ts).
 */
export async function unsendMessage(id: string): Promise<{ ok: boolean }> {
  const userId = await requireUser();
  if (!isId(id)) return { ok: false };
  const supabase = await createClient();
  const { data: m } = await supabase.from("messages").select("id, image_path").eq("id", id).eq("sender_id", userId).maybeSingle();
  if (!m) return { ok: false };
  const db = createAdminClient();
  const { error } = await db.from("messages").update({ deleted_at: new Date().toISOString(), body: "", image_path: null }).eq("id", id);
  if (error) return { ok: false }; // the chat puts the message back (round 624)
  if (!m.image_path) return { ok: true };
  const { count: openReports } = await db.from("live_reports").select("id", { count: "exact", head: true }).eq("kind", "message").eq("target_id", id).eq("status", "open");
  if (!openReports) await db.storage.from(MESSAGE_IMAGES_BUCKET).remove([m.image_path]);
  return { ok: true };
}

export async function loadOlderMessages(conversationId: string, before: string) {
  await requireUser();
  return getOlderMessages(String(conversationId), String(before));
}

/** Messages after the newest one a chat shows: catching up after it was in the background (round 624). */
export async function loadNewerMessages(conversationId: string, after: string) {
  await requireUser();
  return getNewerMessages(String(conversationId), String(after));
}

/** Mute a chat (it stops counting toward your unread badge), or unmute it. */
export async function setChatMuted(conversationId: string, mute: boolean) {
  await requireUser();
  if (!isId(conversationId)) return;
  const supabase = await createClient();
  await supabase.rpc("set_conversation_muted", { conv: conversationId, mute });
  refresh();
}

/** Add or remove a quick reaction on a message. */
export async function reactToMessage(messageId: string, emoji: string, on: boolean): Promise<{ error?: string }> {
  const userId = await requireUser();
  const t = await getT();
  if (!isId(messageId) || !(MESSAGE_REACTIONS as readonly string[]).includes(emoji)) return { error: t("play.msg.err.reactionUnavailable") };
  const supabase = await createClient();
  const { error } = on
    ? await supabase.from("message_reactions").insert({ message_id: messageId, user_id: userId, emoji })
    : await supabase.from("message_reactions").delete().eq("message_id", messageId).eq("user_id", userId).eq("emoji", emoji);
  if (error && error.code !== "23505") return { error: await friendly(error, t("play.msg.err.reactFailed")) };
  return {};
}

export async function markRead(conversationId: string) {
  await requireUser();
  if (!isId(conversationId)) return;
  const supabase = await createClient();
  await supabase.rpc("mark_conversation_read", { conv: conversationId });
}

export async function acceptRequest(conversationId: string) {
  await requireUser();
  const supabase = await createClient();
  await supabase.rpc("accept_message_request", { conv: conversationId });
  refresh();
}

/** Leave a group, or remove a direct chat from your inbox. */
export async function leaveConversation(conversationId: string) {
  await requireUser();
  const supabase = await createClient();
  await supabase.rpc("leave_conversation", { conv: conversationId });
  redirect("/messages");
}

export async function addGroupMembers(conversationId: string, people: string[]) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_group_members", { conv: conversationId, people: (people ?? []).filter(isId).slice(0, 19) });
  if (error) return { error: await friendly(error) };
  refresh();
  return {};
}

export async function removeGroupMember(conversationId: string, personId: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_group_member", { conv: conversationId, person: personId });
  if (error) return { error: await friendly(error) };
  refresh();
  return {};
}

export async function renameGroup(conversationId: string, title: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("rename_group", { conv: conversationId, new_title: String(title ?? "") });
  if (error) return { error: await friendly(error) };
  refresh();
  return {};
}

/** Block someone: no messages, chats or follows between you. Optionally leave the chat too. */
export async function blockUser(otherId: string, leaveConversationId?: string) {
  const userId = await requireUser();
  if (!isId(otherId) || otherId === userId) return { error: (await getT())("play.msg.err.cantBlock") };
  const supabase = await createClient();
  const { error } = await supabase.from("blocks").insert({ blocker_id: userId, blocked_id: otherId });
  if (error && error.code !== "23505") return { error: await friendly(error) };
  if (leaveConversationId && isId(leaveConversationId)) {
    await supabase.rpc("leave_conversation", { conv: leaveConversationId });
    redirect("/messages");
  }
  refresh();
  return {};
}

/** Mute: their posts and reposts stay out of your feeds (they aren't told). */
export async function muteUser(otherId: string, mute: boolean) {
  const userId = await requireUser();
  if (!isId(otherId) || otherId === userId) return { error: (await getT())("play.msg.err.cantMute") };
  const supabase = await createClient();
  const { error } = mute
    ? await supabase.from("mutes").insert({ muter_id: userId, muted_id: otherId })
    : await supabase.from("mutes").delete().eq("muter_id", userId).eq("muted_id", otherId);
  if (error && error.code !== "23505") return { error: await friendly(error) };
  refresh();
  return {};
}

export async function unblockUser(otherId: string) {
  const userId = await requireUser();
  const supabase = await createClient();
  await supabase.from("blocks").delete().eq("blocker_id", userId).eq("blocked_id", otherId);
  refresh();
  return {};
}
