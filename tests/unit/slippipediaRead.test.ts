// Reading a Slippipedia database: a small one is built in memory with Slippipedia's own table layout
// (database version 3.2, trimmed to the columns that matter) and read back like a picked file.
import { createRequire } from "node:module";
import initSqlJs from "sql.js";
import { describe, expect, it } from "vitest";
import { readSlippipedia } from "@/lib/slippipediaRead";
import { totalsFor } from "@/lib/slippiStats";

const wasm = createRequire(import.meta.url).resolve("sql.js/dist/sql-wasm.wasm");

async function sampleDb(): Promise<ArrayBuffer> {
  const SQL = await initSqlJs({ locateFile: () => wasm });
  const db = new SQL.Database();
  db.exec(`create table Replays (id integer primary key, hasData bool, date date, stageId integer, winnerPort integer, duration integer, filePath text);
    create table Players (replayId integer, port integer, isWinner bool, slippiName text, slippiCode text, cssTag text, charId integer, charIdOriginal integer,
      s_stocksTaken real, s_damageDealt real, s_openings real, s_apm real, s_lCancels real, s_lCancelsMissed real, primary key (replayId, port));`);
  const game = (id: number, stage: number, frames: number, file: string) =>
    db.exec(`insert into Replays values (${id}, 1, '2026-11-0${id}T20:00:00Z', ${stage}, 0, ${frames}, 'C:\\Users\\me\\Slippi\\${file}')`);
  const player = (id: number, port: number, won: number, name: string, code: string, char: number, orig: number, kills: number, dmg: number, openings: number, apm: number, lc: number, lcm: number) =>
    db.exec(`insert into Players values (${id}, ${port}, ${won}, '${name}', '${code}', '', ${char}, ${orig}, ${kills}, ${dmg}, ${openings}, ${apm}, ${lc}, ${lcm})`);
  // Game 1: Blair (Fox) beats Ada (Sheik, stored as Zelda/Sheik 18 with original 19) on Battlefield, 3 minutes.
  game(1, 31, 3 * 3600, "Game_1.slp");
  player(1, 0, 1, "Blair", "BLAI#123", 2, 2, 4, 400, 10, 300, 8, 2);
  player(1, 1, 0, "Ada", "ADA#1", 18, 19, 2, 250, 9, 200, 0, 0);
  // Game 2: Blair loses to Ada on Final Destination, 2 minutes.
  game(2, 32, 2 * 3600, "Game_2.slp");
  player(2, 0, 0, "Blair", "BLAI#123", 2, 2, 2, 200, 6, 280, 4, 4);
  player(2, 1, 1, "Ada", "ADA#1", 18, 19, 4, 380, 8, 210, 0, 0);
  // Game 3: doubles (4 players) and game 4: 10 seconds long are left out.
  game(3, 31, 4 * 3600, "Doubles.slp");
  for (const port of [0, 1, 2, 3]) player(3, port, port < 2 ? 1 : 0, `P${port}`, `P#${port}`, 2, 2, 1, 100, 3, 200, 0, 0);
  game(4, 2, 600, "Short.slp");
  player(4, 0, 1, "Blair", "BLAI#123", 2, 2, 0, 10, 1, 300, 0, 0);
  player(4, 1, 0, "Ada", "ADA#1", 9, 9, 0, 5, 1, 200, 0, 0);
  const bytes = db.export();
  db.close();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

describe("readSlippipedia", () => {
  it("turns Slippipedia's games into the same summaries as replay files", async () => {
    const res = await readSlippipedia(await sampleDb(), wasm);
    if ("error" in res) throw new Error(res.error);
    expect(res.total).toBe(4);
    expect(res.games).toHaveLength(2);
    expect(res.skipped.map((s) => [s.file, s.reason])).toEqual([["Doubles.slp", "notOneOnOne"], ["Short.slp", "tooShort"]]);
    const [g1] = res.games;
    expect(g1.stage).toBe("Battlefield");
    expect(g1.file).toBe("Game_1.slp");
    expect(g1.startAt).toBe("2026-11-01T20:00:00.000Z");
    expect(g1.players[1].character).toBe("Sheik"); // the original pick, not Zelda/Sheik
    expect(g1.players[0]).toMatchObject({ code: "BLAI#123", name: "Blair", character: "Fox", won: true, kills: 4 });
  });

  it("adds up like replays do (rates over all games together)", async () => {
    const res = await readSlippipedia(await sampleDb(), wasm);
    if ("error" in res) throw new Error(res.error);
    const t = totalsFor(res.games, "BLAI#123")!;
    expect(t).toMatchObject({ games: 2, wins: 1, losses: 1, kills: 6, minutes: 5 });
    expect(t.openingsPerKill).toBeCloseTo(16 / 6); // 10 + 6 openings over 4 + 2 kills
    expect(t.damagePerOpening).toBeCloseTo(600 / 16);
    expect(t.inputsPerMinute).toBeCloseTo((300 * 3 + 280 * 2) / 5);
    expect(t.lCancelRate).toBeCloseTo(12 / 18);
    expect(t.neutralWinRate).toBeNull(); // not in Slippipedia's data
    expect(t.byStage.map((s) => s.name).sort()).toEqual(["Battlefield", "Final Destination"]);
  });

  it("uses Slippipedia's own openings per kill when the database has it", async () => {
    const SQL = await initSqlJs({ locateFile: () => wasm });
    const db = new SQL.Database();
    db.exec(`create table Replays (id integer primary key, hasData bool, date text, stageId integer, duration integer, filePath text);
      create table Players (replayId integer, port integer, isWinner bool, slippiName text, slippiCode text, charId integer,
        s_stocksTaken real, s_damageDealt real, s_openings real, s_openingsPerKill real);
      insert into Replays values (1, 1, '2023-12-02T16:28:07.000', 3, 12782, 'Game.slp');
      insert into Players values (1, 0, 1, 'Blair', 'BLAI#123', 2, 2, 360, 24, 8);
      insert into Players values (1, 1, 0, 'Ada', 'ADA#1', 20, 4, 300, 20, 5);`);
    const bytes = db.export();
    const res = await readSlippipedia(bytes.buffer as ArrayBuffer, wasm);
    if ("error" in res) throw new Error(res.error);
    // 24 openings over 2 kills would be 12; Slippipedia's own figure for the game is 8.
    expect(totalsFor(res.games, "BLAI#123")!.openingsPerKill).toBeCloseTo(8);
    expect(totalsFor(res.games, "BLAI#123")!.damagePerOpening).toBeCloseTo(15);
  });

  it("refuses files that aren't a Slippipedia database", async () => {
    expect(await readSlippipedia(new TextEncoder().encode("not a database at all").buffer as ArrayBuffer, wasm)).toEqual({ error: "notSlippipedia" });
    const SQL = await initSqlJs({ locateFile: () => wasm });
    const other = new SQL.Database();
    other.exec("create table Notes (id integer)");
    const bytes = other.export();
    expect(await readSlippipedia(bytes.buffer as ArrayBuffer, wasm)).toEqual({ error: "notSlippipedia" });
  });
});
