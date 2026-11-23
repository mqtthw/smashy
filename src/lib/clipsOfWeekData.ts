// "Clips of the week", ready to show (round 759): the week's most liked clips from both places clips
// live on Smashy, in one list. A clip is a post with a video (uploaded or linked), or a clip in Reels.
// The picking is in posts.ts (clipsOfWeekIds) and clipsOfWeek.ts; this reads each pick as the viewer.
import "server-only";
import { CLIPS_OF_WEEK, clipLinkThumbnail } from "./clipsOfWeek";
import { withoutLinks } from "./embeds";
import { getClipsOfWeek, tweetVideoStill, type Post } from "./posts";
import type { FeedGame } from "./postConstants";
import { getReel, type ExternalReel } from "./reels";

export type ClipItem = {
  key: string;
  /** Where the clip opens on Smashy: its post, or its page in Reels. */
  href: string;
  /** Who to credit: the player who posted or shared it, or (a Reels clip nobody shared) its channel. */
  tag: string;
  handle: string | null; // null: a channel, not a Smashy player
  words: string;
  likes: number;
  picture: string | null;
  game: string;
  post?: Post;
  reel?: ExternalReel;
};

export async function getClipsOfWeekItems(game: FeedGame | undefined, userId: string | null, opts: { limit?: number; perAuthor?: number } = {}): Promise<ClipItem[]> {
  const picks = await getClipsOfWeek(game, userId, opts);
  const items = await Promise.all(
    picks.map(async (pick): Promise<ClipItem | null> => {
      if (pick.kind === "post") {
        const p = pick.post;
        return {
          key: p.id,
          href: `/post/${p.id}`,
          tag: p.author.tag,
          handle: p.author.handle,
          words: withoutLinks(p.body),
          likes: p.likeCount + p.reactions.reduce((n, r) => n + r.count, 0),
          // An uploaded video's still, else YouTube's, else the linked tweet's video still (a kept read).
          picture: p.video?.posterUrl ?? clipLinkThumbnail(p.body) ?? (await tweetVideoStill(p.body)),
          game: p.game,
          post: p,
        };
      }
      // Read as the viewer: a clip hidden since the list was made just drops out.
      const r = await getReel(pick.clipId).catch(() => null);
      if (!r) return null;
      return {
        key: `reel:${r.clipId}`,
        href: `/reels/${encodeURIComponent(r.clipId)}`,
        tag: r.sharedBy?.tag ?? r.channelName ?? r.channelLogin,
        handle: r.sharedBy?.handle ?? null,
        words: r.title,
        likes: r.likes,
        picture: r.thumbnailUrl,
        game: r.game,
        reel: r,
      };
    }),
  );
  // getClipsOfWeek hands over spares; the ones this viewer can see, up to the number asked for.
  return items.filter((i): i is ClipItem => i !== null).slice(0, opts.limit ?? CLIPS_OF_WEEK);
}
