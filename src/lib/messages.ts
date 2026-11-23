// Direct messages and group chats (reading). The database enforces who can see and send what;
// see supabase/migrations/20261109190000_messages.sql.
import "server-only";
import { createAdminClient } from "./supabase/admin";
import { createClient, getUserId } from "./supabase/server";
import { avatarUrl } from "./avatarLinks";

export const MESSAGE_MAX_LENGTH = 1000;
export const MESSAGE_IMAGES_BUCKET = "message-images";
const SIGNED_URL_SECONDS = 60 * 60; // photo links in chats work for an hour (the chat re-fetches expired ones)

export type Person = { id: string; tag: string; handle: string; avatarUrl?: string | null };

export { MESSAGE_REACTIONS } from "./messageReactions";
import { MESSAGE_REACTIONS } from "./messageReactions";

export type InboxEntry = {
  id: string;
  kind: "direct" | "group";
  title: string | null;
  status: "active" | "request";
  lastMessageAt: string;
  lastBody: string | null;
  lastFromMe: boolean;
  lastHasImage: boolean;
  lastDeleted: boolean;
  unread: number;
  members: Person[]; // everyone else in the chat
  canSend: boolean;
  muted: boolean; // doesn't count toward the unread badge
};

export type ChatMessage = {
  id: string;
  senderId: string | null;
  body: string;
  image: { url: string; width: number; height: number } | null;
  deleted: boolean;
  createdAt: string;
  replyTo: { id: string; senderId: string | null; snippet: string } | null; // the message this one answers
  reactions: { emoji: string; count: number; mine: boolean }[];
};

export type Conversation = {
  id: string;
  kind: "direct" | "group";
  title: string | null;
  myStatus: "active" | "request";
  myRole: "owner" | "member";
  members: (Person & { role: "owner" | "member"; status: "active" | "request" })[]; // everyone else still in it
  canSend: boolean;
  photosAllowed: boolean; // false in a chat with anyone under 18 in it (round 722)
  waitingOnThem: boolean; // a direct request they haven't accepted yet
  myMuted: boolean;
  otherReadAt: string | null; // direct chats: when the other person last read it (for "Seen")
  hasOlder: boolean; // more messages before the ones loaded
  myLastReadAt: string; // for the "New messages" line
  messages: ChatMessage[];
};

/** A chat's display name: the group name, or the other person's tag. */
export function conversationName(c: { kind: "direct" | "group"; title: string | null; members: Person[] }) {
  if (c.kind === "group") return c.title ?? "Group chat";
  return c.members[0]?.tag ?? "Deleted account";
}

export async function getInbox(viewerId: string): Promise<InboxEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_conversations");
  if (error) throw error;
  return ((data ?? []) as {
    id: string; kind: "direct" | "group"; title: string | null; status: "active" | "request"; last_message_at: string; last_body: string | null;
    last_sender: string | null; last_has_image: boolean; last_deleted: boolean; unread: number; members: Person[]; can_send: boolean; muted: boolean;
  }[]).map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    status: r.status,
    lastMessageAt: r.last_message_at,
    lastBody: r.last_body,
    lastFromMe: r.last_sender === viewerId,
    lastHasImage: r.last_has_image,
    lastDeleted: r.last_deleted,
    unread: r.unread,
    members: (r.members as (Person & { avatar_path?: string | null })[]).map((m) => ({ id: m.id, tag: m.tag, handle: m.handle, avatarUrl: avatarUrl(m.avatar_path) })),
    canSend: r.can_send,
    muted: r.muted,
  }));
}

export async function getUnreadConversations(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("unread_conversations");
  return typeof data === "number" ? data : 0;
}

/** Short-lived links to chat photos (the bucket is private). */
export async function signMessageImages(paths: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!paths.length) return out;
  const { data } = await createAdminClient().storage.from(MESSAGE_IMAGES_BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
  for (const d of data ?? []) if (d.path && d.signedUrl) out.set(d.path, d.signedUrl);
  return out;
}

type MessageRow = {
  id: string; sender_id: string | null; body: string; image_path: string | null; image_width: number | null; image_height: number | null;
  deleted_at: string | null; created_at: string; reply_to_id?: string | null;
};
export const MESSAGE_COLUMNS = "id, sender_id, body, image_path, image_width, image_height, deleted_at, created_at, reply_to_id";

const snippet = (m: { body: string; image_path: string | null; deleted_at: string | null }) =>
  m.deleted_at ? "Message unsent" : m.body ? m.body.slice(0, 120) : m.image_path ? "Photo" : "";

