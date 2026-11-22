// Moderation data for site admins. Uses the secret key: reports and the log are hidden from users.
import { ADULT_AGE, ageFromBirthdate } from "./age";
import { createAdminClient } from "./supabase/admin";

export const REASON_LABELS: Record<string, string> = {
  spam: "Spam",
  harassment: "Harassment or bullying",
  inappropriate: "Inappropriate content",
  off_topic: "Not about smash",
  other: "Something else",
};

export type ReportedPost = {
  postId: string;
  body: string;
  createdAt: string;
  removedAt: string | null;
  author: { id: string; tag: string; isMinor: boolean };
  context: string; // where the post lives: feed, a reply, or a ruleset discussion
  link: string;
  reports: { reason: string; details: string | null; reporter: string; createdAt: string }[];
};

/** Open reports grouped by post, most-reported first. */
export async function getOpenReports(): Promise<ReportedPost[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("post_reports")
    .select(
      "reason, details, created_at, reporter_id, post:posts(id, body, created_at, removed_at, author_id, parent_id, ruleset_id)",
    )
    .eq("status", "open")
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) throw error;

  type Raw = {
    reason: string;
    details: string | null;
    created_at: string;
    reporter_id: string;
    post: { id: string; body: string; created_at: string; removed_at: string | null; author_id: string; parent_id: string | null; ruleset_id: string | null } | null;
  };
  const rows = ((data ?? []) as unknown as Raw[]).filter((r) => r.post);
  const userIds = [...new Set(rows.flatMap((r) => [r.reporter_id, r.post!.author_id]))];
  const [{ data: profiles }, { data: dobs }] = await Promise.all([
    db.from("profiles").select("id, tag").in("id", userIds),
    db.from("private_profile_data").select("user_id, date_of_birth").in("user_id", userIds),
  ]);
  const tagOf = new Map((profiles ?? []).map((p) => [p.id, p.tag as string]));
  // No birthday on file counts as a teen, like every other age rule.
  const adultIds = new Set((dobs ?? []).filter((d) => ageFromBirthdate(d.date_of_birth) >= ADULT_AGE).map((d) => d.user_id));
  const minor = new Set(userIds.filter((id) => !adultIds.has(id)));

  const byPost = new Map<string, ReportedPost>();
  for (const r of rows) {
    const p = r.post!;
    if (!byPost.has(p.id)) {
      byPost.set(p.id, {
        postId: p.id,
        body: p.body,
        createdAt: p.created_at,
        removedAt: p.removed_at,
        author: { id: p.author_id, tag: tagOf.get(p.author_id) ?? "Unknown", isMinor: !dobs?.some((d) => d.user_id === p.author_id) || minor.has(p.author_id) },
        context: p.ruleset_id ? "Ruleset discussion" : p.parent_id ? "Reply" : "Feed post",
        link: p.ruleset_id && !p.parent_id ? `/rulesets/${p.ruleset_id}` : `/post/${p.parent_id ?? p.id}`,
        reports: [],
      });
    }
    byPost.get(p.id)!.reports.push({
      reason: r.reason,
      details: r.details,
      reporter: tagOf.get(r.reporter_id) ?? "Unknown",
      createdAt: r.created_at,
    });
  }
  return [...byPost.values()].sort((a, b) => b.reports.length - a.reports.length);
}

export async function countOpenReports(): Promise<number> {
  const db = createAdminClient();
  const [posts, live] = await Promise.all([
    db.from("post_reports").select("*", { count: "exact", head: true }).eq("status", "open"),
    db.from("live_reports").select("*", { count: "exact", head: true }).eq("status", "open"),
  ]);
  return (posts.count ?? 0) + (live.count ?? 0);
}

export type LiveReport = {
  kind: "chat" | "lobby" | "highlight" | "reel" | "message" | "profile" | "event";
  targetId: string;
  snapshot: string; // the reported text, saved when it was reported
  room: string | null;
  author: { tag: string; isMinor: boolean };
  reports: { reason: string; details: string | null; reporter: string; createdAt: string }[];
};

