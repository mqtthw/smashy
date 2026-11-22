// Pick'em: the picks table is closed to everyone but the server (so nobody can read others' picks
// before an event starts), and a pick must name a champion who is in the top 8 picked.
import { afterAll, describe, expect, it } from "vitest";
import { admin, cleanup, guest, hasDb, makeUser } from "./helpers";

describe.skipIf(!hasDb)("pick'em picks", () => {
  afterAll(cleanup);

  it("is closed to members and guests, and keeps the champion in the top 8", async () => {
    const [a, b] = await Promise.all([makeUser("PkAda"), makeUser("PkBen")]);
    const row = { event_id: 1, user_id: a.id, champion: "100", top8: ["100", "101"], tags: { "100": "P1", "101": "P2" }, event_name: "Singles", tournament: "Test Major", game: "melee", locks_at: new Date(Date.now() + 86_400_000).toISOString() };
    expect((await admin.from("pickem_picks").insert(row)).error).toBeNull();

    // Nobody reads or writes it through the API, not even the person who made the picks.
    for (const who of [a.c, b.c, guest()]) {
      expect((await who.from("pickem_picks").select("champion").eq("event_id", 1)).data ?? []).toEqual([]);
      expect((await who.from("pickem_picks").insert({ ...row, user_id: b.id })).error).not.toBeNull();
      expect((await who.from("pickem_picks").update({ champion: "101" }).eq("event_id", 1).select("event_id")).data ?? []).toEqual([]);
    }
    expect((await admin.from("pickem_picks").select("champion").eq("event_id", 1).eq("user_id", a.id).single()).data?.champion).toBe("100");

    // The champion must be one of the top 8 picked; ids are start.gg player ids; one pick per person per event.
    expect((await admin.from("pickem_picks").insert({ ...row, user_id: b.id, champion: "999" })).error).not.toBeNull();
    expect((await admin.from("pickem_picks").insert({ ...row, user_id: b.id, champion: "x", top8: ["x"] })).error).not.toBeNull();
    expect((await admin.from("pickem_picks").insert({ ...row, user_id: b.id, top8: ["100", "101", "102", "103", "104", "105", "106", "107", "108"] })).error).not.toBeNull();
    expect((await admin.from("pickem_picks").insert(row)).error?.code).toBe("23505");
  });
});