export async function toChatMessages(rows: MessageRow[]): Promise<ChatMessage[]> {
  const supabase = await createClient();
  const viewerId = await getUserId();
  const ids = rows.map((r) => r.id);
  const replyIds = [...new Set(rows.map((r) => r.reply_to_id).filter((x): x is string => !!x))];
  const [urls, { data: reacts }, { data: replied }] = await Promise.all([
    signMessageImages(rows.filter((r) => r.image_path && !r.deleted_at).map((r) => r.image_path!)),
    ids.length ? supabase.from("message_reactions").select("message_id, emoji, user_id").in("message_id", ids) : Promise.resolve({ data: [] }),
    replyIds.length ? supabase.from("messages").select("id, sender_id, body, image_path, deleted_at").in("id", replyIds) : Promise.resolve({ data: [] }),
  ]);
  const byMessage = new Map<string, Map<string, { emoji: string; count: number; mine: boolean }>>();
  for (const r of (reacts ?? []) as { message_id: string; emoji: string; user_id: string }[]) {
    const m = byMessage.get(r.message_id) ?? new Map();
    const e = m.get(r.emoji) ?? { emoji: r.emoji, count: 0, mine: false };
    e.count++;
    if (r.user_id === viewerId) e.mine = true;
    m.set(r.emoji, e);
    byMessage.set(r.message_id, m);
  }
  const repliedTo = new Map(((replied ?? []) as { id: string; sender_id: string | null; body: string; image_path: string | null; deleted_at: string | null }[]).map((m) => [m.id, m]));
  return rows.map((r) => ({
    id: r.id,
    senderId: r.sender_id,
    body: r.deleted_at ? "" : r.body,
    image:
      r.image_path && !r.deleted_at && urls.get(r.image_path)
        ? { url: urls.get(r.image_path)!, width: r.image_width ?? 1, height: r.image_height ?? 1 }
        : null,
    deleted: !!r.deleted_at,
    createdAt: r.created_at,
    replyTo: (() => {
      const t = r.reply_to_id ? repliedTo.get(r.reply_to_id) : null;
      return t ? { id: t.id, senderId: t.sender_id, snippet: snippet(t) } : null;
    })(),
    reactions: [...(byMessage.get(r.id)?.values() ?? [])].sort((a, b) => MESSAGE_REACTIONS.indexOf(a.emoji as never) - MESSAGE_REACTIONS.indexOf(b.emoji as never)),
  }));
}

/** One conversation with its latest messages, or null if you're not in it. */
export async function getConversation(id: string, viewerId: string): Promise<Conversation | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const supabase = await createClient();
  const [{ data: conv }, { data: members }, { data: rows }, { data: canSend }, { data: photosAllowed }] = await Promise.all([
    supabase.from("conversations").select("id, kind, title").eq("id", id).maybeSingle(),
    supabase.from("conversation_members").select("user_id, role, status, last_read_at, muted, profile:profiles ( id, tag, handle, avatar_path )").eq("conversation_id", id),
    supabase.from("messages").select(MESSAGE_COLUMNS).eq("conversation_id", id).order("created_at", { ascending: false }).limit(100),
    supabase.rpc("conversation_can_send", { conv: id }),
    supabase.rpc("conversation_allows_photos", { conv: id }),
  ]);
  if (!conv) return null;
  type M = { user_id: string; role: "owner" | "member"; status: "active" | "request" | "left"; last_read_at: string; muted: boolean; profile: (Person & { avatar_path: string | null }) | null };
  const all = (members ?? []) as unknown as M[];
  const me = all.find((m) => m.user_id === viewerId);
  if (!me || me.status === "left") return null;
  // People who left a group are gone from it. In a direct chat the other person stays named even
  // after they removed the chat from their own inbox (their account is still there).
  const others = all.filter((m) => m.user_id !== viewerId && (m.status !== "left" || conv.kind === "direct") && m.profile);
  return {
    id: conv.id,
    kind: conv.kind as Conversation["kind"],
    title: conv.title,
    myStatus: me.status,
    myRole: me.role,
    members: others.map((m) => ({ id: m.profile!.id, tag: m.profile!.tag, handle: m.profile!.handle, avatarUrl: avatarUrl(m.profile!.avatar_path), role: m.role, status: m.status === "request" ? ("request" as const) : ("active" as const) })),
    canSend: canSend === true,
    photosAllowed: photosAllowed === true, // unknown (the check failed) counts as no
    waitingOnThem: conv.kind === "direct" && others[0]?.status === "request",
    myMuted: me.muted,
    // "Seen" only once they've accepted: someone looking at a message request isn't shown as having read it.
    otherReadAt: conv.kind === "direct" && others[0]?.status === "active" ? others[0].last_read_at ?? null : null,
    hasOlder: (rows ?? []).length === 100,
    myLastReadAt: me.last_read_at,
    messages: await toChatMessages(((rows ?? []) as MessageRow[]).reverse()),
  };
}

