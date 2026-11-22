import Link from "next/link";
import { isLadderGame } from "@/lib/ladder";
import type { GameKey } from "@/lib/games";
import { T } from "@/lib/i18n/client";

/**
 * Play's link to Smashy's own ranked ladder: one slim line (round 505). It used to be a "Ranked online"
 * panel with the community's ladders (Slippi Ranked and others), a new-players line and a replays line;
 * Matthew found it unnecessary, so only the ladder link stays. Nothing for games without a ladder.
 */
export default function OnlineLadders({ game }: { game?: GameKey }) {
  if (game && !isLadderGame(game)) return null;
  return (
    <p className="mx-4 mt-3 text-sm">
      <Link href={isLadderGame(game) ? `/ladder?game=${game}` : "/ladder"} className="link font-semibold">
        <T k="play.ranked.smashyLadder" />
      </Link>
      <span className="text-muted"><T k="play.ranked.smashyLadderAfter" /></span>
    </p>
  );
}
