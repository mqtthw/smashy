// Filling Smash history faster (round 583). Vercel's free plan runs the daily job once a day for at most
// 5 minutes, so standings, sets and characters for past majors filled a few dozen majors a day while
// start.gg and the database sat idle the rest of the time. After the daily job, a chain of runs keeps
// filling: each run works for about 4 minutes, then starts the next, up to MAX_RUNS a day. It stops on
// its own when a run saved nothing (all filled, or start.gg busy: the fill gives way to visitors).
// Plain logic, so it can be tested.

/**
 * Runs per day (about 4 minutes each, in the quiet hours after 11:00 UTC). 12 until round 801; 30 (two hours
 * at most) while saved copies of the players listed for search are being filled. A run that saves nothing
 * still ends the chain, so once everything is filled it stops after the first run.
 */
export const MAX_RUNS = 30;

export type FillResult = { saved: number; standings: number; brackets: number; players?: number };

/** Whether run number `run` (1 = the first) should start the next one, given what it saved. */
export function shouldContinue(run: number, result: FillResult | null): boolean {
  if (!result || run >= MAX_RUNS) return false;
  return result.saved + result.standings + result.brackets + (result.players ?? 0) > 0;
}