/** Open chat/lobby reports grouped by message or lobby, most-reported first. */
export async function getOpenLiveReports(): Promise<LiveReport[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("live_reports")
    .select("kind, target_id, author_id, snapshot, room, reporter_id, reason, details, created_at")
    .eq("status", "open")
    .order("created_at")
    .limit(500);
  if (error) throw error;
  const userIds = [...new Set((data ?? []).flatMap((r) => [r.reporter_id, r.author_id]).filter(Boolean))] as string[];
  const [{ data: profiles }, { data: dobs }] = await Promise.all([
    db.from("profiles").select("id, tag").in("id", userIds),
    db.from("private_profile_data").select("user_id, date_of_birth").in("user_id", userIds),
  ]);
  const tagOf = new Map((profiles ?? []).map((p) => [p.id, p.tag as string]));
  const adult = new Set((dobs ?? []).filter((d) => ageFromBirthdate(d.date_of_birth) >= ADULT_AGE).map((d) => d.user_id));

  const groups = new Map<string, LiveReport>();
  for (const r of data ?? []) {
    const key = `${r.kind}:${r.target_id}`;
    if (!groups.has(key)) {
      groups.set(key, {
        kind: r.kind as LiveReport["kind"],
        targetId: r.target_id,
        snapshot: r.snapshot,
        room: r.room,
        author: { tag: r.author_id ? tagOf.get(r.author_id) ?? "Deleted account" : r.kind === "reel" ? "Collected from a channel" : "Deleted account", isMinor: !!r.author_id && !adult.has(r.author_id) },
        reports: [],
      });
    }
    groups.get(key)!.reports.push({ reason: r.reason, details: r.details, reporter: tagOf.get(r.reporter_id) ?? "Unknown", createdAt: r.created_at });
  }
  return [...groups.values()].sort((a, b) => b.reports.length - a.reports.length);
}

export type ModerationLogEntry = {
  id: string;
  action: "remove_post" | "restore_post" | "dismiss_reports" | "remove_chat" | "close_lobby" | "dismiss_live" | "remove_highlight" | "hide_reel" | "remove_message" | "clear_profile";
  reason: string | null;
  createdAt: string;
  moderator: string;
  postId: string | null;
  postBody: string | null;
  postRemoved: boolean;
};

/** Recent decisions, newest first (for the log and "Undo"). */
export async function getModerationLog(limit = 30): Promise<ModerationLogEntry[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("moderation_actions")
    .select("id, action, reason, snapshot, created_at, moderator_id, post:posts(id, body, removed_at)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const modIds = [...new Set((data ?? []).map((a) => a.moderator_id).filter(Boolean))] as string[];
  const { data: mods } = await db.from("profiles").select("id, tag").in("id", modIds);
  const tagOf = new Map((mods ?? []).map((m) => [m.id, m.tag as string]));
  return (data ?? []).map((a) => {
    const post = a.post as unknown as { id: string; body: string; removed_at: string | null } | null;
    return {
      id: a.id,
      action: a.action as ModerationLogEntry["action"],
      reason: a.reason,
      createdAt: a.created_at,
      moderator: tagOf.get(a.moderator_id as string) ?? "Unknown",
      postId: post?.id ?? null,
      postBody: post?.body ?? (a.snapshot as string | null) ?? null,
      postRemoved: !!post?.removed_at,
    };
  });
}

export type SiteStats = { accounts: number; newAccounts: number; postsToday: number; messagesToday: number; openReports: number; clipsWaiting: number };

/** Numbers for the admin overview (counts only; nothing personal). */
export async function getSiteStats(): Promise<SiteStats> {
  const db = createAdminClient();
  const day = new Date(Date.now() - 86400e3).toISOString();
  const week = new Date(Date.now() - 7 * 86400e3).toISOString();
  const count = (q: PromiseLike<{ count: number | null }>) => Promise.resolve(q).then((r) => r.count ?? 0);
  const [accounts, newAccounts, postsToday, messagesToday, openReports, clipsWaiting] = await Promise.all([
    count(db.from("profiles").select("id", { count: "exact", head: true })),
    count(db.from("profiles").select("id", { count: "exact", head: true }).gt("created_at", week)),
    count(db.from("posts").select("id", { count: "exact", head: true }).gt("created_at", day)),
    count(db.from("messages").select("id", { count: "exact", head: true }).gt("created_at", day)),
    countOpenReports(),
    count(db.from("reel_submissions").select("id", { count: "exact", head: true }).eq("status", "pending")),
  ]);
  return { accounts, newAccounts, postsToday, messagesToday, openReports, clipsWaiting };
}
