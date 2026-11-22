// New players corner: the ladder pairs the closest rating first (not just whoever waited longest).
import { afterAll, describe, expect, it } from "vitest";
import { admin, cleanup, hasDb, makeUser } from "./helpers";

const season = () => {
  const d = new Date();
  return `${d.getUTCFullYear()}-Q${Math.floor(d.getUTCMonth() / 3) + 1}`;
};

describe.skipIf(!hasDb)("ladder pairing by rating", () => {
  afterAll(cleanup);

  it("pairs a newcomer with the waiting player closest to their rating", async () => {
    // Don't pair a real member who happens to be looking.
    const { count } = await admin.from("ladder_queue").select("user_id", { count: "exact", head: true }).eq("game", "pplus").gt("expires_at", new Date().toISOString());
    if (count) return;

    const [pro, rookie, newcomer] = await Promise.all([makeUser("NpPro"), makeUser("NpRookie"), makeUser("NpNew")]);
    expect((await admin.from("ladder_ratings").insert([
      { season: season(), game: "pplus", user_id: pro.id, rating: 1300, wins: 20, losses: 2 },
      { season: season(), game: "pplus", user_id: rookie.id, rating: 990, wins: 1, losses: 2 },
    ])).error).toBeNull();

    // Both are waiting, the strong player for longer; the newcomer (1000, no matches yet) still gets the rookie.
    const old = new Date(Date.now() - 600_000).toISOString();
    expect((await admin.from("ladder_queue").insert([
      { user_id: pro.id, game: "pplus", connect_info: "PRO#1", joined_at: old },
      { user_id: rookie.id, game: "pplus", connect_info: "ROOK#2", joined_at: new Date().toISOString() },
    ])).error).toBeNull();

    const id = (await newcomer.c.rpc("ladder_find_match", { p_game: "pplus", p_connect: "NEW#3" })).data as string;
    const { data: m } = await admin.from("ladder_matches").select("p1, p2").eq("id", id).single();
    expect(m).toEqual({ p1: rookie.id, p2: newcomer.id });
    // The pro is still waiting.
    expect((await admin.from("ladder_queue").select("user_id").eq("user_id", pro.id)).data).toHaveLength(1);
    await admin.from("ladder_queue").delete().eq("user_id", pro.id);
  });
});
