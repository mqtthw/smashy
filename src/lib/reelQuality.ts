// Which collected clips are junk and stay out of Reels (shared by server code and tests).
// The same rules are in the reels_upgrade migration for clips collected before this existed.

const SPONSOR = /\b(zenni|sponsor(ed)?|promo code|use code|giveaway)\b/i;
const NO_TITLE = new Set(["test", "clip", "clipped", "untitled"]);

/** Barely watched, no real title, or a stream sponsor ad. Clips people shared are never junk (an admin checked them). */
export function isLowQualityClip(title: string, views: number, minViews = 5): boolean {
  const t = title.trim();
  if (views < minViews) return true;
  if (t.replace(/[^\p{L}\p{N}]/gu, "").length < 3) return true;
  if (NO_TITLE.has(t.toLowerCase())) return true;
  return SPONSOR.test(t);
}

/**
 * Twitch-wide top clips need at least this many views (they come from any channel, so the bar is
 * higher). Checked Nov 2026: about 100 Melee and 100 Ultimate clips a month clear 50 views.
 */
export const TOP_CLIP_MIN_VIEWS = 50;
/** How far back Twitch-wide top clips go (the same window Reels shows). */
export const TOP_CLIP_DAYS = 30;
/**
 * Twitch sorts clips by views, so one 30-day request returns the month's biggest hits and today's
 * clips never make the cut. Asking for several windows (last day, 3 days, week, month) gives fresh
 * clips their own slots.
 */
export const TOP_CLIP_WINDOWS_DAYS = [1, 3, 7, TOP_CLIP_DAYS] as const;

/**
 * The view bar for a Twitch-wide clip, by age: a clip from today hasn't had time to collect views,
 * so the bar starts lower and rises to the full bar after a week. Re-checked on every refresh, so a
 * clip that never takes off drops out as it ages.
 */
export function topClipMinViews(createdAt: string, now = Date.now()): number {
  const days = (now - Date.parse(createdAt)) / 86400e3;
  if (days < 1) return 20;
  if (days < 3) return 30;
  if (days < 7) return 40;
  return TOP_CLIP_MIN_VIEWS;
}