/** 50 messages before a moment (scrolling back in a chat). */
export async function getOlderMessages(conversationId: string, before: string): Promise<{ messages: ChatMessage[]; hasOlder: boolean }> {
  if (!/^[0-9a-f-]{36}$/.test(conversationId) || Number.isNaN(Date.parse(before))) return { messages: [], hasOlder: false };
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select(MESSAGE_COLUMNS)
    .eq("conversation_id", conversationId)
    .lt("created_at", before)
    .order("created_at", { ascending: false })
    .limit(50);
  const rows = (data ?? []) as MessageRow[];
  return { messages: await toChatMessages(rows.reverse()), hasOlder: rows.length === 50 };
}

/**
 * Up to 100 messages after a moment, oldest first (round 624: a chat catching up after the app was in
 * the background or the live connection dropped, when no live updates arrived).
 */
export async function getNewerMessages(conversationId: string, after: string): Promise<ChatMessage[]> {
  if (!/^[0-9a-f-]{36}$/.test(conversationId) || Number.isNaN(Date.parse(after))) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select(MESSAGE_COLUMNS)
    .eq("conversation_id", conversationId)
    .gt("created_at", after)
    .order("created_at", { ascending: true })
    .limit(100);
  return toChatMessages((data ?? []) as MessageRow[]);
}

/** One message (for a photo link after a live update). Null if you can't see it. */
export async function getMessage(id: string): Promise<ChatMessage | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("messages").select(MESSAGE_COLUMNS).eq("id", id).maybeSingle();
  return data ? (await toChatMessages([data as MessageRow]))[0] : null;
}

/** People you could message (mutual follows first; a search finds others in your age group). */
export async function getMessageablePeople(q: string): Promise<(Person & { mutual: boolean })[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("messageable_people", { q: q.slice(0, 40) });
  if (error) throw error;
  return (data ?? []) as (Person & { mutual: boolean })[];
}

/**
 * For profile buttons: did I block them? The Message button shows for everyone else on purpose:
 * hiding it for teens would let anyone spot who's a teen. Tapping it checks the age rule and blocks
 * (both give the same "can't message this account" answer).
 */
export async function getMessagingRelation(viewerId: string, otherId: string): Promise<{ blocked: boolean; muted: boolean; canMessage: boolean }> {
  const supabase = await createClient();
  const [{ data: block }, { data: mute }] = await Promise.all([
    supabase.from("blocks").select("blocked_id").eq("blocker_id", viewerId).eq("blocked_id", otherId).maybeSingle(),
    supabase.from("mutes").select("muted_id").eq("muter_id", viewerId).eq("muted_id", otherId).maybeSingle(),
  ]);
  return { blocked: !!block, muted: !!mute, canMessage: !block };
}

/** Who I've blocked (to hide their messages in groups we share). */
export async function getMyBlockedIds(viewerId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("blocks").select("blocked_id").eq("blocker_id", viewerId);
  return (data ?? []).map((b) => b.blocked_id as string);
}

/** Deletes chats nobody is in anymore, with their photos. Safe to run any time (server only). */
export async function cleanupEmptyConversations(): Promise<number> {
  const db = createAdminClient();
  const { data: ids, error } = await db.rpc("empty_conversations");
  if (error) throw error;
  const convs = (ids ?? []) as string[];
  for (const conv of convs) {
    // Photos live at <conversation>/<sender>/<file>.
    const bucket = db.storage.from(MESSAGE_IMAGES_BUCKET);
    const { data: senders } = await bucket.list(conv);
    for (const s of senders ?? []) {
      const { data: files } = await bucket.list(`${conv}/${s.name}`);
      if (files?.length) await bucket.remove(files.map((f) => `${conv}/${s.name}/${f.name}`));
    }
    await db.from("conversations").delete().eq("id", conv);
  }
  return convs.length;
}
