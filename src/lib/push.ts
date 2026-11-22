// Sending push notifications to the devices people turned them on for (Profile > Notifications).
// The database asks for a push (api/push/send) when a notification or a direct message arrives; this
// looks it up with the server key, respects mutes, and sends it with the VAPID keys in the env.
import "server-only";
import webpush from "web-push";
import { messagePush, notificationPush, type PushPayload } from "./pushText";
import { isLang } from "./i18n/core";
import { langsFor, trFor } from "./i18n/recipients";
import { createAdminClient } from "./supabase/admin";
import { siteUrl } from "./siteMeta";
import { validPushEndpoint, validPushKeys } from "./pushKeys";
import { androidPushConfigured, iphonePushConfigured, sendAndroid, sendIphone } from "./appPush";

export function pushConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

let vapidSet = false;
function ensureVapid() {
  if (vapidSet) return;
  // The "subject" must be an https address (or mailto:); local dev runs on http, so use the live site there.
  const origin = siteUrl().origin;
  webpush.setVapidDetails(origin.startsWith("https://") ? origin : "https://smashy.gg", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  vapidSet = true;
}

/**
 * Sends one payload to every device of these people. Devices that are gone (404/410) are forgotten,
 * and so are devices whose saved keys are malformed (they could never receive anything).
 */
export async function sendToUsers(userIds: string[], payload: PushPayload, ttlSeconds = 60 * 60 * 12): Promise<number> {
  const web = pushConfigured();
  // Store app phones: Android through Firebase, iPhones through Apple (each once its key is set up).
  const platforms = [...(androidPushConfigured() ? ["android"] : []), ...(iphonePushConfigured() ? ["ios"] : [])];
  if (!userIds.length || (!web && !platforms.length)) return 0;
  const db = createAdminClient();
  const [{ data: subs }, { data: devices }] = await Promise.all([
    web ? db.from("push_subscriptions").select("id, endpoint, p256dh, auth").in("user_id", userIds) : Promise.resolve({ data: [] }),
    platforms.length ? db.from("app_push_devices").select("id, platform, token").in("platform", platforms).in("user_id", userIds) : Promise.resolve({ data: [] }),
  ]);
  if (web) ensureVapid();
  let sent = 0;
  await Promise.all([
    ...(devices ?? []).map(async (d) => {
      const result = await (d.platform === "ios" ? sendIphone : sendAndroid)(d.token as string, payload, ttlSeconds);
      if (result === "sent") sent++;
      else if (result === "gone") await db.from("app_push_devices").delete().eq("id", d.id);
    }),
    ...(subs ?? []).map(async (s) => {
      // Saved before round 692 on a host that isn't a push service: never send there.
      if (!validPushEndpoint(s.endpoint)) {
        await db.from("push_subscriptions").delete().eq("id", s.id);
        return;
      }
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: ttlSeconds, urgency: ttlSeconds < 3600 ? "high" : "normal" });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410 || !validPushKeys(s.p256dh, s.auth)) await db.from("push_subscriptions").delete().eq("id", s.id);
        else console.error("push failed", code ?? (e as Error).message);
      }
    }),
  ]);
  return sent;
}

/** Which of `others` have a block with `person`, in either direction (blocker or blocked). */
async function blockedWith(person: string, others: string[]): Promise<Set<string>> {
  if (!others.length) return new Set();
  const db = createAdminClient();
  const [{ data: theyBlocked }, { data: personBlocked }] = await Promise.all([
    db.from("blocks").select("blocker_id").eq("blocked_id", person).in("blocker_id", others),
    db.from("blocks").select("blocked_id").eq("blocker_id", person).in("blocked_id", others),
  ]);
  return new Set([...(theyBlocked ?? []).map((r) => r.blocker_id as string), ...(personBlocked ?? []).map((r) => r.blocked_id as string)]);
}

