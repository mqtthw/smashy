// Seasons: the tables are server-only (members and guests can't read or write them directly), and the
// database keeps a season's rules (dates in order, a points table, one copy of each event).
import { readFileSync } from "node:fs";
import { afterAll, describe, expect, it, vi } from "vitest";
import { admin, cleanup, guest, hasDb, makeUser } from "./helpers";

vi.mock("server-only", () => ({}));
// The standings code reads the server's settings (like the bot test does).
for (const line of (() => { try { return readFileSync(new URL("../../.env.local", import.meta.url), "utf8").split(/\r?\n/); } catch { return []; } })()) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

describe.skipIf(!hasDb)("seasons", () => {
  const made: string[] = [];
  afterAll(async () => {
    if (made.length) await admin.from("seasons").delete().in("id", made);
    await cleanup();
  });

  it("keeps the season tables away from members and guests", async () => {
    const owner = await makeUser("SeasonOwner");
    const { data: s, error } = await admin.from("seasons").insert({ owner_id: owner.id, name: "TestDb Season", game: "melee", starts_on: "2026-09-01", ends_on: "2026-11-30", points: [[1, 100], [2, 80]] }).select("id").single();
    expect(error).toBeNull();
    made.push(s!.id);
    for (const table of ["seasons", "season_admins", "season_events", "season_players"]) {
      expect((await owner.c.from(table).select("*").limit(1)).error, table).not.toBeNull();
      expect((await guest().from(table).select("*").limit(1)).error, table).not.toBeNull();
    }
    expect((await owner.c.from("seasons").update({ name: "Hacked" }).eq("id", s!.id)).error).not.toBeNull();
    expect((await owner.c.from("season_admins").insert({ season_id: s!.id, user_id: owner.id })).error).not.toBeNull();
  });

  it("checks dates, the points table and duplicate events", async () => {
    const owner = await makeUser("SeasonRules");
    const base = { owner_id: owner.id, name: "TestDb Rules", game: "melee", points: [[1, 100]] };
    expect((await admin.from("seasons").insert({ ...base, starts_on: "2026-09-01", ends_on: "2026-08-01" })).error).not.toBeNull();
    expect((await admin.from("seasons").insert({ ...base, starts_on: "2026-09-01", ends_on: "2026-10-01", points: {} })).error).not.toBeNull();
    const { data: s } = await admin.from("seasons").insert({ ...base, starts_on: "2026-09-01", ends_on: "2026-10-01" }).select("id").single();
    made.push(s!.id);
    const ev = { season_id: s!.id, source: "startgg", ref: "123", name: "Weekly 1", held_on: "2026-09-05", results: [{ key: "s:1", name: "A", place: 1 }] };
    expect((await admin.from("season_events").insert(ev)).error).toBeNull();
    expect((await admin.from("season_events").insert(ev)).error?.code).toBe("23505");
    expect((await admin.from("season_events").insert({ ...ev, ref: "124", weight: 9 })).error).not.toBeNull();
    // Deleting the season takes its events with it.
    await admin.from("seasons").delete().eq("id", s!.id);
    expect((await admin.from("season_events").select("id").eq("season_id", s!.id)).data).toHaveLength(0);
  });

  it("hides teens from visitors only, and marks them for the public copy", async () => {
    const { getStandings, getSeasonEvents, getSeason } = await import("@/lib/seasons");
    const [owner, teen] = await Promise.all([makeUser("SeasonAdult"), makeUser("SeasonTeen", { teen: true })]);
    const { data: s } = await admin.from("seasons").insert({ owner_id: owner.id, name: "TestDb Teen Season", game: "melee", starts_on: "2026-01-01", ends_on: "2026-12-31", points: [[1, 100], [2, 70]] }).select("id").single();
    made.push(s!.id);
    await admin.from("season_events").insert({ season_id: s!.id, source: "startgg", ref: "999000444", name: "TestDb Weekly", held_on: "2026-11-12", results: [{ key: `u:${owner.id}`, name: "TestDbSeasonAdult", place: 1 }, { key: `u:${teen.id}`, name: "TestDbSeasonTeen", place: 2 }] });
    const season = (await getSeason(s!.id))!;
    const events = await getSeasonEvents(season.id);
    const byKey = (rows: { key: string; hidden: boolean; hiddenFromGuests: boolean }[], id: string) => rows.find((r) => r.key === `u:${id}`)!;
    const guestRows = await getStandings(season, events, null);
    expect(byKey(guestRows, teen.id).hidden).toBe(true);
    expect(byKey(guestRows, owner.id).hidden).toBe(false);
    const memberRows = await getStandings(season, events, owner.id);
    expect(byKey(memberRows, teen.id).hidden).toBe(false);
    expect(byKey(memberRows, teen.id).hiddenFromGuests).toBe(true);
    expect(byKey(memberRows, owner.id).hiddenFromGuests).toBe(false);
  });
});
