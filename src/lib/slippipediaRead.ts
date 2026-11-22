// Reading a Slippipedia database in the browser. Slippipedia (github.com/cbartsch/Slippipedia) is a
// desktop app that analyzes a whole Slippi replay folder and keeps the results in a SQLite file on
// the player's computer. Picking that file on /replays turns its games into the same summaries
// slippiRead.ts makes from .slp files, so the stats page and "Save to your profile" work the same.
// The file is opened on this device with sql.js (SQLite compiled for the browser); nothing is uploaded.
//
// Slippipedia counts openings its own way (every punish is one, including single hits), so its damage
// per opening is lower and its openings per kill higher than Slippi's stats screen for the same games.
//
// The file (checked with Matthew's own, 2026-11-13, Slippipedia 2.2, database version 3.1): on Windows
// %APPDATA%\Slippipedia\QML\OfflineStorage\Databases\<long name>.sqlite, the bigger of the two
// .sqlite files there (the small one is Slippipedia's settings).
//
// Slippipedia's tables (as of its database version 3.2): Replays (one row per game: date, stageId,
// duration in frames, filePath, hasData), Players (one row per player per game: port, isWinner,
// slippiName, slippiCode, cssTag, charId, charIdOriginal, and a column "s_<stat>" for each number it
// works out, such as s_openings, s_stocksTaken, s_damageDealt, s_apm, s_lCancels, s_lCancelsMissed).
// It uses the same character and stage numbers as Slippi itself. It doesn't record neutral wins or
// counter hits, so those stay empty for games read from it, and it doesn't say which players were
// computer players.
import type { ReplayGame, ReplayPlayer } from "./slippiStats";
import type { SkipReason } from "./slippiRead";

export const SLIPPIPEDIA_MAX_BYTES = 400 * 1024 * 1024;
const MIN_FRAMES = 30 * 60; // the same 30 seconds as replay files
const MAX_GAMES = 100_000; // what a saved summary allows

export type SlippipediaResult =
  | { games: ReplayGame[]; skipped: { file: string; reason: SkipReason }[]; total: number }
  | { error: "notSlippipedia" | "unreadable" | "tooBig" };

type Cell = string | number | null | Uint8Array;

/** The values in a SQLite cell as a number (0 when empty). */
const n = (v: Cell | undefined) => (typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(+v) ? +v : 0);
const s = (v: Cell | undefined) => (typeof v === "string" && v.trim() ? v.trim() : null);

/** A game's date, however it was stored (text, or seconds or milliseconds since 1970). */
function when(v: Cell | undefined): string | null {
  if (typeof v === "number" && v > 0) return new Date(v > 1e11 ? v : v * 1000).toISOString();
  if (typeof v === "string") {
    const t = Date.parse(v);
    return Number.isFinite(t) ? new Date(t).toISOString() : null;
  }
  return null;
}

const baseName = (path: string | null) => (path ? path.split(/[\\/]/).pop() || path : "game");