/** A new notification row: push it unless the person muted that kind (or muted or blocked the person). */
export async function pushNotification(id: string): Promise<number> {
  const db = createAdminClient();
  const { data: n } = await db
    .from("notifications")
    .select("id, user_id, actor_id, type, post_id, major_slug, conversation_id, event_name, event_href, read_at")
    .eq("id", id)
    .maybeSingle();
  if (!n || n.read_at) return 0;
  // Nothing from someone on either side of a block ever reaches the lock screen.
  if (n.actor_id && (await blockedWith(n.actor_id, [n.user_id])).size) return 0;
  const [{ data: me }, actorRes, postRes, majorRes, muteRes] = await Promise.all([
    db.from("profiles").select("notification_mutes, lang").eq("id", n.user_id).maybeSingle(),
    n.actor_id ? db.from("profiles").select("tag, handle").eq("id", n.actor_id).maybeSingle() : Promise.resolve({ data: null }),
    n.post_id ? db.from("posts").select("id, parent_id, body, title, spoiler, removed_at").eq("id", n.post_id).maybeSingle() : Promise.resolve({ data: null }),
    n.major_slug ? db.from("majors").select("name").eq("slug", n.major_slug).maybeSingle() : Promise.resolve({ data: null }),
    n.actor_id ? db.from("mutes").select("muted_id").eq("muter_id", n.user_id).eq("muted_id", n.actor_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (((me?.notification_mutes as string[] | null) ?? []).includes(n.type) || muteRes.data) return 0;
  const post = postRes.data as { id: string; parent_id: string | null; body: string; title: string | null; spoiler: boolean; removed_at: string | null } | null;
  if (n.post_id && (!post || post.removed_at)) return 0;
  const payload = notificationPush({
    type: n.type,
    actor: (actorRes.data as { tag: string; handle: string } | null) ?? null,
    post: post ? { id: post.id, parentId: post.parent_id, body: post.body, title: post.title, spoiler: post.spoiler } : null,
    majorName: (majorRes.data as { name: string } | null)?.name ?? null,
    majorSlug: n.major_slug,
    conversationId: n.conversation_id,
    eventName: n.event_name,
    eventHref: n.event_href,
  }, trFor(isLang(me?.lang) ? me.lang : "en")); // in the recipient's language
  // "Wants to play now" is useless once it's stale: a phone that's off for 20 minutes never gets it.
  const ttl = n.type === "play_ping" || n.type === "play_ping_main" || n.type === "play_request" || n.type === "play_accepted" ? 20 * 60 : undefined;
  return payload ? sendToUsers([n.user_id], payload, ttl) : 0;
}

/** A new direct message: push it to the chat's other active members who haven't muted the chat. */
export async function pushMessage(id: string): Promise<number> {
  const db = createAdminClient();
  const { data: m } = await db.from("messages").select("id, conversation_id, sender_id, body, image_path, deleted_at").eq("id", id).maybeSingle();
  if (!m || m.deleted_at || !m.sender_id) return 0;
  const [{ data: members }, { data: sender }, { data: conv }] = await Promise.all([
    db.from("conversation_members").select("user_id, status, muted").eq("conversation_id", m.conversation_id),
    db.from("profiles").select("tag").eq("id", m.sender_id).maybeSingle(),
    db.from("conversations").select("kind, title").eq("id", m.conversation_id).maybeSingle(),
  ]);
  // Message requests aren't pushed per message (the request notification covers them).
  const to = (members ?? []).filter((x) => x.user_id !== m.sender_id && x.status === "active" && !x.muted).map((x) => x.user_id as string);
  if (!to.length) return 0;
  // Skip people who muted the sender, and (in group chats) anyone with a block between them and the sender.
  const [{ data: muters }, blocked] = await Promise.all([
    db.from("mutes").select("muter_id").in("muter_id", to).eq("muted_id", m.sender_id),
    blockedWith(m.sender_id, to),
  ]);
  const muted = new Set([...(muters ?? []).map((r) => r.muter_id as string), ...blocked]);
  const recipients = to.filter((u) => !muted.has(u));
  // One push per language among the recipients ("Sent a photo", "{sender} in {group}" in each).
  const langs = await langsFor(recipients);
  const byLang = new Map<string, string[]>();
  for (const u of recipients) byLang.set(langs.get(u) ?? "en", [...(byLang.get(langs.get(u) ?? "en") ?? []), u]);
  let sent = 0;
  for (const [lang, users] of byLang) {
    const payload = messagePush({
      senderTag: (sender as { tag: string } | null)?.tag ?? "Someone",
      body: m.body ?? "",
      hasImage: !!m.image_path,
      conversationId: m.conversation_id,
      groupTitle: conv?.kind === "group" ? ((conv.title as string | null) ?? "a group chat") : null,
    }, trFor(isLang(lang) ? lang : "en"));
    sent += await sendToUsers(users, payload);
  }
  return sent;
}
