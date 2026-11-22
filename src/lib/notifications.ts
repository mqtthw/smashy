// In-app notifications (server-side, as the signed-in user).
import { createClient } from "./supabase/server";
import { safeSnippet } from "./spoilerText";
import { avatarUrl } from "./avatarLinks";
import { badgeMain } from "./mainBadge";
import type { Main } from "./characters";

export type NotificationType =
  | "follow" | "follow_request" | "follow_accepted" | "like" | "reply" | "repost" | "quote" | "vote"
  | "scene_approved" | "scene_rejected" | "admin_approved" | "admin_rejected" | "major_live" | "reaction"
  | "clip_approved" | "clip_rejected" | "mention" | "message_request" | "event_reminder" | "weekly_digest" | "set_ready" | "event_result" | "event_update" | "ladder_match" | "play_ping" | "play_request" | "play_accepted" | "play_ping_main";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  createdAt: string;
  read: boolean;
  actor: { id?: string; tag: string; handle: string; avatarUrl?: string | null; protected?: boolean; main?: Main | null } | null;
  post: { id: string; body: string; parentId: string | null } | null;
  highlight: { id: string; title: string } | null;
  scene: { slug: string; name: string } | null;
  major: { slug: string; name: string } | null;
  clip: { clipId: string; title: string } | null; // a clip they shared for Reels
  conversationId: string | null; // message requests
  emoji: string | null; // reactions: "🔥" or "scene:<id>"
  event: { name: string; href: string } | null; // day-before reminders
  others: number; // reactions grouped into this one ("and 5 others")
};

export async function getNotifications(userId: string, limit = 60): Promise<NotificationItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id, type, created_at, read_at, emoji, actor:profiles!notifications_actor_id_fkey(id, tag, handle, avatar_path, protected, mains), post:posts(id, body, title, spoiler, parent_id), highlight:highlights(id, title), scene:scenes(slug, name), major:majors(slug, name), clip:reel_submissions(clip_id, title), conversation_id, event_name, event_href",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((n) => {
    const post = n.post as unknown as { id: string; body: string; title: string | null; spoiler: boolean | null; parent_id: string | null } | null;
    return {
      id: n.id,
      type: n.type as NotificationType,
      createdAt: n.created_at,
      read: !!n.read_at,
      actor: (() => {
        const a = n.actor as unknown as { id: string; tag: string; handle: string; avatar_path: string | null; protected: boolean; mains: unknown } | null;
        return a ? { id: a.id, tag: a.tag, handle: a.handle, avatarUrl: avatarUrl(a.avatar_path), protected: a.protected, main: badgeMain(a.mains) } : null;
      })(),
      // Spoilers stay hidden here too (like pushes): "(spoiler)", and ||hidden bits|| blacked out.
      post: post ? { id: post.id, body: safeSnippet(post), parentId: post.parent_id } : null,
      highlight: n.highlight as unknown as { id: string; title: string } | null,
      scene: n.scene as unknown as { slug: string; name: string } | null,
      major: n.major as unknown as { slug: string; name: string } | null,
      clip: (() => {
        const c = n.clip as unknown as { clip_id: string; title: string } | null;
        return c ? { clipId: c.clip_id, title: c.title } : null;
      })(),
      conversationId: (n.conversation_id as string | null) ?? null,
      emoji: (n.emoji as string | null) ?? null,
      event: n.event_name && n.event_href ? { name: n.event_name as string, href: n.event_href as string } : null,
      others: 0,
    };
  });
}

/** What a notification can be grouped by (null = never grouped). */
function groupKey(n: NotificationItem): string | null {
  if (n.type === "reaction" && n.post) return `reaction|${n.post.id}|${n.emoji}`;
  if ((n.type === "like" || n.type === "repost") && n.post) return `${n.type}|${n.post.id}`;
  if (n.type === "vote" && n.highlight) return `vote|${n.highlight.id}`;
  return null;
}

/**
 * Groups likes, reposts and upvotes on the same thing, and reactions with the same emoji on the same
 * post, into one item: "Bjorn and 5 others liked your post". The newest leads; unread if any is unread.
 */
export function groupNotifications(items: NotificationItem[]): NotificationItem[] {
  const out: NotificationItem[] = [];
  const lead = new Map<string, NotificationItem>();
  for (const n of items) {
    const key = groupKey(n);
    if (!key) {
      out.push(n);
      continue;
    }
    const first = lead.get(key);
    if (first) {
      first.others++;
      if (!n.read) first.read = false;
      continue;
    }
    const copy = { ...n };
    lead.set(key, copy);
    out.push(copy);
  }
  return out;
}
