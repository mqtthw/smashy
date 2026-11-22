// Smashy's saved list of start.gg players (round 246): what gets written, what a search asks for,
// and hiding a player.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mergePlayerHits, playerRows, type PlayerHit } from "@/lib/playerSearch";

vi.mock("server-only", () => ({}));

// A stand-in for the database client: remembers what each query did and answers with `respond`.
type Query = { table: string; ops: [string, ...unknown[]][] };
let queries: Query[] = [];
let respond: (q: Query) => { data: unknown; error: unknown } = () => ({ data: [], error: null });
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from(table: string) {
      const query: Query = { table, ops: [] };
      queries.push(query);
      const q: Record<string, unknown> = {};
      for (const op of ["select", "eq", "in", "ilike", "order", "limit", "upsert", "update", "abortSignal"]) {
        q[op] = (...args: unknown[]) => (query.ops.push([op, ...args]), q);
      }
      q.then = (resolve: (v: unknown) => unknown) => resolve(respond(query));
      return q;
    },
  }),
}));
const op = (q: Query, name: string) => q.ops.find((o) => o[0] === name);
const upserts = () => queries.filter((q) => op(q, "upsert")).map((q) => op(q, "upsert")![1] as { player_id: number; tag: string; prefix: string | null }[]);

beforeEach(() => {
  queries = [];
  respond = () => ({ data: [], error: null });
  vi.resetModules(); // each test gets a server that hasn't saved anyone yet
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("playerRows", () => {
  it("keeps one row per player (the first, which is the newest), with real ids and tidy text", () => {
    const rows = playerRows(
      [
        { playerId: "7", tag: " MkLeo ", prefix: " LG " },
        { playerId: "7", tag: "MKLeo", prefix: "Echo Fox | MVG" }, // an older tournament: not the one to keep
        { playerId: "8", tag: "Zain", prefix: "" },
        { playerId: "abc", tag: "Nope", prefix: null },
        { playerId: "9", tag: "   ", prefix: null },
        { playerId: "10", tag: "x".repeat(300), prefix: "y".repeat(300) },
      ],
      "2026-11-11T00:00:00.000Z",
    );
    expect(rows.map((r) => r.player_id)).toEqual([7, 8, 10]);
    expect(rows[0]).toEqual({ player_id: 7, tag: "MkLeo", prefix: "LG", last_seen_at: "2026-11-11T00:00:00.000Z" });
    expect(rows[1].prefix).toBeNull();
    expect([rows[2].tag.length, rows[2].prefix?.length]).toEqual([100, 100]);
  });
});

describe("mergePlayerHits", () => {
  const live: PlayerHit[] = [{ playerId: "2", tag: "MkLeo", prefix: "LG", seenAt: "A Major", count: 3 }];
  it("adds saved players the tournaments didn't have, and lists nobody twice", () => {
    const hits = mergePlayerHits("leo", live, [
      { playerId: "2", tag: "MkLeo", prefix: "LG" },
      { playerId: "5", tag: "Leo", prefix: null },
      { playerId: "6", tag: "Leonidas", prefix: null },
    ]);
    expect(hits.map((h) => [h.playerId, h.seenAt])).toEqual([["5", ""], ["6", ""], ["2", "A Major"]]); // exact tag, starts with, contains
  });
  it("still answers from the saved list alone, and stops at the limit", () => {
    expect(mergePlayerHits("zain", [], [{ playerId: "8", tag: "Zain", prefix: "SR" }])).toEqual([{ playerId: "8", tag: "Zain", prefix: "SR", seenAt: "", count: 0 }]);
    expect(mergePlayerHits("a", [], Array.from({ length: 40 }, (_, i) => ({ playerId: String(i), tag: `a${i}`, prefix: null })), 15)).toHaveLength(15);
  });
});

describe("rememberPlayers", () => {
  const leo = { playerId: "7", tag: "MkLeo", prefix: "LG" };
  const zain = { playerId: "8", tag: "Zain", prefix: null };

  it("saves each player once, without touching who is hidden", async () => {
    const { rememberPlayers } = await import("@/lib/playerIndex");
    await rememberPlayers([leo, zain, leo]);
    expect(upserts()).toHaveLength(1);
    expect(upserts()[0].map((r) => r.player_id)).toEqual([7, 8]);
    expect(upserts()[0][0]).not.toHaveProperty("hidden");
    expect(op(queries[0], "upsert")![2]).toEqual({ onConflict: "player_id" });
  });

  it("doesn't write the same players again a moment later, but does when a tag or sponsor changes", async () => {
    const { rememberPlayers } = await import("@/lib/playerIndex");
    await rememberPlayers([leo, zain]);
    await rememberPlayers([leo, zain]);
    expect(upserts()).toHaveLength(1);
    await rememberPlayers([{ ...leo, prefix: "T1" }, zain]);
    expect(upserts()).toHaveLength(2);
    expect(upserts()[1]).toMatchObject([{ player_id: 7, prefix: "T1" }]);
  });

  it("never fails the page that saw the players, and tries again next time", async () => {
    const { rememberPlayers } = await import("@/lib/playerIndex");
    respond = () => ({ data: null, error: new Error("database is down") });
    await expect(rememberPlayers([leo])).resolves.toBeUndefined();
    respond = () => ({ data: [], error: null });
    await rememberPlayers([leo]);
    expect(upserts()).toHaveLength(2);
  });

  it("asks the database nothing when there's nobody to save", async () => {
    const { rememberPlayers } = await import("@/lib/playerIndex");
    await rememberPlayers([]);
    await rememberPlayers([{ playerId: "x", tag: "Nope", prefix: null }]);
    expect(queries).toHaveLength(0);
  });
});

describe("searchSavedPlayers", () => {
  it("looks for the exact tag and for tags that contain it, treating typed % and _ as ordinary characters", async () => {
    const { searchSavedPlayers } = await import("@/lib/playerIndex");
    respond = (q) => ({ data: String(op(q, "ilike")![2]).includes("%1") ? [{ player_id: 2, tag: "100%_x fan", prefix: null }, { player_id: 1, tag: "100%_X", prefix: "A" }] : [{ player_id: 1, tag: "100%_X", prefix: "A" }], error: null });
    const found = await searchSavedPlayers(" 100%_x ");
    expect(queries.map((q) => op(q, "ilike")![2])).toEqual(["100\\%\\_x", "%100\\%\\_x%"]);
    expect(queries.every((q) => JSON.stringify(op(q, "eq")) === JSON.stringify(["eq", "hidden", false]))).toBe(true); // hidden players are never listed
    expect(found).toEqual([{ playerId: "1", tag: "100%_X", prefix: "A" }, { playerId: "2", tag: "100%_x fan", prefix: null }]);
  });
  it("doesn't search for a single letter, and fails loudly if the database does", async () => {
    const { searchSavedPlayers } = await import("@/lib/playerIndex");
    expect(await searchSavedPlayers("m")).toEqual([]);
    expect(queries).toHaveLength(0);
    respond = () => ({ data: null, error: new Error("database is down") });
    await expect(searchSavedPlayers("mkleo")).rejects.toThrow(/database is down/);
  });
});

describe("hiding a player", () => {
  it("hides someone who isn't saved yet, under the id that was asked for", async () => {
    const { setPlayerHidden } = await import("@/lib/playerIndex");
    expect(await setPlayerHidden("7", true, { playerId: "999", tag: "MkLeo", prefix: "LG" })).toBe(true);
    expect(op(queries[0], "upsert")![1]).toMatchObject({ player_id: 7, tag: "MkLeo", prefix: "LG", hidden: true });
  });
  it("lists them again, and says so when there was nobody to change", async () => {
    const { setPlayerHidden } = await import("@/lib/playerIndex");
    respond = () => ({ data: [{ player_id: 7 }], error: null });
    expect(await setPlayerHidden("7", false)).toBe(true);
    expect(op(queries[0], "update")![1]).toMatchObject({ hidden: false });
    respond = () => ({ data: [], error: null });
    expect(await setPlayerHidden("8", false)).toBe(false);
    expect(await setPlayerHidden("not-an-id", true)).toBe(false);
  });
  it("hiddenPlayers answers only for real ids, and fails rather than say nobody is hidden", async () => {
    const { hiddenPlayers } = await import("@/lib/playerIndex");
    respond = () => ({ data: [{ player_id: 7 }], error: null });
    expect([...(await hiddenPlayers(["7", "8", "x"]))]).toEqual(["7"]);
    expect(op(queries[0], "in")![2]).toEqual(["7", "8"]);
    respond = () => ({ data: null, error: new Error("database is down") });
    await expect(hiddenPlayers(["7"])).rejects.toThrow(/database is down/);
  });
});
