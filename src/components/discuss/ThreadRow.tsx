import Link from "next/link";
import GameBadge from "@/components/GameBadge";
import TimeAgo from "@/components/ui/TimeAgo";
import { characterName } from "@/lib/characters";
import { flairKey } from "@/components/feed/flairKey";
import { T } from "@/lib/i18n/client";
import type { Post } from "@/lib/posts";
import { hideInlineSpoilers } from "@/lib/spoilerText";
import Icon from "@/components/ui/Icon";

/** One thread in a board: flair, title, a line of the text, who started it, and how much it's discussed. */
export default function ThreadRow({ post, now }: { post: Post; now: number }) {
  const matchup = post.game !== "general" && post.character
    ? `${characterName(post.game, post.character) ?? post.character}${post.vsCharacter ? ` vs ${characterName(post.game, post.vsCharacter) ?? post.vsCharacter}` : ""}`
    : null;
  return (
    // Each thread is its own glass card (round 501); the list around it spaces them out.
    <li className="card overflow-hidden">
      <Link href={`/post/${post.id}`} className="flex flex-col gap-1 px-4 py-3 hover:bg-surface">
        <div className="flex flex-wrap items-center gap-1.5 text-meta">
          {post.flair && <span className="badge border border-line font-normal"><T k={flairKey(post.flair)} /></span>}
          {post.game !== "general" && <GameBadge game={post.game} />}
          {matchup && <span className="badge border border-line font-normal">{matchup}</span>}
          {post.spoiler && <span className="badge border border-brand font-normal text-brand"><T k="feed.compose.spoiler" /></span>}
        </div>
        <h2 className="font-bold leading-snug">{hideInlineSpoilers(post.title ?? "")}</h2>
        {!post.spoiler && <p className="line-clamp-2 text-sm text-muted">{hideInlineSpoilers(post.body)}</p>}
        <p className="text-meta text-muted">
          {post.author.tag} · <TimeAgo at={post.createdAt} serverNow={now} /> · <Icon name="chat" /> {post.replyCount} · <Icon name="heart" /> {post.likeCount}
        </p>
      </Link>
    </li>
  );
}
