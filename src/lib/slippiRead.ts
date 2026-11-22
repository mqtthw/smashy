// Reading one Slippi replay (.slp) in the browser with the Slippi project's own library, into the
// small summary slippiStats.ts adds up. Only singles games between two people (no teams, no computer
// players) of 30 seconds or more are kept; anything else comes back with the reason it was skipped.
import type { ReplayGame, ReplayPlayer } from "./slippiStats";

/** Why a replay was left out (the page shows it in the visitor's language). */
export type SkipReason = "notSlippi" | "notOneOnOne" | "computer" | "tooShort" | "tooBig" | "unreadable";
export type ReadResult = { game: ReplayGame } | { skipped: SkipReason };

const MIN_FRAMES = 30 * 60; // 30 seconds at 60 frames a second

export async function readReplay(file: string, bytes: ArrayBuffer): Promise<ReadResult> {
  const { SlippiGame, characters, stages } = await import("@slippi/slippi-js");
  let game;
  try {
    game = new SlippiGame(new Uint8Array(bytes));
  } catch {
    return { skipped: "notSlippi" };
  }
  const settings = game.getSettings();
  if (!settings) return { skipped: "notSlippi" };
  const present = settings.players.filter((p) => p.type !== 3 && p.characterId !== undefined);
  if (settings.isTeams || present.length !== 2) return { skipped: "notOneOnOne" };
  if (present.some((p) => p.type === 1)) return { skipped: "computer" };
  const stats = game.getStats();
  if (!stats || stats.playableFrameCount < MIN_FRAMES) return { skipped: "tooShort" };
  const meta = game.getMetadata();
  // The winner from the replay's own result; older replays don't record one, so then whoever took
  // every one of the other's stocks.
  let winner = game.getWinners().find((w) => w.position === 0)?.playerIndex;
  if (winner === undefined) {
    const out = present.filter((p) => p.startStocks && stats.stocks.filter((s) => s.playerIndex === p.playerIndex && s.endFrame != null).length >= p.startStocks);
    if (out.length === 1) winner = present.find((p) => p !== out[0])!.playerIndex;
  }

  const player = (p: (typeof present)[number]): ReplayPlayer => {
    const overall = stats.overall.find((o) => o.playerIndex === p.playerIndex);
    const actions = stats.actionCounts.find((a) => a.playerIndex === p.playerIndex);
    const names = meta?.players?.[p.playerIndex]?.names;
    const r = (x: { count: number; total: number } | undefined) => ({ count: x?.count ?? 0, total: x?.total ?? 0 });
    return {
      index: p.playerIndex,
      code: p.connectCode || names?.code || null,
      name: p.displayName || names?.netplay || p.nametag || `Port ${p.port}`,
      character: characters.getCharacterShortName(p.characterId!),
      won: winner === undefined ? null : winner === p.playerIndex,
      kills: overall?.killCount ?? 0,
      damage: overall?.totalDamage ?? 0,
      openingsPerKill: r(overall?.openingsPerKill),
      damagePerOpening: r(overall?.damagePerOpening),
      neutralWins: r(overall?.neutralWinRatio),
      counterHits: r(overall?.counterHitRatio),
      inputsPerMinute: r(overall?.inputsPerMinute),
      lCancels: { success: actions?.lCancelCount.success ?? 0, fail: actions?.lCancelCount.fail ?? 0 },
    };
  };

  return {
    game: {
      file,
      startAt: meta?.startAt ?? null,
      stage: settings.stageId === undefined ? "Unknown stage" : stages.getStageName(settings.stageId),
      frames: stats.playableFrameCount,
      players: [player(present[0]), player(present[1])],
    },
  };
}
