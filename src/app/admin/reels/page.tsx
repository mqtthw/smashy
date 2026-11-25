import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import AdminTabs from "@/components/admin/AdminTabs";
import GameBadge from "@/components/GameBadge";
import { GAMES, GAME_KEYS } from "@/lib/games";
import { channelUrl, clipUrl, platformName } from "@/lib/reelLinks";
import { getReelChannels, getReelsForAdmin, getReelsFreshness } from "@/lib/reels";
import LocalTime from "@/components/ui/LocalTime";
import { isSiteAdmin } from "@/lib/scenes";
import { getUserId } from "@/lib/supabase/server";
import { hasYouTubeKey } from "@/lib/youtube";
import { approveChannel, refreshReelsNow, setChannelGame, toggleChannelBlocked, toggleReelHidden } from "../actions";
import AddChannelForm from "./AddChannelForm";
import AddYouTubeForm from "./AddYouTubeForm";
import { CardListSkeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = { title: "Reels admin", robots: { index: false } };

async function ReelsAdmin() {
  if (!(await isSiteAdmin(await getUserId()))) notFound();
  const [channels, reels, freshness] = await Promise.all([getReelChannels(), getReelsForAdmin(), getReelsFreshness()]);
  const suggested = channels.filter((c) => !c.approved && !c.blocked);
  const listed = channels.filter((c) => c.approved || c.blocked);

  return (
    <div className="flex flex-col gap-6">
      <AdminTabs active="reels" />

      <section className="flex flex-col gap-2 text-sm">
        <p className="text-muted">
          Reels only uses clips from approved channels: Twitch clips and YouTube Shorts. Twitch channels
          that stream majors are suggested automatically; approve them to add their clips, or block them.
          YouTube channels are added by hand. Clips refresh about every hour while people use Reels (and once a day regardless).
          Older clips stay for 30 days; new ones are added on top.
        </p>
        <AddChannelForm />
        <AddYouTubeForm ready={hasYouTubeKey()} />
        <p className="text-meta text-muted">
          YouTube doesn&apos;t say which game a Short is: Smashy reads the title (&quot;melee&quot;, &quot;ssbu&quot;, &quot;p+&quot;…) and tags,
          then falls back to the channel&apos;s usual game. Shorts it can&apos;t place are left out.
        </p>
        <p className="text-meta">
          <b>Fresh clips:</b> {freshness.lastDay} from the last day · {freshness.lastWeek} from the last week
          {freshness.lastRefresh && <> · last collected <LocalTime iso={freshness.lastRefresh} style="dateTime" /></>}
        </p>
        <form action={refreshReelsNow}>
          <button className="btn btn-sm btn-ghost">Collect clips now</button>
        </form>
      </section>

      {suggested.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-bold">Suggested channels ({suggested.length})</h2>
          <p className="text-meta text-muted">These streamed a major. Check the channel before approving: its clips will show to everyone, including teens.</p>
          <ul className="flex flex-col gap-2">
            {suggested.map((c) => (
              <li key={c.login} className="card flex items-center gap-3 p-3 text-sm">
                <a href={channelUrl(c)} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate font-semibold hover:underline">
                  {c.displayName ?? c.login} ↗︎
                </a>
                <form action={approveChannel.bind(null, c.login)}>
                  <button className="btn btn-sm btn-primary">Approve</button>
                </form>
                <form action={toggleChannelBlocked.bind(null, c.login, true)}>
                  <button className="btn btn-sm btn-danger">Block</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">Channels ({listed.length})</h2>
        <ul className="flex flex-col gap-2">
          {listed.map((c) => (
            <li key={c.login} className={`card flex items-center gap-3 p-3 text-sm ${c.blocked ? "opacity-60" : ""}`}>
              <div className="min-w-0 flex-1">
                <a href={channelUrl(c)} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">
                  {c.displayName ?? c.login}
                </a>
                <p className="text-meta text-muted">
                  {platformName(c.platform)} · {c.source === "auto" ? "Suggested from a major's stream" : c.source === "top" ? "Had a top Smash clip on Twitch this week" : c.source === "submitted" ? "From a clip someone shared" : "Added by an admin"}
                  {c.platform === "twitch" && !c.twitchId && !c.blocked ? " · not found on Twitch yet" : ""}
                  {c.blocked ? " · Blocked" : ""}
                </p>
              </div>
              {c.platform === "youtube" && !c.blocked && (
                <form action={setChannelGame.bind(null, c.login)} className="flex items-center gap-1">
                  <label htmlFor={`game-${c.login}`} className="sr-only">Usual game for {c.displayName ?? c.login}</label>
                  <select id={`game-${c.login}`} name="game" defaultValue={c.defaultGame ?? ""} className="field py-1 text-sm">
                    <option value="">Game: from titles</option>
                    {GAME_KEYS.map((g) => (
                      <option key={g} value={g}>Mostly {GAMES[g].short}</option>
                    ))}
                  </select>
                  <button className="btn btn-sm btn-ghost">Save</button>
                </form>
              )}
              <form action={toggleChannelBlocked.bind(null, c.login, !c.blocked)}>
                <button className={`btn btn-sm ${c.blocked ? "btn-outline" : "btn-danger"}`}>{c.blocked ? "Unblock" : "Block"}</button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">Recent clips ({reels.length})</h2>
        {reels.length === 0 && <p className="text-sm text-muted">No clips yet.</p>}
        <ul className="flex flex-col gap-2">
          {reels.map((r) => (
            <li key={r.clipId} className={`card flex items-center gap-3 p-2 text-sm ${r.hidden ? "opacity-60" : ""}`}>
              {r.thumbnailUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.thumbnailUrl} alt="" className="h-12 w-20 shrink-0 rounded-md object-cover" loading="lazy" />
              )}
              <div className="min-w-0 flex-1">
                <a href={clipUrl(r)} target="_blank" rel="noopener noreferrer" className="block truncate font-semibold hover:underline">
                  {r.title || "Untitled clip"}
                </a>
                <p className="flex items-center gap-1.5 text-meta text-muted">
                  <GameBadge game={r.game} /> {platformName(r.platform)} · {r.channelName ?? r.channelLogin} · {r.views} views{r.hidden ? " · Hidden" : ""}{r.titleFlagged ? " · Title hidden by the filter (check the clip)" : ""}
                </p>
              </div>
              <form action={toggleReelHidden.bind(null, r.clipId, !r.hidden)}>
                <button className={`btn btn-sm ${r.hidden ? "btn-outline" : "btn-danger"}`}>{r.hidden ? "Show" : "Hide"}</button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default function AdminReelsPage() {
  return (
    <section className="flex flex-col gap-4 p-4">
      <header className="pt-2">
        <Link href="/profile" className="text-sm text-muted hover:text-foreground">← Profile</Link>
        <h1 className="mt-2 text-2xl font-bold">Site admin</h1>
      </header>
      <Suspense fallback={<CardListSkeleton />}>
        <ReelsAdmin />
      </Suspense>
    </section>
  );
}
