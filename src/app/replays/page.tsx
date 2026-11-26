// Slippi replay stats: drop in your replays and see your own numbers. Read in the browser; a signed-in
// member can save the summary to their profile (never the replays themselves).
import type { Metadata } from "next";
import { Suspense } from "react";
import ReplayStats from "@/components/slippi/ReplayStats";
import { pageMeta } from "@/lib/siteMeta";
import { createClient, getUserId } from "@/lib/supabase/server";
import { T } from "@/lib/i18n/client";

export const metadata: Metadata = pageMeta("Replay stats", "Drop in your Slippi replays and see your Melee numbers: openings per kill, damage per opening, neutral wins and more.");

/** The reader, knowing who's signed in and what they've saved. */
async function WithAccount() {
  const userId = await getUserId();
  if (!userId) return <ReplayStats />;
  const supabase = await createClient();
  const [{ data: row }, { data: profile }] = await Promise.all([
    supabase.from("replay_stats").select("games, shown").eq("user_id", userId).maybeSingle(),
    supabase.from("profiles").select("handle").eq("id", userId).maybeSingle(),
  ]);
  return <ReplayStats signedIn saved={row ? { games: row.games as number, shown: !!row.shown } : null} handle={(profile?.handle as string | undefined) ?? null} />;
}

export default function ReplaysPage() {
  return (
    <article className="flex flex-col gap-4 p-4">
      <header>
        <h1 className="text-2xl font-bold"><T k="play.replays.title" /></h1>
        <p className="text-sm text-muted"><T k="play.replays.subtitle" /></p>
      </header>
      <Suspense fallback={<ReplayStats />}>
        <WithAccount />
      </Suspense>
    </article>
  );
}
