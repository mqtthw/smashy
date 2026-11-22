import LocalTime from "@/components/ui/LocalTime";
import MainBadge from "@/components/MainBadge";
import Link from "next/link";
import GameBadge from "@/components/GameBadge";
import { characterName } from "@/lib/characters";
import type { Post } from "@/lib/posts";
import LikeButton from "./LikeButton";
import ReactionBar from "./ReactionBar";
import RepostButton from "./RepostButton";
import LinkifiedText from "./LinkifiedText";
import PostMedia from "./PostMedia";
import EmbedPlayer from "@/components/highlights/EmbedPlayer";
import { playerLinks, tweetLinks } from "@/lib/embeds";
import TweetEmbed from "./TweetEmbed";
import PollCard from "./PollCard";
import TranslateButton from "@/components/ui/TranslateButton";
import PostMenu from "./PostMenu";
import Avatar from "@/components/ui/Avatar";
import TimeAgo from "@/components/ui/TimeAgo";
import Spoiler, { InlineSpoiler } from "@/components/ui/Spoiler";
import HostedEventCard from "@/components/host/HostedEventCard";
import { POST_MAX_LENGTH, THREAD_MAX_LENGTH } from "@/lib/postConstants";
import { hideInlineSpoilers, INLINE_SPOILER } from "@/lib/spoilerText";
import { scoreText } from "@/lib/brackets/score";
import Icon from "@/components/ui/Icon";
import { T } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/core";
import { flairKey } from "./flairKey";
import { TLink, TOrdinal, TShareButton, TSpoiler, TWith } from "./Translated";

// Kept in sync with the reasons in lib/moderation.ts (that file is server-only).
const REMOVAL_REASONS: Record<string, MessageKey> = {
  spam: "feed.removal.spam",
  harassment: "feed.removal.harassment",
  inappropriate: "feed.removal.inappropriate",
  off_topic: "feed.removal.off_topic",
  other: "feed.removal.other",
};


