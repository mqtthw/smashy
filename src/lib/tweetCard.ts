// Tweets linked in posts show as a Smashy-made card (round 622, Matthew chose it over X's own embed,
// which loads X's tracking script and slows the Feed). The data is X's public tweet data: the same
// address X's embeds and many other sites read (cdn.syndication.twimg.com). It isn't an official API,
// so anything missing or unexpected gives null and the post shows the plain link instead.
// Plain module (no server-only): the server reads tweets with it, tests check it.

export type TweetCard = {
  id: string;
  name: string;
  handle: string;
  avatar: string | null;
  text: string;
  createdAt: string;
  /** The first photo, or a video's still picture (`video` true). */
  picture: { url: string; width: number; height: number; video: boolean } | null;
};

type Raw = {
  __typename?: string;
  id_str?: string;
  text?: string;
  created_at?: string;
  display_text_range?: [number, number];
  entities?: { urls?: { url: string; expanded_url: string }[]; media?: { url: string }[] };
  user?: { name?: string; screen_name?: string; profile_image_url_https?: string };
  mediaDetails?: { type?: string; media_url_https?: string; original_info?: { width?: number; height?: number } }[];
};

/** The address X's own embed code uses for a tweet's data (its "token" is worked out from the id). */
export function tweetDataUrl(id: string): string {
  const token = ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, "");
  return `https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=en&token=${token}`;
}

const decode = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");

/** X's tweet data → the card, or null for a deleted or hidden tweet or data in a shape we don't know. */
export function toTweetCard(raw: unknown): TweetCard | null {
  const t = raw as Raw | null;
  if (!t || typeof t !== "object" || t.__typename !== "Tweet") return null;
  const id = t.id_str, handle = t.user?.screen_name, text = t.text;
  if (!id || !/^\d+$/.test(id) || !handle || typeof text !== "string") return null;

  // The words only: X counts the range in characters (not UTF-16 units), and leaves the photo's
  // t.co link after it. Short links inside the words become the real addresses.
  const chars = Array.from(text);
  const [from, to] = t.display_text_range ?? [0, chars.length];
  let words = chars.slice(from, to).join("");
  for (const u of t.entities?.urls ?? []) if (u.url && u.expanded_url) words = words.split(u.url).join(u.expanded_url);
  for (const m of t.entities?.media ?? []) if (m.url) words = words.split(m.url).join("");

  const media = (t.mediaDetails ?? []).find((m) => m.media_url_https?.startsWith("https://pbs.twimg.com/"));
  const w = media?.original_info?.width, h = media?.original_info?.height;
  const picture = media?.media_url_https && w && h
    ? { url: `${media.media_url_https}?name=medium`, width: w, height: h, video: media.type !== "photo" }
    : null;
  const avatar = t.user?.profile_image_url_https?.startsWith("https://pbs.twimg.com/") ? t.user.profile_image_url_https.replace("_normal.", "_bigger.") : null;

  return {
    id,
    name: decode(t.user?.name || handle).slice(0, 60),
    handle,
    avatar,
    text: decode(words).trim().slice(0, 1000),
    createdAt: t.created_at ?? "",
    picture,
  };
}
