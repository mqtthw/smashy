// Starts a run of the Smash history fill chain (src/app/api/history-fill/route.ts): the run answers at
// once and works in the background. Server-only: it sends the cron secret.
import "server-only";
import { siteUrl } from "./siteMeta";

export async function startHistoryFill(run = 1): Promise<void> {
  const url = new URL(`/api/history-fill?run=${run}`, siteUrl());
  const res = await fetch(url, { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` }, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Smash history fill run ${run} wasn't started: ${res.status}`);
}
