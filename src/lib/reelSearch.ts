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

/** The same words in a fixed form, so "Plup", "plup " and "PLUP" share one cached YouTube search. */
export function reelSearchKey(q: string): string {
  return reelSearchWords(q).join(" ");
}

// ---------- Live YouTube searches (round 716) ----------
// Each new search costs 100 of YouTube's 10,000 free daily units (collecting Shorts from approved
// channels uses a few hundred a day). Searches are cached for a day, and each server asks YouTube at
// most this many times a day; if YouTube says the allowance is used up anyway, live searches pause.

/** Live Shorts take every third spot in search results. */
export const LIVE_SHORT_EVERY = 3;
export const LIVE_SEARCHES_PER_DAY = 50;
/**
 * The whole site's new live searches per (UTC) day, counted in the database (round 735): about 3,000 of
 * YouTube's 10,000 daily units at most, leaving the rest for collecting Shorts from approved channels.
 */
export const LIVE_SEARCHES_SITE_WIDE = 30;
const PAUSE_MS = 3 * 3600e3;

let day = "";
let used = 0;
let pausedUntil = 0;

/** May this server ask YouTube for one more search now? Counts it if so. */
export function takeLiveSearch(now: number): boolean {
  if (now < pausedUntil) return false;
  const today = new Date(now).toISOString().slice(0, 10);
  if (today !== day) {
    day = today;
    used = 0;
  }
  if (used >= LIVE_SEARCHES_PER_DAY) return false;
  used++;
  return true;
}

/** YouTube said the allowance is used up: stop asking for a few hours. */
export function pauseLiveSearch(now: number) {
  pausedUntil = now + PAUSE_MS;
}

/** For tests. */
export function resetLiveSearches() {
  day = "";
  used = 0;
  pausedUntil = 0;
}
