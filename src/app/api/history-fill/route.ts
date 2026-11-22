// One run of the Smash history fill chain (src/lib/historyFillChain.ts). Started by the daily job; each
// run answers at once, fills in the background for about 4 minutes, then starts the next run.
// Needs "Authorization: Bearer <CRON_SECRET>", like the daily job.
import { timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { fillArchive } from "@/lib/majorEvents";
import { fillMajorSets } from "@/lib/majorSets";
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
      const sets = await fillMajorSets({ until: started + 240_000, maxRequests: 400 });
      result = { saved: archive.saved, standings: archive.standings, brackets: sets.brackets };
      console.log(`Smash history fill run ${run}:`, { ...archive, ...sets });
    } catch (e) {
      console.error(`Smash history fill run ${run} failed:`, e instanceof Error ? e.message : e);
    }
    if (shouldContinue(run, result)) await startHistoryFill(run + 1).catch((e) => console.error(e instanceof Error ? e.message : e));
  });
  return Response.json({ started: run }, { status: 202 });
}
