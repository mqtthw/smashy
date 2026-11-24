// Scheduled refresh of majors (start.gg), Reels clips (Twitch/YouTube) and the Texas events list (start.gg),
// plus clearing out unused post photos.
// Called by a scheduler (Vercel Cron, see vercel.json: daily at 11:00 UTC, the most Vercel's free plan
// allows; page views also refresh things in the background when they're stale) with "Authorization: Bearer <CRON_SECRET>".
// Each job only runs if it's due and not already running (see lib/refreshJobs.ts), so extra calls are harmless.
import { timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { syncActiveRegions, syncTexasEvents } from "@/lib/events";
import { syncMajors } from "@/lib/majors";
import { fillArchive } from "@/lib/majorEvents";
import { fillMajorSets } from "@/lib/majorSets";
import { startHistoryFill } from "@/lib/historyFillStart";
import { syncReels } from "@/lib/reels";
import { cleanupEmptyConversations } from "@/lib/messages";
import { cleanupPostImages } from "@/lib/postImages";
import { cleanupPostVideos } from "@/lib/postVideos";
import { runRefresh } from "@/lib/refreshJobs";
import { sendEventReminders } from "@/lib/rsvps";
import { sendWeeklyDigests } from "@/lib/digest";
import { sendHostedReminders } from "@/lib/hostedPromotion";
import { sendFollowedSignups } from "@/lib/playerFollows";

export const maxDuration = 300; // the majors scan can take a minute; give it room

function allowed(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return Boolean(secret) && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export async function GET(request: Request) {
  if (!allowed(request)) return new Response("Not allowed", { status: 401 });
  const started = Date.now();
  // Slightly under the visitor-triggered intervals (6h / 3h / 3h), so the schedule does the work.
  const [majors, reels, events, images, chats, reminders, regionsAndDigest] = await Promise.all([
    runRefresh("majors", 5 * 60, syncMajors),
    runRefresh("reels", 2 * 60, syncReels),
    runRefresh("events", 2 * 60 + 30, syncTexasEvents),
    // Photo files from deleted posts and abandoned uploads (safe to run any time, no lock needed).
    // ...and the same for videos (plus raw uploads that were never processed).
    Promise.all([cleanupPostImages(), cleanupPostVideos()]).catch((e) => (console.error("Image/video cleanup failed", e), "failed")),
    // Chats nobody is in anymore (and their photos).
    cleanupEmptyConversations().catch((e) => (console.error("Chat cleanup failed", e), "failed")),
    // "Tomorrow: <event>" for people who said they're going.
    // ...and for everyone signed up to an event hosted on Smashy.
    Promise.all([sendEventReminders(), sendHostedReminders()]).catch((e) => (console.error("Event reminders failed", e), "failed")),
    // Events lists for the other regions people play in (stalest first), THEN the Monday digest, so the
    // digest reads fresh lists instead of fetching the same regions from start.gg again.
    (async () => {
      const regions = await syncActiveRegions().catch((e) => (console.error("Region events failed", e), "failed"));
      const digest = await sendWeeklyDigests().catch((e) => (console.error("Weekly digest failed", e), "failed"));
      return { regions, digest };
    })(),
  ]);
  // "MkLeo signed up for …" for people who follow a player (round 799): up to a minute, before the history
  // fill takes what's left of start.gg's room.
  const follows = await sendFollowedSignups({ until: Date.now() + 60_000 }).catch((e) => (console.error("Followed player alerts failed", e), "failed"));
  // Smash history: winners and top 8s of past majors nobody has opened yet, a few dozen a day. Last, so
  // it only uses the start.gg room the jobs above leave (it stops when start.gg is busy).
  const archive = await fillArchive().catch((e) => (console.error("Smash history fill failed", e), "failed"));
  // ...then the sets played at past majors (head-to-head and characters), in whatever time is left.
  const sets = await fillMajorSets({ until: started + 270_000 }).catch((e) => (console.error("Smash history sets failed", e), "failed"));
  // ...and keeps filling in the quiet hours after this, a few minutes per run (round 583), until it's all saved.
  after(() => startHistoryFill(1).catch((e) => console.error(e instanceof Error ? e.message : e)));
  return Response.json({ majors, reels, events, images, chats, reminders, ...regionsAndDigest, follows, archive, sets });
}
