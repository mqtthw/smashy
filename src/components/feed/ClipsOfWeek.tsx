import Link from "next/link";
import { clipLinkThumbnail } from "@/lib/clipsOfWeek";
import { withoutLinks } from "@/lib/embeds";
import { getClipsOfWeek } from "@/lib/posts";
import type { FeedGame } from "@/lib/postConstants";
import Icon from "@/components/ui/Icon";
import { T } from "@/lib/i18n/client";

/**
 * "Clips of the week" at the top of the Feed (round 751): the clips players posted in the last 7 days
 * that got the most likes, one per player, each opening its post. Nothing is shown in a week with no
 * liked clips.
 */
export default async function ClipsOfWeek({ game, userId }: { game: FeedGame | undefined; userId: string | null }) {
  const posts = await getClipsOfWeek(game, userId).catch(() => []);
  if (!posts.length) return null;
  return (
    <section aria-labelledby="clips-of-week" className="flex flex-col gap-2 border-b border-line px-4 py-3">
      <div>
        <h2 id="clips-of-week" className="font-bold"><Icon name="trophy" /> <T k="feed.clipsWeek.title" /></h2>
        <p className="text-meta text-muted"><T k="feed.clipsWeek.sub" /></p>
      </div>
      <ol className="flex flex-col gap-2">
        {posts.map((p, i) => {
          const picture = p.video?.posterUrl ?? clipLinkThumbnail(p.body);
          const words = withoutLinks(p.body);
          const likes = p.likeCount + p.reactions.reduce((n, r) => n + r.count, 0);
          return (
            <li key={p.id}>
              <Link href={`/post/${p.id}`} className="group flex items-center gap-3 rounded-xl p-1 hover:bg-surface">
                <span className="w-4 shrink-0 text-center text-sm font-bold text-muted" aria-hidden="true">{i + 1}</span>
                <span className="relative block h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-neutral-900">
                  {picture && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={picture} alt="" loading="lazy" className="h-full w-full object-cover" />
                  )}
                  <span className="absolute inset-0 flex items-center justify-center text-white/90" aria-hidden="true">▶</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    <span className="truncate">{p.author.tag}</span>
                    <span className="truncate font-normal text-muted">@{p.author.handle}</span>
                  </span>
                  <span className="block truncate text-sm text-muted">{words || <T k="feed.clips.clip" />}</span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-muted"><Icon name="heart" /> {likes}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
