// One run of the Smash history fill chain (src/lib/historyFillChain.ts). Started by the daily job; each
// run answers at once, fills in the background for about 4 minutes, then starts the next run.
// Needs "Authorization: Bearer <CRON_SECRET>", like the daily job.
import { timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { fillArchive } from "@/lib/majorEvents";
import { fillMajorSets } from "@/lib/majorSets";
import { fillPlayerSnapshots } from "@/lib/playerSnapshotFill";
import { MAX_RUNS, shouldContinue, type FillResult } from "@/lib/historyFillChain";
import { startHistoryFill } from "@/lib/historyFillStart";

export const maxDuration = 300;

function allowed(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return Boolean(secret) && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export async function GET(request: Request) {
  if (!allowed(request)) return new Response("Not allowed", { status: 401 });
  const run = Math.max(1, Math.min(MAX_RUNS, Number(new URL(request.url).searchParams.get("run")) || 1));
  after(async () => {
    const started = Date.now();
    let result: FillResult | null = null;
    try {
      const archive = await fillArchive();
      // Sets get the first part of the run; saved copies of the players listed for search get the rest
      // (round 801). When the history is all filled, the sets step returns at once and the players get it all.
      const sets = await fillMajorSets({ until: started + 150_000, maxRequests: 400 });
      const copies = await fillPlayerSnapshots({ until: started + 265_000 }).catch((e) => (console.error("Player copies fill failed:", e instanceof Error ? e.message : e), { players: 0, left: -1 }));
      result = { saved: archive.saved, standings: archive.standings, brackets: sets.brackets, players: copies.players };
      console.log(`Smash history fill run ${run}:`, { ...archive, ...sets, playerCopies: copies.players, playersLeft: copies.left });
    } catch (e) {
      console.error(`Smash history fill run ${run} failed:`, e instanceof Error ? e.message : e);
    }
    if (shouldContinue(run, result)) await startHistoryFill(run + 1).catch((e) => console.error(e instanceof Error ? e.message : e));
  });
  return Response.json({ started: run }, { status: 202 });
}
