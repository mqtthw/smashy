import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import PostCard from "@/components/feed/PostCard";
import PostComposer from "@/components/feed/PostComposer";
import { unixNow } from "@/lib/format";
import { getPostWithReplies } from "@/lib/posts";
import { buildReplyTree, REPLY_SORTS, type ReplySort } from "@/lib/threadRank";
import ReplyTree from "@/components/discuss/ReplyTree";
import { clip, isUuid, ownPictureMeta } from "@/lib/siteMeta";
import { hideInlineSpoilers } from "@/lib/spoilerText";
import { createGuestClient, hasSupabase } from "@/lib/supabase/guest";
import { getUserId } from "@/lib/supabase/server";
import { FeedSkeleton } from "@/components/ui/Skeleton";
import { LangProvider } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";
import { signInPath } from "@/lib/returnTo";
import { getClipPreview, twitchClipIdIn, withoutLinks } from "@/lib/postPreview";
import { postVideoUrl } from "@/lib/postVideoLinks";

// Read as a guest (like the link preview), so a teen's post never puts their words in a page title
// that a crawler or a shared link could pick up.
export async function generateMetadata({ params }: PageProps<"/post/[id]">): Promise<Metadata> {
  const { id } = await params;
  if (!isUuid(id) || !hasSupabase()) return { title: "Post" };
  const { data } = await createGuestClient()
    .from("posts")
    .select("title, body, spoiler, game, author:profiles!posts_author_id_fkey ( tag ), videos:post_videos ( path, width, height, position )")
    .eq("id", id)
    .is("removed_at", null)
    .maybeSingle();
  const row = data as { title: string | null; body: string; spoiler: boolean; game: string; author: { tag: string } | null; videos?: { path: string; width: number; height: number; position?: number }[] } | null;
  if (!row?.author) return { title: "Post" };
  if (!row.spoiler) {
    // A video uploaded to Smashy (round 459): Discord and others play the file right in the chat.
    const video = [...(row.videos ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0];
    // A Twitch clip link: the clip's own title and channel instead of the raw link.
    const clipId = !row.title ? twitchClipIdIn(hideInlineSpoilers(row.body)) : null;
    const preview = clipId ? await getClipPreview(clipId) : null;
    const words = withoutLinks(hideInlineSpoilers(row.body));
    const meta = preview
      ? ownPictureMeta(clip(`${preview.title} · ${preview.channel}`, 90), clip(words ? `${row.author.tag}: ${words}` : `Twitch clip shared by ${row.author.tag} on Smashy`, 200))
      : row.title
        ? ownPictureMeta(hideInlineSpoilers(row.title), clip(hideInlineSpoilers(row.body), 200))
        : ownPictureMeta(`${row.author.tag}: “${clip(words || hideInlineSpoilers(row.body), 60)}”`, clip(hideInlineSpoilers(row.body), 200));
    if (video) {
      const url = postVideoUrl(video.path);
      meta.openGraph = { ...meta.openGraph, type: "video.other", videos: [{ url, secureUrl: url, type: "video/mp4", width: video.width, height: video.height }] };
    }
    return { ...meta, alternates: { canonical: `/post/${id}` } };
  }
  // Spoilers never go in page titles or previews (no video either); ||hidden bits|| above are blacked out.
  const meta = ownPictureMeta(row.title ? `Spoiler thread by ${row.author.tag}` : `Spoiler post by ${row.author.tag}`, "Contains spoilers. Tap to read on Smashy.");
  return { ...meta, alternates: { canonical: `/post/${id}` } };
}

async function Thread({ params, searchParams }: PageProps<"/post/[id]">) {
  const { id } = await params;
  const { sort: sortParam } = await searchParams;
  const userId = await getUserId();
  const [thread, t, lang] = await Promise.all([getPostWithReplies(id, userId), getT(), getLang()]);
  if (!thread) notFound();
  const now = unixNow();
  // Threads open on the best replies; ordinary posts read top to bottom, oldest first.
  const sort: ReplySort = REPLY_SORTS.includes(sortParam as ReplySort) ? (sortParam as ReplySort) : thread.post.title ? "best" : "old";
  const tree = buildReplyTree(thread.replies, sort);
  const p = thread.post;

  return (
    <LangProvider lang={lang}>
      <Link href={p.title ? (p.game === "general" ? "/discuss" : `/discuss?game=${p.game}`) : "/"} className="block px-4 pt-4 pb-2 text-sm text-muted hover:text-foreground">
        {p.title ? t("feed.post.backDiscussions") : t("feed.post.backFeed")}
      </Link>
      {p.title && !p.removedReason && !p.spoiler && (
        // Lets search engines show the thread as a discussion (title, author, reply count).
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "DiscussionForumPosting",
              headline: hideInlineSpoilers(p.title),
              text: p.body.slice(0, 1000),
              datePublished: p.createdAt,
              author: { "@type": "Person", name: p.author.tag, url: `/u/${p.author.handle}` },
              interactionStatistic: [
                { "@type": "InteractionCounter", interactionType: "https://schema.org/CommentAction", userInteractionCount: p.replyCount },
                { "@type": "InteractionCounter", interactionType: "https://schema.org/LikeAction", userInteractionCount: p.likeCount },
              ],
            }).replace(/</g, "\\u003c"),
          }}
        />
      )}
      {!p.title && <h1 className="sr-only">{t("feed.post.by", { name: p.author.tag })}</h1>}
      {/* The post itself is a glass card like the feed's (round 506). */}
      <div className="card mx-3 mt-3">
        <PostCard post={p} now={now} viewerId={userId} showReplyLink={false} afterDelete={p.title ? "/discuss" : "/"} full />
      </div>
      {userId ? (
        <PostComposer parentId={thread.post.id} placeholder={t("feed.post.replyTo", { name: thread.post.author.tag })} />
      ) : (
        <div className="border-b border-line px-4 py-3 text-sm text-muted">
          <Link href={signInPath(`/post/${id}`)} className="text-brand">{t("signin.pageTitle")}</Link> {t("feed.post.toReply")}
        </div>
      )}
      {thread.replies.length > 1 && (
        <nav aria-label={t("feed.post.sortLabel")} className="flex items-center gap-2 border-b border-line px-4 py-2 text-sm">
          <span className="text-muted">{t("feed.post.sort")}</span>
          {REPLY_SORTS.map((s) => (
            <Link key={s} href={`/post/${p.id}?sort=${s}`} scroll={false} aria-current={s === sort ? "page" : undefined} className="chip">
              {t(`feed.sort.${s}`)}
            </Link>
          ))}
        </nav>
      )}
      <ReplyTree nodes={tree} threadId={p.id} now={now} viewerId={userId} />
      {!userId && <p className="p-4 text-center text-xs text-muted">{t("feed.post.repliesSignedIn")}</p>}
    </LangProvider>
  );
}

export default function PostPage(props: PageProps<"/post/[id]">) {
  return (
    <section>
      <Suspense fallback={<FeedSkeleton count={3} label="Loading post…" />}>
        <Thread params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
