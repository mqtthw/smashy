// Ranking for discussion threads and their replies. Pure functions (shared, testable). No downvotes:
// good threads and replies rise on likes and replies, and newer ones get a head start.
import type { Post } from "./posts";

export const THREAD_SORTS = ["hot", "new", "top"] as const;
export type ThreadSort = (typeof THREAD_SORTS)[number];
export const TOP_WINDOWS = ["week", "month", "year", "all"] as const;
export type TopWindow = (typeof TOP_WINDOWS)[number];
export const REPLY_SORTS = ["best", "new", "old"] as const;
export type ReplySort = (typeof REPLY_SORTS)[number];

/** "Hot": activity, fading with age (a day-old thread needs about 13x the activity of a brand-new one). */
export function hotScore(t: { likeCount: number; replyCount: number; createdAt: string }, nowMs: number): number {
  const hours = Math.max(0, (nowMs - Date.parse(t.createdAt)) / 3_600_000);
  return (t.likeCount + 2 * t.replyCount + 1) / Math.pow(hours + 2, 1.2);
}

export type ReplyNode = { post: Post; children: ReplyNode[]; size: number };

/**
 * Replies as a tree (reply_to = the reply being answered). Replies whose parent is missing (removed,
 * deleted, or hidden from this reader) are shown at the top level so nothing disappears.
 * "best" = most liked, then most discussed, then oldest; "new" = newest first; "old" = oldest first.
 */
export function buildReplyTree(replies: Post[], sort: ReplySort): ReplyNode[] {
  const nodes = new Map(replies.map((p) => [p.id, { post: p, children: [] as ReplyNode[], size: 0 }]));
  const roots: ReplyNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.post.replyTo ? nodes.get(node.post.replyTo) : undefined;
    if (parent && parent !== node) parent.children.push(node);
    else roots.push(node);
  }
  const sizeOf = (n: ReplyNode): number => (n.size = n.children.reduce((sum, c) => sum + 1 + sizeOf(c), 0));
  roots.forEach(sizeOf);
  const time = (n: ReplyNode) => Date.parse(n.post.createdAt);
  const cmp =
    sort === "new"
      ? (a: ReplyNode, b: ReplyNode) => time(b) - time(a)
      : sort === "old"
        ? (a: ReplyNode, b: ReplyNode) => time(a) - time(b)
        : (a: ReplyNode, b: ReplyNode) => b.post.likeCount - a.post.likeCount || b.size - a.size || time(a) - time(b);
  const order = (list: ReplyNode[]) => {
    list.sort(cmp);
    list.forEach((n) => order(n.children));
  };
  order(roots);
  return roots;
}
