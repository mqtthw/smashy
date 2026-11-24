// The clips this device watched, sent along with the Reels page request (round 805).
//
// Reels remembers watched clips in the browser so new ones come first. The server couldn't see that list
// when it picked the first clips, so the page asked again a second later and swapped them, which made the
// screen jump (round 803 stopped the jump; the swap and the wait were still there). The most recent watched
// clip ids now travel in a cookie that is only sent to /reels, so the first answer is already in the right
// order. They're public clip ids, the same ones the page was already sending when it asked for more clips;
// the server doesn't keep them.
// Shared by the browser (writes it) and the server (reads it); plain logic so it can be tested.

export const REEL_SEEN_COOKIE = "smashy_reels_seen";
/** Room for about 75 clip ids (they average 38 characters); a cookie holds about 4,000. */
export const REEL_SEEN_MAX_CHARS = 3000;
const ID = /^[\w-]{1,120}$/;

/** The cookie's value: the most recently watched ids that fit, oldest first, joined by dots. */
export function encodeSeen(seen: readonly string[], maxChars = REEL_SEEN_MAX_CHARS): string {
  const kept: string[] = [];
  let used = 0;
  for (let i = seen.length - 1; i >= 0; i--) {
    const id = seen[i];
    if (!ID.test(id)) continue;
    if (used + id.length + 1 > maxChars) break;
    kept.unshift(id);
    used += id.length + 1;
  }
  return kept.join(".");
}

/** The ids in a cookie value (anything that isn't a clip id is dropped). */
export function decodeSeen(value: string | null | undefined): string[] {
  if (!value) return [];
  return value.slice(0, REEL_SEEN_MAX_CHARS + 200).split(".").filter((id) => ID.test(id));
}

/** The line to assign to `document.cookie`. Only sent with requests to /reels, kept a year. */
export function seenCookieString(seen: readonly string[]): string {
  return `${REEL_SEEN_COOKIE}=${encodeSeen(seen)}; Path=/reels; Max-Age=31536000; SameSite=Lax; Secure`;
}
