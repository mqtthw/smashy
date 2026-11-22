import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import PostCard from "@/components/feed/PostCard";
import { unixNow } from "@/lib/format";
import { getHashtagPosts } from "@/lib/posts";
import { getUserId } from "@/lib/supabase/server";
import { FeedSkeleton } from "@/components/ui/Skeleton";
import { LangProvider, T } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";

const TAG_RE = /^[a-z][a-z0-9_]{1,40}$/;

export async function generateMetadata({ params }: PageProps<"/tags/[tag]">): Promise<Metadata> {
  const { tag } = await params;
  return { title: `#${decodeURIComponent(tag)}` };
}

async function TagPosts({ params }: Pick<PageProps<"/tags/[tag]">, "params">) {
  const tag = decodeURIComponent((await params).tag).toLowerCase();
  if (!TAG_RE.test(tag)) notFound();
  const userId = await getUserId();
  const [posts, t, lang] = await Promise.all([getHashtagPosts(tag, userId), getT(), getLang()]);
  const now = unixNow();
  return (
    <LangProvider lang={lang}>
      <h1 className="px-4 pt-2 text-2xl font-bold">#{tag}</h1>
      {posts.length === 0 ? (
        <p className="p-4 text-muted">{t("feed.tags.empty", { tag })}</p>
      ) : (
        <div className="divide-y divide-line">
          {posts.map((p) => <PostCard key={p.id} post={p} now={now} viewerId={userId} />)}
        </div>
      )}
    </LangProvider>
  );
}

export default function TagPage(props: PageProps<"/tags/[tag]">) {
  return (
    <section className="flex flex-col gap-2 py-4">
      <Link href="/search" className="px-4 text-sm text-muted hover:text-foreground"><T k="feed.tags.back" /></Link>
      <Suspense fallback={<FeedSkeleton />}>
        <TagPosts params={props.params} />
      </Suspense>
    </section>
  );
}
