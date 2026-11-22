// Post constants shared by server code and browser components (no server-only imports here).
export const FEED_GAMES = ["melee", "ultimate", "pplus", "smash64", "brawl", "smash4", "general"] as const;
export type FeedGame = (typeof FEED_GAMES)[number];
export const FEED_PAGE_SIZE = 30;
export const POST_MAX_LENGTH = 500;

/** How long a poll can stay open, in hours (1 hour, 1 day, 3 days, 1 week). */
export const POLL_LENGTHS = [1, 24, 72, 168] as const;
export const POLL_MAX_OPTION = 40;

/** Discussion threads: a title, a flair, and room for a longer post. */
export const THREAD_MAX_LENGTH = 5000;
export const THREAD_TITLE_MIN = 3;
export const THREAD_TITLE_MAX = 120;
export const FLAIRS = [
  { key: "discussion", label: "Discussion" },
  { key: "question", label: "Question" },
  { key: "help", label: "Help" },
  { key: "newplayer", label: "New player" },
  { key: "analysis", label: "Analysis" },
  { key: "news", label: "News" },
  { key: "meme", label: "Meme" },
  { key: "art", label: "Art" },
] as const;
export type Flair = (typeof FLAIRS)[number]["key"];
export const isFlair = (v: unknown): v is Flair => FLAIRS.some((f) => f.key === v);
export const flairLabel = (f: Flair) => FLAIRS.find((x) => x.key === f)?.label ?? f;
