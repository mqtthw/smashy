import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import AdminTabs from "@/components/admin/AdminTabs";
import GameBadge from "@/components/GameBadge";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { CLIPS_OF_WEEK_DAYS } from "@/lib/clipsOfWeek";
import { playerLinks, tweetLinks, withoutLinks } from "@/lib/embeds";
import { getClipsOfWeek, type Post } from "@/lib/posts";
import { videoLength } from "@/lib/postVideoLinks";
import { isSiteAdmin } from "@/lib/scenes";
import { getUserId } from "@/lib/supabase/server";
import DownloadAll from "./DownloadAll";

export const metadata: Metadata = { title: "Top clips admin", robots: { index: false } };

const TOP = 10;

/** Where a clip post's video lives: Smashy's own files (downloadable here) or another site (a link). */
function sources(p: Post, rank: number) {
  const uploads = p.media.flatMap((m) => (m.kind === "video" ? [m.video] : [])).map((v, i, all) => {
    const name = `smashy-clip-${rank}-${p.author.handle}${all.length > 1 ? `-${i + 1}` : ""}.mp4`;
    // Supabase's storage sends the file as a download when asked with ?download=<name>.
    return { href: `${v.url}?download=${encodeURIComponent(name)}`, name, length: videoLength(v.durationMs) };
  });
  const links = [
    ...playerLinks(p.body, 3).map((e) => ({ site: e.provider as string, href: e.href })),
    ...tweetLinks(p.body, 2).map((t) => ({ site: "X", href: t.href })),
  ];
  return { uploads, links };
}

async function ClipsAdmin() {
  const userId = await getUserId();
  if (!(await isSiteAdmin(userId))) notFound();
  const posts = await getClipsOfWeek(undefined, userId, { limit: TOP, perAuthor: 2 });
  const rows = posts.map((p, i) => ({ post: p, rank: i + 1, ...sources(p, i + 1) }));
  const files = rows.flatMap((r) => r.uploads);

  return (
    <div className="flex flex-col gap-6">
      <AdminTabs active="clips" />

      <section className="flex flex-col gap-2 text-sm">
        <p className="text-muted">
          The {TOP} most liked clips players posted in the last {CLIPS_OF_WEEK_DAYS} days (likes plus reactions, two per player at most), for
          putting together a weekly highlight. The Feed&apos;s &quot;Clips of the week&quot; card shows the top 3 of the same list, one per player.
          Teens&apos; posts are never on it. The list updates about every 10 minutes.
        </p>
        <p className="text-meta text-muted">
          Videos uploaded to Smashy can be downloaded here. Clips that are YouTube, Twitch, Streamable or X links stay on those sites:
          open the link and ask the player for the file, or share the link itself. Ask a player before using their clip in a video.
        </p>
        <DownloadAll files={files.map(({ href, name }) => ({ href, name }))} />
      </section>

      {rows.length === 0 ? (
        <p className="card p-4 text-sm text-muted">No clip got a like in the last {CLIPS_OF_WEEK_DAYS} days.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {rows.map(({ post: p, rank, uploads, links }) => (
            <li key={p.id} className="card flex flex-col gap-2 p-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-5 shrink-0 text-center font-bold text-muted">{rank}</span>
                <Link href={`/u/${p.author.handle}`} className="min-w-0 truncate font-semibold hover:underline">{p.author.tag} <span className="font-normal text-muted">@{p.author.handle}</span></Link>
                {p.game !== "general" && <GameBadge game={p.game} />}
                <span className="ml-auto shrink-0 font-semibold">♥ {p.likeCount + p.reactions.reduce((n, r) => n + r.count, 0)}</span>
              </div>
              <p className="line-clamp-2 pl-7 text-muted">{withoutLinks(p.body) || "(no words)"}</p>
              <div className="flex flex-wrap items-center gap-2 pl-7">
                <Link href={`/post/${p.id}`} className="btn btn-sm btn-ghost">Open post</Link>
                {uploads.map((u) => (
                  <a key={u.href} href={u.href} download={u.name} className="btn btn-sm btn-primary">Download ({u.length})</a>
                ))}
                {links.map((l) => (
                  <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost">On {l.site} ↗</a>
                ))}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function AdminClipsPage() {
  return (
    <section className="flex flex-col gap-4 p-4">
      <header className="pt-2">
        <Link href="/profile" className="text-sm text-muted hover:text-foreground">← Profile</Link>
        <h1 className="mt-2 text-2xl font-bold">Site admin</h1>
      </header>
      <Suspense fallback={<CardListSkeleton />}>
        <ClipsAdmin />
      </Suspense>
    </section>
  );
}
