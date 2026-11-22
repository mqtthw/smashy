// Mixing videos from posts into Reels (round 421). Plain logic, no database, so it can be tested.
//
// Reels is a list read in pages (offset + limit). Post videos take every POST_EVERY-th spot
// (the 5th, 10th, 15th…) while there are any; the rest are Twitch and YouTube clips in their usual
// order. Because the spots are fixed, any page can work out how many post videos came before it,
// and so where the clips continue.

export const POST_EVERY = 5;

/** How many post videos sit before list position `offset` (0-based), with `total` post videos in all. `every`: they take every so-many-th spot (search results use it too). */
export function postsBefore(offset: number, total: number, every = POST_EVERY): number {
  return Math.min(total, Math.floor(offset / every));
}

/**
 * One page of the mixed list. `posts` = every post video in order; `clips` = clips starting at
 * offset - postsBefore(offset), at least `limit` of them if there are that many; `clipsHaveMore` =
 * there are clips after the ones passed.
 */
export function mixPage<T>(offset: number, limit: number, posts: T[], clips: T[], clipsHaveMore: boolean, every = POST_EVERY): { items: T[]; hasMore: boolean } {
  let p = postsBefore(offset, posts.length, every);
  let c = 0;
  const items: T[] = [];
  for (let k = offset; items.length < limit; k++) {
    if ((k + 1) % every === 0 && p < posts.length) items.push(posts[p++]);
    else if (c < clips.length) items.push(clips[c++]);
    else if (p < posts.length) items.push(posts[p++]); // clips ran out: the rest of the post videos
    else break;
  }
  return { items, hasMore: c < clips.length || clipsHaveMore || p < posts.length };
}

/** Order of post videos: newer and more liked first; ones this device already watched go last. */
export function rankPostVideos<T extends { id: string; createdAt: string; likeCount: number }>(posts: T[], seen: ReadonlySet<string>, now: number): T[] {
  const score = (p: T) => (1 + p.likeCount * 0.5) / Math.pow(Math.max(0, now - Date.parse(p.createdAt)) / 86400e3 + 1, 1.5);
  return [...posts].sort((a, b) => Number(seen.has(a.id)) - Number(seen.has(b.id)) || score(b) - score(a) || a.id.localeCompare(b.id));
}
