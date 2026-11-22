// Online ladder: pairing two members, reporting and confirming a score, ratings moving, the twice-a-day
// limit for the same pair, disputes, and the queue and matches being closed to everyone else.
import { afterAll, describe, expect, it } from "vitest";
import { admin, cleanup, guest, hasDb, makeUser } from "./helpers";

const season = () => {
  const d = new Date();
  return `${d.getUTCFullYear()}-Q${Math.floor(d.getUTCMonth() / 3) + 1}`;
};

describe.skipIf(!hasDb)("online ladder", () => {
  afterAll(cleanup);

  it("pairs, reports, confirms, rates, and keeps matches to their two players", async () => {
    // Pairing takes whoever is waiting; don't pair a real member who happens to be looking.
    const { count } = await admin.from("ladder_queue").select("user_id", { count: "exact", head: true }).eq("game", "pplus").gt("expires_at", new Date().toISOString());
    if (count) return;

    const [a, b, c] = await Promise.all([makeUser("LdAda"), makeUser("LdBen"), makeUser("LdCat")]);
    // Ada waits; a code with contact info is refused.
    expect((await a.c.rpc("ladder_find_match", { p_game: "pplus", p_connect: "add me on snapchat" })).error).not.toBeNull();
    const first = await a.c.rpc("ladder_find_match", { p_game: "pplus", p_connect: "ADA#111" });
    expect(first.error).toBeNull();
    expect(first.data).toBeNull();
    // Ben joins and is paired with Ada; Ada gets an alert.
    const paired = await b.c.rpc("ladder_find_match", { p_game: "pplus", p_connect: "BEN#222" });
    expect(paired.error).toBeNull();
    const id = paired.data as string;
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect((await a.c.rpc("ladder_find_match", { p_game: "pplus", p_connect: "ADA#111" })).data).toBe(id); // already in a match
    const { data: alert } = await admin.from("notifications").select("type, event_href").eq("user_id", a.id).eq("type", "ladder_match").maybeSingle();
    expect(alert?.event_href).toBe(`/ladder/match/${id}`);

    // Closed to direct reads and writes, for the players too; standings are public.
    for (const who of [a.c, b.c, c.c, guest()]) {
      expect((await who.from("ladder_matches").select("id").eq("id", id)).data ?? []).toEqual([]);
      expect((await who.from("ladder_queue").select("user_id")).data ?? []).toEqual([]);
      expect((await who.from("ladder_matches").update({ status: "confirmed" }).eq("id", id).select("id")).data ?? []).toEqual([]);
      expect((await who.from("ladder_ratings").insert({ season: season(), game: "pplus", user_id: a.id, rating: 3000 })).error).not.toBeNull();
    }
    // Someone else can't report or answer it; a bad score is refused.
    expect((await c.c.rpc("ladder_report", { p_match: id, p_mine: 2, p_theirs: 0 })).error?.message).toMatch(/isn't yours/);
    expect((await b.c.rpc("ladder_report", { p_match: id, p_mine: 2, p_theirs: 2 })).error).not.toBeNull();

    // Ben reports 2-1 for himself; he can't confirm his own report; Ada disputes, then both agree.
    expect((await b.c.rpc("ladder_report", { p_match: id, p_mine: 2, p_theirs: 1 })).error).toBeNull();
    expect((await b.c.rpc("ladder_answer", { p_match: id, p_agree: true })).error).not.toBeNull();
    expect((await a.c.rpc("ladder_answer", { p_match: id, p_agree: false })).error).toBeNull();
    expect((await admin.from("ladder_matches").select("status").eq("id", id).single()).data?.status).toBe("disputed");
    expect((await b.c.rpc("ladder_report", { p_match: id, p_mine: 2, p_theirs: 1 })).error).toBeNull();
    expect((await a.c.rpc("ladder_answer", { p_match: id, p_agree: true })).error).toBeNull();

    const { data: m } = await admin.from("ladder_matches").select("status, counted, p1, p1_score, p2_score, p1_change, p2_change").eq("id", id).single();
    expect(m).toMatchObject({ status: "confirmed", counted: true, p1: a.id, p1_score: 1, p2_score: 2, p1_change: -16, p2_change: 16 });
    const { data: board } = await guest().from("ladder_ratings").select("user_id, rating, wins, losses").eq("season", season()).eq("game", "pplus").in("user_id", [a.id, b.id]);
    expect(board?.find((r) => r.user_id === b.id)).toMatchObject({ rating: 1016, wins: 1, losses: 0 });
    expect(board?.find((r) => r.user_id === a.id)).toMatchObject({ rating: 984, wins: 0, losses: 1 });

    // Two more matches between the same pair today: the second still counts, the third doesn't.
    for (const expected of [true, false]) {
      await a.c.rpc("ladder_find_match", { p_game: "pplus", p_connect: "ADA#111" });
      const next = (await b.c.rpc("ladder_find_match", { p_game: "pplus", p_connect: "BEN#222" })).data as string;
      expect((await a.c.rpc("ladder_report", { p_match: next, p_mine: 2, p_theirs: 0 })).error).toBeNull();
      expect((await b.c.rpc("ladder_answer", { p_match: next, p_agree: true })).error).toBeNull();
      expect((await admin.from("ladder_matches").select("counted").eq("id", next).single()).data?.counted).toBe(expected);
    }

    // Calling a match off: it ends without counting; leaving the queue works.
    await a.c.rpc("ladder_find_match", { p_game: "pplus", p_connect: "ADA#111" });
    const off = (await c.c.rpc("ladder_find_match", { p_game: "pplus", p_connect: "CAT#333" })).data as string;
    expect((await c.c.rpc("ladder_cancel", { p_match: off })).error).toBeNull();
    expect((await admin.from("ladder_matches").select("status").eq("id", off).single()).data?.status).toBe("cancelled");
    expect((await a.c.rpc("ladder_find_match", { p_game: "pplus", p_connect: "ADA#111" })).data).toBeNull();
    expect((await a.c.rpc("ladder_leave_queue")).error).toBeNull();
    expect((await admin.from("ladder_queue").select("user_id").eq("user_id", a.id)).data).toEqual([]);
    expect((await guest().rpc("ladder_find_match", { p_game: "pplus", p_connect: "X#1" })).error).not.toBeNull();
  });
});
