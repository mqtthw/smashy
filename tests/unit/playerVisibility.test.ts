// Who may be looked up as a start.gg player (rounds 245 and 246): anyone who isn't on Smashy, and
// members who show their stats. Left out: members who don't (the default for teens), and players
// who asked not to be listed (hidden on Smashy's saved list).
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: () => {} }));

const year = new Date().getFullYear();
const ADULT = `${year - 30}-01-01`;
const TEEN = `${year - 15}-01-01`;

type Row = Record<string, unknown>;
const tables: Record<string, Row[]> = {
  startgg_links: [
    { user_id: "adult", startgg_player_id: 101 },
    { user_id: "adult-off", startgg_player_id: 102 },
    { user_id: "teen", startgg_player_id: 103 },
    { user_id: "teen-on", startgg_player_id: 104 },
    { user_id: "no-birthday", startgg_player_id: 105 },
  ],
  profiles: [
    { id: "adult", show_stats: null, handle: "adult" },
    { id: "adult-off", show_stats: false, handle: "adultoff" },
    { id: "teen", show_stats: null, handle: "teen" },
    { id: "teen-on", show_stats: true, handle: "teenon" },
    { id: "no-birthday", show_stats: null, handle: "nobirthday" },
  ],
  startgg_players: [
    { player_id: 200, hidden: true }, // not on Smashy, asked not to be listed
    { player_id: 201, hidden: false },
    { player_id: 101, hidden: true }, // a member who shows stats, but asked not to be listed here
  ],
  private_profile_data: [
    { user_id: "adult", date_of_birth: ADULT },
    { user_id: "adult-off", date_of_birth: ADULT },
    { user_id: "teen", date_of_birth: TEEN },
    { user_id: "teen-on", date_of_birth: TEEN },
  ],
};
let broken = false;

// Just enough of the database client: from().select().in()/.eq(), awaited or .maybeSingle().
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from(table: string) {
      let rows = tables[table] ?? [];
      const result = () => (broken ? { data: null, error: new Error("database is down") } : { data: rows, error: null });
      const q = {
        select: () => q,
        in: (col: string, values: unknown[]) => ((rows = rows.filter((r) => values.map(String).includes(String(r[col])))), q),
        eq: (col: string, value: unknown) => ((rows = rows.filter((r) => String(r[col]) === String(value))), q),
        maybeSingle: async () => (broken ? { data: null, error: new Error("database is down") } : { data: rows[0] ?? null, error: null }),
        then: (resolve: (v: unknown) => unknown) => resolve(result()),
      };
      return q;
    },
  }),
}));

describe("playersHidingStats", () => {
  it("hides teens and anyone who switched their stats off; shows adults, teens who opted in, and people not on Smashy", async () => {
    const { playersHidingStats } = await import("@/lib/playerStats");
    const hidden = await playersHidingStats(["102", "103", "104", "105", "999"]);
    expect([...hidden].sort()).toEqual(["102", "103", "105"]); // 105: no birthday on file counts as a teen
  });
  it("hides players who asked not to be listed, on Smashy or not", async () => {
    const { playersHidingStats } = await import("@/lib/playerStats");
    expect([...(await playersHidingStats(["200", "201", "101", "104"]))].sort()).toEqual(["101", "200"]);
  });
  it("asks nothing for an empty or made-up list", async () => {
    const { playersHidingStats } = await import("@/lib/playerStats");
    expect((await playersHidingStats([])).size).toBe(0);
    expect((await playersHidingStats(["abc", "1 or 1=1"])).size).toBe(0);
  });
  it("fails instead of showing everyone when the database can't be asked", async () => {
    const { playersHidingStats } = await import("@/lib/playerStats");
    broken = true;
    await expect(playersHidingStats(["103"])).rejects.toThrow(/database is down/);
    broken = false;
  });
});

describe("playerOnSmashy", () => {
  it("allows players who aren't on Smashy, with no profile to link", async () => {
    const { playerOnSmashy } = await import("@/lib/playerStats");
    expect(await playerOnSmashy("999")).toEqual({ allowed: true, handle: null });
  });
  it("links a member who shows their stats to their profile", async () => {
    const { playerOnSmashy } = await import("@/lib/playerStats");
    expect(await playerOnSmashy("104")).toEqual({ allowed: true, handle: "teenon" });
    expect(await playerOnSmashy("201")).toEqual({ allowed: true, handle: null });
  });
  it("refuses a player who asked not to be listed, member or not", async () => {
    const { playerOnSmashy, statsAllowedForPlayer } = await import("@/lib/playerStats");
    expect(await playerOnSmashy("200")).toEqual({ allowed: false, handle: null });
    expect(await playerOnSmashy("101")).toEqual({ allowed: false, handle: null });
    expect(await statsAllowedForPlayer("200")).toBe(false); // no head-to-head card on set pages either
    expect(await statsAllowedForPlayer("201")).toBe(true);
  });
  it("refuses a member who doesn't, without naming their profile", async () => {
    const { playerOnSmashy } = await import("@/lib/playerStats");
    expect(await playerOnSmashy("103")).toEqual({ allowed: false, handle: null });
    expect(await playerOnSmashy("102")).toEqual({ allowed: false, handle: null });
    expect(await playerOnSmashy("not-a-number")).toEqual({ allowed: false, handle: null });
  });
  it("fails instead of allowing when the database can't be asked", async () => {
    const { playerOnSmashy } = await import("@/lib/playerStats");
    broken = true;
    await expect(playerOnSmashy("103")).rejects.toThrow(/database is down/);
    const { statsAllowedForPlayer } = await import("@/lib/playerStats");
    expect(await statsAllowedForPlayer("999")).toBe(false); // head-to-heads show nothing rather than guess
    broken = false;
  });
});
