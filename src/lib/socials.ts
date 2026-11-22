// Socials on player pages (round 425). People paste a link or type a handle; Smashy keeps only the
// bare handle and builds the link itself, so a social can only ever open that site's profile page.
// The database checks the same shapes (migration 20261227100000_profile_socials.sql).

export const SOCIALS = [
  { key: "twitch", column: "social_twitch", label: "Twitch", hosts: ["twitch.tv", "www.twitch.tv", "m.twitch.tv"], shape: /^[A-Za-z0-9_]{3,25}$/, url: (h: string) => `https://www.twitch.tv/${h}` },
  {
    key: "youtube",
    column: "social_youtube",
    label: "YouTube",
    hosts: ["youtube.com", "www.youtube.com", "m.youtube.com"],
    shape: /^[A-Za-z0-9._-]{3,30}$/,
    // Channel ids (UC + 22 characters) open as /channel/…, everything else as an @handle.
    url: (h: string) => (/^UC[A-Za-z0-9_-]{22}$/.test(h) ? `https://www.youtube.com/channel/${h}` : `https://www.youtube.com/@${h}`),
  },
  { key: "x", column: "social_x", label: "X", hosts: ["x.com", "www.x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com"], shape: /^[A-Za-z0-9_]{1,15}$/, url: (h: string) => `https://x.com/${h}` },
  { key: "instagram", column: "social_instagram", label: "Instagram", hosts: ["instagram.com", "www.instagram.com"], shape: /^[A-Za-z0-9._]{1,30}$/, url: (h: string) => `https://www.instagram.com/${h}` },
  { key: "reddit", column: "social_reddit", label: "Reddit", hosts: ["reddit.com", "www.reddit.com", "old.reddit.com", "new.reddit.com"], shape: /^[A-Za-z0-9_-]{3,20}$/, url: (h: string) => `https://www.reddit.com/user/${h}` },
  { key: "bluesky", column: "social_bluesky", label: "Bluesky", hosts: ["bsky.app", "www.bsky.app"], shape: /^(?=.{3,100}$)[a-z0-9-]+(\.[a-z0-9-]+)+$/, url: (h: string) => `https://bsky.app/profile/${h}` },
  // Slippi connect code (round 690), kept as "ABCD#123"; slippi.gg/user/abcd-123 is the player's Slippi page.
  { key: "slippi", column: "social_slippi", label: "Slippi", hosts: ["slippi.gg", "www.slippi.gg"], shape: /^[A-Z0-9]{1,7}#[0-9]{1,7}$/, url: (h: string) => `https://slippi.gg/user/${h.toLowerCase().replace("#", "-")}` },
] as const;

export type SocialKey = (typeof SOCIALS)[number]["key"];
export type SocialColumn = (typeof SOCIALS)[number]["column"];
export type Social = (typeof SOCIALS)[number];

/**
 * What someone typed or pasted, as the bare handle to save: null for an empty box, "bad" when it
 * isn't that site's handle or profile link (a different site, a video link, odd characters).
 */
export function parseSocial(s: Social, input: string): string | null | "bad" {
  let v = input.trim();
  if (!v) return null;
  if (/^(https?:\/\/)?([a-z0-9-]+\.)*[a-z0-9-]+\.[a-z]{2,}\//i.test(v)) {
    let u: URL;
    try {
      u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    } catch {
      return "bad";
    }
    if (!(s.hosts as readonly string[]).includes(u.hostname.toLowerCase())) return "bad";
    const parts = u.pathname.split("/").filter(Boolean);
    if (s.key === "youtube") {
      // youtube.com/@name, /channel/UC…, /c/name or /user/name; not a video.
      if (parts[0]?.startsWith("@")) v = parts[0].slice(1);
      else if (["channel", "c", "user"].includes(parts[0] ?? "") && parts[1]) v = parts[1];
      else return "bad";
    } else if (s.key === "reddit") {
      // reddit.com/user/name or /u/name; not a subreddit or a post.
      if (!["user", "u"].includes(parts[0] ?? "") || !parts[1]) return "bad";
      v = parts[1];
    } else if (s.key === "slippi") {
      // slippi.gg/user/abcd-123
      if (parts[0] !== "user" || !parts[1]) return "bad";
      v = parts[1];
    } else if (s.key === "bluesky") {
      if (parts[0] !== "profile" || !parts[1]) return "bad";
      v = parts[1];
    } else {
      if (parts.length !== 1) return "bad";
      v = parts[0];
    }
  }
  v = v.replace(/^@/, "");
  if (s.key === "reddit") v = v.replace(/^\/?u\//i, ""); // "u/name" as Reddit writes it
  if (s.key === "bluesky") v = v.toLowerCase();
  // Connect codes are written "ABCD#123"; people also type "abcd-123" or "ABCD 123".
  if (s.key === "slippi") v = v.toUpperCase().replace(/^([A-Z0-9]{1,7})\s*[-#\s]\s*([0-9]{1,7})$/, "$1#$2");
  return s.shape.test(v) ? v : "bad";
}

/** The socials set on a profile row, in display order, with their links. */
export function profileSocials(row: Partial<Record<SocialColumn, string | null>>): { key: SocialKey; label: string; handle: string; url: string }[] {
  return SOCIALS.flatMap((s) => {
    const handle = row[s.column];
    return handle && s.shape.test(handle) ? [{ key: s.key, label: s.label, handle, url: s.url(handle) }] : [];
  });
}
