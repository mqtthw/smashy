// Today's online start.gg brackets (running now or starting within a day, at most 5): used by the
// "Online brackets today" list on the Feed and in the desktop side column (round 813). Plain logic.
import { bracketStart, isRunning } from "./format";
import type { SmashyTournament } from "./startgg";

export function onlineToday(list: SmashyTournament[], now = Date.now() / 1000): { t: SmashyTournament; live: boolean; start: number }[] {
  return list
    .map((t) => ({ t, live: isRunning(t, now), start: bracketStart(t, now) }))
    // Running now, or a bracket starting within a day (season series count by their next bracket).
    .filter((r) => r.live || (r.start > now && r.start <= now + 86400))
    // Live first (biggest first), then the next ones to start.
    .sort((a, b) => Number(b.live) - Number(a.live) || (a.live ? (b.t.numAttendees ?? 0) - (a.t.numAttendees ?? 0) : a.start - b.start))
    .slice(0, 5);
}
