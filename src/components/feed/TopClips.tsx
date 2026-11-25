import ClipStrip from "@/components/feed/ClipStrip";
import type { GameKey } from "@/lib/games";
import { getTopClips } from "@/lib/reels";

/**
 * The top clips as a sideways row (the guest home's, round 837 shared it): also under the signed-out
 * Play and Profile pages, which ended in half a screen of empty space. `game` keeps to one game (Play's
 * game tab) when it has at least three top clips, else every game shows. Nothing when there are none or
 * loading fails.
 */
export default async function TopClips({ headingId, game, bleed = false, as = "h2" }: { headingId: string; game?: GameKey; bleed?: boolean; as?: "h2" | "h3" }) {
  const clips = await getTopClips({ myGames: [], limit: game ? 24 : 8 }).catch(() => null);
  if (!clips) return null;
  const mine = game ? clips.filter((c) => c.game === game) : [];
  return <ClipStrip reels={(mine.length >= 3 ? mine : clips).slice(0, 8)} headingId={headingId} bleed={bleed} as={as} />;
}
