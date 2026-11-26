import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signInPath } from "@/lib/returnTo";
import { Suspense } from "react";
import PostCard from "@/components/feed/PostCard";
import { unixNow } from "@/lib/format";
import { getSavedPosts } from "@/lib/posts";
import { createClient, getUserId } from "@/lib/supabase/server";
import { FeedSkeleton } from "@/components/ui/Skeleton";
import Icon from "@/components/ui/Icon";
import { LangProvider, T } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("ui.title.saved"), robots: { index: false } };
}

async function Saved() {
  const userId = await getUserId();
  if (!userId) redirect(signInPath("/saved"));
  const supabase = await createClient();
  const [posts, { data: clipRows }, t, lang] = await Promise.all([
    getSavedPosts(userId),
    supabase
      .from("saved_clips")
      .select("clip_id, reel:reels ( title, channel_name, thumbnail_url )")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(60),
    getT(),
    getLang(),
  ]);
  const clips = ((clipRows ?? []) as unknown as { clip_id: string; reel: { title: string; channel_name: string | null; thumbnail_url: string | null } | null }[]).filter((c) => c.reel);
  const now = unixNow();
  if (!posts.length && !clips.length) {
    return <p className="p-6 text-muted">{t("feed.saved.empty")}</p>;
  }
  return (
    <LangProvider lang={lang}>
      {clips.length > 0 && (
        <section aria-labelledby="saved-clips" className="border-b border-line p-4">
          <h2 id="saved-clips" className="mb-2 text-meta font-semibold uppercase tracking-wide text-muted">{t("feed.saved.clips")}</h2>
          <ul className="flex gap-3 overflow-x-auto pb-1">
            {clips.map((c) => (
              <li key={c.clip_id} className="w-36 shrink-0">
                <Link href={`/reels/${encodeURIComponent(c.clip_id)}`} className="flex flex-col gap-1 hover:opacity-90">
                  {c.reel!.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.reel!.thumbnail_url} alt="" loading="lazy" className="aspect-video w-full rounded-lg bg-surface object-cover" />
                  ) : (
                    <span className="flex aspect-video w-full items-center justify-center rounded-lg bg-surface text-2xl" aria-hidden="true"><Icon name="play" /></span>
                  )}
                  <span className="line-clamp-2 text-sm font-semibold">{c.reel!.title || t("feed.clips.clip")}</span>
                  {c.reel!.channel_name && <span className="truncate text-meta text-muted">{c.reel!.channel_name}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {posts.length > 0 && <div className="flex flex-col divide-y divide-line">{posts.map((p) => <div key={p.id}><PostCard post={p} now={now} viewerId={userId} /></div>)}</div>}
    </LangProvider>
  );
}

export default function SavedPage() {
  return (
    <section className="flex flex-col">
      <header className="flex flex-col gap-1 border-b border-line p-4">
        <Link href="/profile" className="text-meta text-muted hover:text-foreground"><T k="feed.saved.back" /></Link>
        <h1 className="text-2xl font-bold"><T k="feed.saved.title" /></h1>
        <p className="text-sm text-muted"><T k="feed.saved.intro" /></p>
      </header>
      <Suspense fallback={<FeedSkeleton />}>
        <Saved />
      </Suspense>
    </section>
  );
}
