// Searching Reels (round 713): the words someone typed, cleaned so they're safe to put in a database
// filter. Only letters and numbers count (any language); everything else splits words. Each word has
// to appear in the clip's title or channel name.
export const REEL_SEARCH_MAX = 60;
const MAX_WORDS = 4;

/** The search box's text, tidied for the address bar (or null when there's nothing to search). */
export function cleanReelQuery(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const q = raw.normalize("NFKC").replace(/\s+/g, " ").trim().slice(0, REEL_SEARCH_MAX);
  return reelSearchWords(q).length ? q : null;
}

/** The words to look for: letters and numbers only, at most four, no repeats. */
export function reelSearchWords(q: string): string[] {
  const words = q
    .normalize("NFKC")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 2 || /[^\x00-\x7f]/.test(w)); // one letter is too broad, except in Japanese and the like
  return [...new Set(words)].slice(0, MAX_WORDS);
}

/** One PostgREST "or" filter per word: the word in the title, channel name or channel login. */
export function reelSearchFilters(q: string): string[] {
  return reelSearchWords(q).map((w) => `title.ilike.*${w}*,channel_name.ilike.*${w}*,channel_login.ilike.*${w}*`);
}
