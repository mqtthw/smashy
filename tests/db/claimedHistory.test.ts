// Claimed player pages: saved careers are closed to everyone but the server, and unlinking start.gg
// (or linking a different account) deletes what was saved.
import { afterAll, describe, expect, it } from "vitest";
import { admin, cleanup, guest, hasDb, makeUser } from "./helpers";

describe.skipIf(!hasDb)("claimed histories", () => {
  afterAll(cleanup);

  it("is server-only and forgotten when start.gg is unlinked or changed", async () => {
    const [a, b] = await Promise.all([makeUser("ClAda"), makeUser("ClBen")]);
    const fake = 9_000_000_000 + Math.floor(Math.random() * 1_000_000); // ids start.gg won't have
    expect((await admin.from("startgg_links").insert({ user_id: a.id, startgg_user_id: fake, startgg_player_id: fake, gamer_tag: "ClAda" })).error).toBeNull();
    const row = { user_id: a.id, event_id: 1, placement: 1, event_name: "Singles", tournament: "Test Local", entrants: 24, start_at: new Date().toISOString(), game: "melee", doubles: false };
    expect((await admin.from("claimed_results").insert([row, { ...row, event_id: 2, placement: 5 }])).error).toBeNull();
    expect((await admin.from("claimed_imports").insert({ user_id: a.id, next_page: 3, total_pages: 2, done_at: new Date().toISOString() })).error).toBeNull();

    // Nobody reads or writes them through the API, not even their owner.
    for (const who of [a.c, b.c, guest()]) {
      expect((await who.from("claimed_results").select("event_id").eq("user_id", a.id)).data ?? []).toEqual([]);
      expect((await who.from("claimed_imports").select("user_id")).data ?? []).toEqual([]);
      expect((await who.from("claimed_results").insert({ ...row, event_id: 3 })).error).not.toBeNull();
      expect((await who.from("claimed_results").update({ placement: 1 }).eq("user_id", a.id).select("event_id")).data ?? []).toEqual([]);
    }
    // A placement must be 1 or more.
    expect((await admin.from("claimed_results").insert({ ...row, event_id: 4, placement: 0 })).error).not.toBeNull();

    // Linking a different start.gg account forgets the old career.
    expect((await admin.from("startgg_links").update({ startgg_player_id: fake + 1 }).eq("user_id", a.id)).error).toBeNull();
    expect((await admin.from("claimed_results").select("event_id").eq("user_id", a.id)).data).toEqual([]);
    expect((await admin.from("claimed_imports").select("user_id").eq("user_id", a.id)).data).toEqual([]);

    // So does unlinking (the member removing their own link).
    expect((await admin.from("claimed_results").insert(row)).error).toBeNull();
    expect((await a.c.from("startgg_links").delete().eq("user_id", a.id)).error).toBeNull();
    expect((await admin.from("startgg_links").select("user_id").eq("user_id", a.id)).data).toEqual([]);
    expect((await admin.from("claimed_results").select("event_id").eq("user_id", a.id)).data).toEqual([]);
  });
});