function EventCard({ card }: { card: NonNullable<Post["card"]> }) {
  const placed = card.template === "placed" && card.placement;
  return (
    <Link href={`/events/${card.tournamentSlug}`} className="mt-2 flex items-center gap-3 rounded-xl border border-line p-3 hover:bg-surface">
      <div className="w-14 shrink-0 text-center">
        {placed ? (
          <>
            <div className={`text-lg font-bold leading-tight ${card.placement! <= 3 ? "text-brand" : ""}`}><TOrdinal n={card.placement!} /></div>
            {card.numEntrants && <div className="text-xs text-muted"><T k="feed.card.of" values={{ n: card.numEntrants }} /></div>}
          </>
        ) : (
          <div className="text-xs font-semibold uppercase text-brand"><T k="feed.card.signedUp" /></div>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold">{card.tournamentName}</p>
        <p className="truncate text-xs text-muted">
          {card.eventName}
          {card.eventName && card.eventStartAt && " · "}
          {card.eventStartAt && <LocalTime iso={card.eventStartAt} style="eventDate" />}
          {placed && <> · <T k="feed.card.verified" /></>}
        </p>
      </div>
    </Link>
  );
}

export default function PostCard({
  post,
  now,
  viewerId,
  showReplyLink = true,
  afterDelete,
  repostedBy = null,
  why = null,
  full = false,
  hideEventCard = false,
}: {
  post: Post;
  now: number;
  viewerId: string | null;
  showReplyLink?: boolean;
  afterDelete?: string;
  repostedBy?: { tag: string; handle: string } | null;
  why?: string | null;
  full?: boolean; // the thread's own page: show a thread's whole text
  hideEventCard?: boolean; // on the event's own page, its card would repeat what's above
}) {
  const content = (
    <>
      {post.title && (
        <div className="mt-0.5">
          {post.flair && (
            <TLink
              href={`/discuss?${post.game === "general" ? "" : `game=${post.game}&`}flair=${post.flair}`}
              className="badge mr-1.5 border border-line align-middle font-normal hover:bg-surface"
              titleKey="feed.card.moreLikeThis"
            >
              <T k={flairKey(post.flair)} />
            </TLink>
          )}
          {full ? (
            <h1 className="inline align-middle font-sans text-title font-bold"><LinkifiedTitle title={post.title} /></h1>
          ) : (
            <Link href={`/post/${post.id}`} className="align-middle text-title font-bold hover:underline">{hideInlineSpoilers(post.title)}</Link>
          )}
        </div>
      )}
      <div className={`mt-0.5 ${post.title && !full ? "line-clamp-4" : ""}`}>
        <LinkifiedText text={post.body} game={post.game === "general" ? null : post.game} players={post.mentioned} />
      </div>
      {!post.removedReason && <TranslateButton text={post.title ? `${post.title}\n\n${post.body}` : post.body} source={{ kind: "post", id: post.id }} />}
      <PostMedia media={post.media} />
      {/* YouTube, Twitch and Streamable links play right in the post, up to 3 (round 450). */}
      {!post.removedReason && playerLinks(post.body, 3).map((embed) => (
        <div key={embed.src} className="mt-2"><EmbedPlayer embed={embed} /></div>
      ))}
      {/* Linked tweets show as a Smashy-made card, up to 2 (round 622). */}
      {!post.removedReason && tweetLinks(post.body, 2).map((tw) => (
        <div key={tw.id} className="mt-2"><TweetEmbed id={tw.id} href={tw.href} /></div>
      ))}
      {post.poll && !post.removedReason && <PollCard postId={post.id} poll={post.poll} now={now} signedIn={!!viewerId} isMine={post.author.id === viewerId} />}
      {post.card && (post.card.template === "placed" ? <TSpoiler results labelKey="feed.card.resultHidden"><EventCard card={post.card} /></TSpoiler> : <EventCard card={post.card} />)}
      {post.quote && <QuoteCard quote={post.quote} now={now} />}
      {post.quoteSet && <TSpoiler results labelKey="feed.card.scoreHidden"><SetQuoteCard set={post.quoteSet} /></TSpoiler>}
      {post.quoteReel && <ReelQuoteCard reel={post.quoteReel} />}
      {post.hostedEvent && !hideEventCard && <HostedEventCard e={post.hostedEvent} />}
    </>
  );
  return (
    <article className="flex flex-col px-4 py-3">
      {repostedBy && (
        <p className="mb-1 ml-8 text-xs font-semibold text-muted">
          <Icon name="repeat" /> <Link href={`/u/${repostedBy.handle}`} className="hover:underline">{repostedBy.tag}</Link> <T k="feed.card.reposted" />
        </p>
      )}
      {why && !repostedBy && <p className="mb-1 ml-[3.25rem] text-meta text-muted">{why}</p>}
      <div className="flex gap-3">
      <TLink
        href={`/u/${post.author.handle}`}
        labelKey="feed.card.profile"
        values={{ name: post.author.tag }}
        className="shrink-0"
      >
        <Avatar name={post.author.tag} src={post.author.avatarUrl} />
      </TLink>
      <div className="min-w-0 flex-1">
        <header className="flex items-center gap-1.5 text-sm">
          {/* The name wins the space on small screens; @handle and city show when there's room. */}
          <Link href={`/u/${post.author.handle}`} className="min-w-[3.5rem] truncate font-bold hover:underline">{post.author.tag}</Link>
          <MainBadge main={post.author.main} />
          <span className="hidden truncate text-muted sm:inline">@{post.author.handle}</span>
          {post.author.homeCity && <span className="hidden truncate text-muted sm:inline">· {post.author.homeCity}</span>}
          <span className="shrink-0 text-muted">· <TimeAgo at={post.createdAt} serverNow={now} editedAt={post.editedAt} /></span>
          {/* Pushed to the right. When space runs out the character badge gives way first (it shortens
              with "…", down to a small minimum), then the name; the game badge and menu never shrink. */}
          <span aria-hidden="true" className="ml-auto" />
            {post.game !== "general" && !post.parentId && post.character && (
              <Link
                href={post.vsCharacter ? `/games/${post.game}/${post.character}/vs/${post.vsCharacter}` : `/games/${post.game}/${post.character}`}
                className="badge block min-w-[3rem] shrink-[100] truncate border border-line font-normal hover:bg-surface max-[359px]:hidden"
              >
                {characterName(post.game, post.character) ?? post.character}
                {post.vsCharacter && ` vs ${characterName(post.game, post.vsCharacter) ?? post.vsCharacter}`}
              </Link>
            )}
            {post.game !== "general" && !post.parentId && <span className="shrink-0"><GameBadge game={post.game} /></span>}
            {viewerId && (
              <span className="shrink-0">
              <PostMenu
                postId={post.id}
                isMine={post.author.id === viewerId}
                game={post.author.id === viewerId && !post.parentId && !post.removedReason ? post.game : null}
                afterDelete={afterDelete}
                saved={post.savedByMe}
                pinned={post.pinned}
                canPin={!post.parentId}
                editableBody={post.author.id === viewerId && !post.removedReason && now - Date.parse(post.createdAt) / 1000 < 15 * 60 ? post.body : null}
                editMax={post.title ? THREAD_MAX_LENGTH : POST_MAX_LENGTH}
              />
              </span>
            )}
        </header>

        {post.spoiler ? <Spoiler>{content}</Spoiler> : content}

        {post.removedReason ? (
          <p className="mt-2 rounded-lg bg-surface px-3 py-2 text-xs text-muted">
            <b className="text-foreground"><T k="feed.card.removedTitle" /></b>{" "}
            <TWith k="feed.card.removedBody" inner={{ reason: REMOVAL_REASONS[post.removedReason] ?? "feed.removal.other" }} />
          </p>
        ) : (
        <>
        <footer className="mt-2 flex items-center gap-6">
          {!post.parentId &&
            (showReplyLink ? (
              <TLink href={`/post/${post.id}`} className="-m-2.5 flex items-center gap-1 p-2.5 text-sm text-muted hover:text-foreground" labelKey="feed.card.replies">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current" strokeWidth={2}>
                  <path d="M4 5h16v11H8l-4 4z" />
                </svg>
                {post.replyCount > 0 ? post.replyCount : ""}
              </TLink>
            ) : (
              <span className="text-sm text-muted"><T k="feed.card.replyCount" values={{ n: post.replyCount }} /></span>
            ))}
          {!post.parentId && (
            <RepostButton postId={post.id} reposted={post.repostedByMe} count={post.repostCount} signedIn={!!viewerId} game={post.game} />
          )}
          <LikeButton postId={post.id} liked={post.likedByMe} count={post.likeCount} signedIn={!!viewerId} />
          <TShareButton path={`/post/${post.parentId ?? post.id}`} title={post.title ?? `${post.author.tag} on Smashy`} labelKey="feed.card.share" />
        </footer>
        <ReactionBar postId={post.id} reactions={post.reactions} signedIn={!!viewerId} />
        </>
        )}
      </div>
      </div>
    </article>
  );
}

/** A Reels clip quoted in a post: its still, title and channel, opening the clip's page. */
function ReelQuoteCard({ reel }: { reel: NonNullable<Post["quoteReel"]> }) {
  if (reel === "unavailable") {
    return <div className="mt-2 rounded-xl border border-line px-3 py-2 text-sm text-muted"><T k="feed.card.clipUnavailable" /></div>;
  }
  return (
    <Link href={`/reels/${encodeURIComponent(reel.clipId)}`} className="mt-2 flex items-center gap-3 overflow-hidden rounded-xl border border-line hover:bg-surface">
      <span className="relative aspect-video w-32 shrink-0 bg-black">
        {reel.thumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={reel.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
        )}
        <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-xl text-white drop-shadow">▶</span>
      </span>
      <span className="min-w-0 py-2 pr-3">
        <span className="block text-meta text-muted"><T k="feed.card.clipFrom" values={{ channel: reel.channelName ?? "Twitch" }} /></span>
        <span className="line-clamp-2 font-semibold">{reel.title || <T k="feed.card.untitledClip" />}</span>
      </span>
    </Link>
  );
}

/** A bracket set quoted in a post: both players, the score, and where it happened. */
function SetQuoteCard({ set }: { set: NonNullable<Post["quoteSet"]> }) {
  const row = (p: { name: string | null; score: number | null }, other: { score: number | null }, won: boolean) => (
    <div className="flex items-center justify-between gap-2">
      <span className={`truncate ${won ? "font-bold" : "text-muted"}`}>{p.name ?? <T k="event.tbd" />}</span>
      <span className={`font-mono tabular-nums ${won ? "font-bold" : "text-muted"}`}>{scoreText(p.score, other.score)}</span>
    </div>
  );
  return (
    <Link href={`/sets/${set.source}/${encodeURIComponent(set.externalId)}`} className="mt-2 block overflow-hidden rounded-xl border border-line hover:bg-surface">
      <div className="border-b border-line bg-surface px-3 py-1 text-meta text-muted">
        <span className="font-semibold text-foreground">{set.roundLabel ?? "Set"}</span>
        {[set.eventName, set.tournamentName].filter(Boolean).map((t) => ` · ${t}`).join("")}
      </div>
      <div className="flex flex-col gap-0.5 px-3 py-2 text-body">
        {row(set.p1, set.p2, set.winner === 1)}
        {row(set.p2, set.p1, set.winner === 2)}
      </div>
    </Link>
  );
}

/** The embedded card inside a quote post. */
function QuoteCard({ quote, now }: { quote: NonNullable<Post["quote"]>; now: number }) {
  if (quote === "unavailable") {
    return <p className="mt-2 rounded-xl border border-line px-3 py-2 text-sm text-muted"><T k="feed.card.postUnavailable" /></p>;
  }
  return (
    <Link href={`/post/${quote.id}`} className="mt-2 flex gap-3 rounded-xl border border-line px-3 py-2 hover:bg-surface">
      <span className="min-w-0 flex-1">
        <span className="block text-sm">
          <b>{quote.author.tag}</b> <span className="text-muted">@{quote.author.handle} · <TimeAgo at={quote.createdAt} serverNow={now} /></span>
        </span>
        {/* A quoted spoiler stays hidden (open the post to read it); ||hidden bits|| are blacked out. */}
        {quote.spoiler ? (
          <span className="block text-sm text-muted"><T k="feed.card.spoilerQuote" /></span>
        ) : (
          <>
            {quote.title && <span className="block text-sm font-bold">{hideInlineSpoilers(quote.title)}</span>}
            <span className="line-clamp-4 block whitespace-pre-wrap break-words text-sm">{hideInlineSpoilers(quote.body)}</span>
          </>
        )}
      </span>
      {quote.image && !quote.spoiler && (
        <span className="relative h-16 w-16 shrink-0 self-center overflow-hidden rounded-lg bg-surface">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={quote.image.url} alt={quote.image.alt} loading="lazy" className="h-full w-full object-cover" />
          {quote.imageCount > 1 && (
            <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[10px] font-semibold text-white">+{quote.imageCount - 1}</span>
          )}
        </span>
      )}
      {!quote.image && quote.videoPoster && !quote.spoiler && (
        <span className="relative h-16 w-16 shrink-0 self-center overflow-hidden rounded-lg bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={quote.videoPoster} alt="" loading="lazy" className="h-full w-full object-cover" />
          <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-xl text-white drop-shadow">▶</span>
          <span className="sr-only"><T k="feed.video.button" /></span>
        </span>
      )}
    </Link>
  );
}

/** A thread title on its own page: ||hidden bits|| can be tapped to show, like in the text. */
function LinkifiedTitle({ title }: { title: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of title.matchAll(INLINE_SPOILER)) {
    if (m.index! > last) parts.push(title.slice(last, m.index!));
    parts.push(<InlineSpoiler key={m.index}>{m[1]}</InlineSpoiler>);
    last = m.index! + m[0].length;
  }
  if (last < title.length) parts.push(title.slice(last));
  return <>{parts}</>;
}
