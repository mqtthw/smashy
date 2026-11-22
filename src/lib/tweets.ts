// Reads a tweet for its card in a post (see tweetCard.ts). One copy shared by every server for an hour,
// so a popular post doesn't ask X again for each visitor.
import "server-only";
import { cacheLife } from "next/cache";
import { toTweetCard, tweetDataUrl, type TweetCard } from "./tweetCard";

const GONE = new Set(["TweetTombstone", "TweetUnavailable"]);

/** The tweet's card, or null when X has no such tweet (deleted, private, hidden). Throws when X can't be reached. */
export async function getTweetCard(id: string): Promise<TweetCard | null> {
  "use cache: remote";
  cacheLife({ stale: 3600, revalidate: 3600, expire: 86400 });
  const res = await fetch(tweetDataUrl(id), { signal: AbortSignal.timeout(5000) });
  if (res.status === 404) {
    cacheLife("minutes"); // gone, or not out yet: asked again soon (round 631)
    return null;
  }
  if (!res.ok) throw new Error(`X tweet data: ${res.status}`); // not kept: the next visitor tries again
  const raw = (await res.json().catch(() => null)) as { __typename?: string } | null;
  const card = toTweetCard(raw);
  if (card) return card;
  // An answer we don't recognize isn't kept as "no tweet" for everyone (round 631).
  if (!raw || !GONE.has(raw.__typename ?? "")) throw new Error("X tweet data: unexpected answer");
  cacheLife("minutes");
  return null;
}
