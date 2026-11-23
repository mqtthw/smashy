// "Clips of the week" on the Feed (round 751, Paper King's idea): the clips players posted in the last
// 7 days that people liked most, to put players' names in front of everyone. Chosen by likes and
// reactions alone: Smashy doesn't pick. Plain logic, no database (the read is in posts.ts).
import { playerLinks } from "./embeds";

export const CLIPS_OF_WEEK = 3;
export const CLIPS_OF_WEEK_DAYS = 7;

/** `hasVideo`: a video uploaded to the post, or a linked tweet that has a video (round 752). */
export type ClipCandidate = { id: string; authorId: string; body: string; likes: number; createdAt: string; hasVideo: boolean };

/** How many liked posts with an X link are looked up on X to see whether the tweet has a video. */
export const TWEET_LOOKUPS = 20;

/** A clip post: one with a video (see `hasVideo`), or a YouTube, Twitch or Streamable link that plays in it. */
export function isClipPost(c: Pick<ClipCandidate, "body" | "hasVideo">): boolean {
  return c.hasVideo || playerLinks(c.body, 1).length > 0;
}

/**
 * The week's picks, best first: clip posts with at least one like or reaction, most liked first (the
 * newer one wins a tie), one spot per player so more names get shown.
 */
export function pickClipsOfWeek(rows: ClipCandidate[], limit = CLIPS_OF_WEEK): string[] {
  const ranked = rows
    .filter((r) => r.likes > 0 && isClipPost(r))
    .sort((a, b) => b.likes - a.likes || Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const authors = new Set<string>();
  const out: string[] = [];
  for (const r of ranked) {
    if (authors.has(r.authorId)) continue;
    authors.add(r.authorId);
    out.push(r.id);
    if (out.length === limit) break;
  }
  return out;
}

/** A still picture for a clip link, when one can be had without asking anybody: YouTube's own. */
export function clipLinkThumbnail(body: string): string | null {
  const first = playerLinks(body, 1)[0];
  const id = first?.provider === "YouTube" ? first.src.match(/\/embed\/([A-Za-z0-9_-]{6,20})/)?.[1] : null;
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}