/** `wasm`: where sql.js's engine file is (the page serves it from /sqljs; tests point at node_modules). */
export async function readSlippipedia(bytes: ArrayBuffer, wasm = "/sqljs/sql-wasm.wasm"): Promise<SlippipediaResult> {
  if (bytes.byteLength > SLIPPIPEDIA_MAX_BYTES) return { error: "tooBig" };
  // SQLite files start with this 16-byte header.
  if (new TextDecoder().decode(new Uint8Array(bytes, 0, Math.min(16, bytes.byteLength))) !== "SQLite format 3\u0000") return { error: "notSlippipedia" };

  const [{ default: initSqlJs }, { characters, stages }] = await Promise.all([import("sql.js"), import("@slippi/slippi-js")]);
  const SQL = await initSqlJs({ locateFile: () => wasm });
  let db: InstanceType<typeof SQL.Database>;
  try {
    db = new SQL.Database(new Uint8Array(bytes));
  } catch {
    return { error: "unreadable" };
  }
  try {
    const columns = (table: string) => new Set((db.exec(`pragma table_info(${table})`)[0]?.values ?? []).map((r) => String(r[1]).toLowerCase()));
    const replayCols = columns("Replays");
    const playerCols = columns("Players");
    if (!replayCols.has("stageid") || !playerCols.has("replayid") || !playerCols.has("charid")) return { error: "notSlippipedia" };
    // Older Slippipedia databases may lack some stat columns: read what's there, 0 for the rest.
    const pick = (col: string) => (playerCols.has(col.toLowerCase()) ? `p.${col}` : "0");
    const hasData = replayCols.has("hasdata") ? "where r.hasData" : "";
    const rows =
      db.exec(
        `select r.id, r.date, r.stageId, r.duration, r.filePath, p.port, p.isWinner, p.slippiName, p.slippiCode, ${pick("cssTag")},
           p.charId, ${pick("charIdOriginal")}, ${pick("s_stocksTaken")}, ${pick("s_damageDealt")}, ${pick("s_openings")}, ${pick("s_apm")},
           ${pick("s_lCancels")}, ${pick("s_lCancelsMissed")}, ${playerCols.has("s_openingsperkill") ? "p.s_openingsPerKill" : "null"}
         from Replays r join Players p on p.replayId = r.id ${hasData} order by r.id, p.port`,
      )[0]?.values ?? [];

    // One entry per game, its players in port order.
    const byGame = new Map<number, Cell[][]>();
    for (const row of rows) {
      const id = n(row[0]);
      const list = byGame.get(id) ?? [];
      list.push(row);
      byGame.set(id, list);
    }

    const games: ReplayGame[] = [];
    const skipped: { file: string; reason: SkipReason }[] = [];
    for (const list of byGame.values()) {
      if (games.length >= MAX_GAMES) break;
      const [first] = list;
      const file = baseName(s(first[4]));
      if (list.length !== 2) {
        skipped.push({ file, reason: "notOneOnOne" });
        continue;
      }
      const frames = n(first[3]);
      if (frames < MIN_FRAMES) {
        skipped.push({ file, reason: "tooShort" });
        continue;
      }
      const minutes = frames / 3600;
      const winners = list.filter((r) => n(r[6]) === 1 || r[6] === "true");
      const player = (r: Cell[]): ReplayPlayer => {
        const charId = n(r[11]) || n(r[10]); // the original pick (Sheik stays Sheik)
        const kills = n(r[12]);
        const openings = n(r[14]);
        // Slippipedia's own openings per kill for the game when it has one. It leaves out openings that
        // didn't lead to a kill (those after the last stock taken), so it's lower than all openings over
        // all kills; using it keeps the numbers the same as Slippipedia shows.
        const opk = r[18] === null || r[18] === undefined ? null : n(r[18]);
        return {
          index: n(r[5]),
          code: s(r[8]),
          name: s(r[7]) ?? s(r[9]) ?? `Port ${n(r[5]) + 1}`,
          character: characters.getCharacterShortName(charId) || "Unknown",
          won: winners.length === 1 ? winners[0] === r : null,
          kills,
          damage: n(r[13]),
          openingsPerKill: { count: opk !== null && kills > 0 ? opk * kills : openings, total: kills },
          damagePerOpening: { count: n(r[13]), total: openings },
          neutralWins: { count: 0, total: 0 }, // not in Slippipedia's data
          counterHits: { count: 0, total: 0 },
          inputsPerMinute: { count: n(r[15]) * minutes, total: n(r[15]) > 0 ? minutes : 0 },
          lCancels: { success: n(r[16]), fail: n(r[17]) },
        };
      };
      let stage = "Unknown stage";
      try {
        stage = stages.getStageName(n(first[2])) || stage;
      } catch {}
      games.push({ file, startAt: when(first[1]), stage, frames, players: [player(list[0]), player(list[1])] });
    }
    return { games, skipped, total: byGame.size };
  } catch {
    return { error: "unreadable" };
  } finally {
    db.close();
  }
}
