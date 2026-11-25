import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { decideScene, decideSceneAdmin } from "@/app/scenes/actions";
import AdminTabs from "@/components/admin/AdminTabs";
import { getPendingSceneEmojis } from "@/lib/sceneSocial";
import { reviewClip, reviewSceneEmoji } from "./actions";
import { GAMES, GAME_KEYS } from "@/lib/games";
import { clipUrl, platformName } from "@/lib/reelLinks";
import { getPendingSubmissions } from "@/lib/reelSubmissions";
import { countOpenReports, getSiteStats } from "@/lib/moderation";
import { getPendingRequests, isSiteAdmin } from "@/lib/scenes";
import { getUserId } from "@/lib/supabase/server";
import { CardListSkeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

async function Queue() {
  const userId = await getUserId();
  if (!(await isSiteAdmin(userId))) notFound(); // pretend the page doesn't exist for everyone else
  const [{ scenes, adminRequests }, openReports, emojis, clips, stats] = await Promise.all([
    getPendingRequests(),
    countOpenReports(),
    getPendingSceneEmojis(),
    getPendingSubmissions(),
    getSiteStats(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <AdminTabs active="approvals" openReports={openReports} />
      <section aria-label="Overview" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {[
          ["Accounts", stats.accounts],
          ["New this week", stats.newAccounts],
          ["Posts (24 h)", stats.postsToday],
          ["Messages (24 h)", stats.messagesToday],
          ["Open reports", stats.openReports],
          ["Clips waiting", stats.clipsWaiting],
        ].map(([label, n]) => (
          <div key={label} className="card p-3">
            <p className="text-2xl font-bold">{Number(n).toLocaleString("en-US")}</p>
            <p className="text-meta text-muted">{label}</p>
          </div>
        ))}
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="font-bold">Shared clips for Reels ({clips.length})</h2>
        {clips.length === 0 && <p className="text-sm text-muted">Nothing waiting.</p>}
        {clips.length > 0 && <p className="text-meta text-muted">Watch each one first: approved clips show to everyone, including teens. Fix the game if it&apos;s wrong.</p>}
        {clips.map((c) => (
          <div key={c.id} className="card flex flex-wrap items-center gap-3 p-3 text-sm">
            {c.thumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.thumbnailUrl} alt="" className="h-14 w-24 shrink-0 rounded-md object-cover" loading="lazy" />
            )}
            <div className="min-w-0 flex-1 basis-48">
              <a href={clipUrl(c)} target="_blank" rel="noopener noreferrer" className="block truncate font-semibold hover:underline">
                {c.title || "Untitled clip"} ↗︎
              </a>
              <p className="text-muted">
                {platformName(c.platform)} · {c.channelName} · {c.views.toLocaleString("en-US")} views · shared by{" "}
                {c.submitter ? <Link href={`/u/${c.submitter.handle}`} className="hover:underline">{c.submitter.tag}</Link> : "someone"}
              </p>
              {c.titleFlagged && <p className="text-meta text-danger">The title was hidden by the word filter. Check the clip carefully.</p>}
            </div>
            <form action={reviewClip.bind(null, c.id, true)} className="flex items-center gap-1">
              <label htmlFor={`clip-game-${c.id}`} className="sr-only">Game</label>
              <select id={`clip-game-${c.id}`} name="game" defaultValue={c.game} className="field py-1 text-sm">
                {GAME_KEYS.map((g) => <option key={g} value={g}>{GAMES[g].short}</option>)}
              </select>
              <button className="btn btn-sm btn-primary">Approve</button>
            </form>
            <form action={reviewClip.bind(null, c.id, false)}>
              <button className="btn btn-sm btn-danger">Reject</button>
            </form>
          </div>
        ))}
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="font-bold">Scene emojis ({emojis.length})</h2>
        {emojis.length === 0 && <p className="text-sm text-muted">Nothing waiting.</p>}
        {emojis.map((e) => (
          <div key={e.id} className="card flex items-center gap-3 p-3 text-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={e.url} alt={`:${e.name}:`} width={48} height={48} className="shrink-0 rounded-md bg-surface object-contain" />
            <div className="min-w-0 flex-1">
              <p className="font-mono font-semibold">:{e.name}:</p>
              <p className="text-muted">
                {e.scene ? <Link href={`/scenes/${e.scene.slug}`} className="hover:underline">{e.scene.name}</Link> : "Unknown scene"} · from {e.uploader}
              </p>
              <p className="text-meta text-muted">Check it&apos;s appropriate for teens and isn&apos;t official Nintendo art.</p>
            </div>
            <form action={reviewSceneEmoji.bind(null, e.id, true)}>
              <button className="btn btn-sm btn-primary">Approve</button>
            </form>
            <form action={reviewSceneEmoji.bind(null, e.id, false)}>
              <button className="btn btn-sm btn-danger">Reject</button>
            </form>
          </div>
        ))}
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="font-bold">Scene requests ({scenes.length})</h2>
        {scenes.length === 0 && <p className="text-sm text-muted">Nothing waiting.</p>}
        {scenes.map((s) => (
          <div key={s.id} className="card p-4 text-sm">
            <p className="font-bold">{s.name}</p>
            <p className="text-muted">
              {s.cities.join(", ")} · {s.games.join(", ")} · requested by <b>{s.requester}</b>
            </p>
            {s.description && <p className="mt-1 whitespace-pre-wrap">{s.description}</p>}
            <div className="mt-3 flex gap-2">
              <form action={decideScene.bind(null, s.id, true)}>
                <button className="btn btn-sm btn-inverse">Approve</button>
              </form>
              <form action={decideScene.bind(null, s.id, false)}>
                <button className="rounded-full border border-line px-3 py-1">Reject</button>
              </form>
            </div>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">Admin requests ({adminRequests.length})</h2>
        {adminRequests.length === 0 && <p className="text-sm text-muted">Nothing waiting.</p>}
        {adminRequests.map((r) => (
          <div key={`${r.sceneId}-${r.userId}`} className="card p-4 text-sm">
            <p>
              <b>{r.tag}</b> wants to help run <b>{r.sceneName}</b>
            </p>
            {r.message && <p className="mt-1 text-muted">&ldquo;{r.message}&rdquo;</p>}
            <div className="mt-3 flex gap-2">
              <form action={decideSceneAdmin.bind(null, r.sceneId, r.userId, true)}>
                <button className="btn btn-sm btn-inverse">Approve</button>
              </form>
              <form action={decideSceneAdmin.bind(null, r.sceneId, r.userId, false)}>
                <button className="rounded-full border border-line px-3 py-1">Reject</button>
              </form>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

export default function AdminPage() {
  return (
    <section className="flex flex-col gap-4 p-4">
      <header className="pt-2">
        <Link href="/profile" className="text-sm text-muted hover:text-foreground">← Profile</Link>
        <h1 className="mt-2 text-2xl font-bold">Site admin</h1>
      </header>
      <Suspense fallback={<CardListSkeleton />}>
        <Queue />
      </Suspense>
    </section>
  );
}
