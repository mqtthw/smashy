// Seasons, the whole path with a Smashy bracket: it finishes and its host (a season admin) is offered it
// once; added, it shows its placements; the player's rank shows on their pages; the event says which
// season it counts toward; a teen's rank is shown only to signed-in viewers.
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { admin, cleanup, hasDb, makeUser, type TestUser } from "./helpers";

vi.mock("server-only", () => ({}));

// The site's own code reads its keys from the environment.
for (const line of (() => { try { return readFileSync(new URL("../../.env.local", import.meta.url), "utf8").split(/\r?\n/); } catch { return []; } })()) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

describe.skipIf(!hasDb)("seasons with a Smashy bracket", () => {
  let host: TestUser, adult: TestUser, teen: TestUser;
  let eventId = "";
  let seasonId = "";

  beforeAll(async () => {
    [host, adult, teen] = await Promise.all([makeUser("SeasonHost"), makeUser("SeasonAdult"), makeUser("SeasonTeen", { teen: true })]);
    const day = new Date(Date.now() - 2 * 86400_000).toISOString();
    // New events must start in the future: made for tomorrow, then moved back as if it ran two days ago.
    const { data: ev, error } = await admin.from("hosted_events").insert({ host_id: host.id, name: "TestDb Season Weekly", game: "melee", starts_at: new Date(Date.now() + 86400_000).toISOString() }).select("id").single();
    if (error) throw error;
    eventId = ev!.id;
    const moved = await admin.from("hosted_events").update({ starts_at: day, status: "completed" }).eq("id", eventId);
    if (moved.error) throw moved.error;
    await admin.from("hosted_entrants").insert([
      { event_id: eventId, user_id: adult.id, placement: 1 },
      { event_id: eventId, user_id: teen.id, placement: 2 },
    ]);
    await admin.from("hosted_guests").insert({ event_id: eventId, tag: "Walky", placement: 3 });
    const today = new Date();
    const { data: s } = await admin.from("seasons").insert({
      owner_id: host.id, name: "TestDb Flow Season", game: "melee", points: [[1, 100], [2, 80], [3, 65]],
      starts_on: new Date(today.getTime() - 30 * 86400_000).toISOString().slice(0, 10), ends_on: new Date(today.getTime() + 30 * 86400_000).toISOString().slice(0, 10),
    }).select("id").single();
    seasonId = s!.id;
  });

  afterAll(async () => {
    if (seasonId) await admin.from("seasons").delete().eq("id", seasonId);
    await cleanup();
  });

  it("offers the finished bracket to the host's season, once", async () => {
    const { offerToSeasons } = await import("@/lib/seasons");
    await offerToSeasons(eventId);
    await offerToSeasons(eventId);
    const { data } = await admin.from("notifications").select("event_name, event_href").eq("user_id", host.id).eq("type", "event_update");
    expect(data).toHaveLength(1);
    expect(data![0].event_href).toBe(`/seasons/${seasonId}/manage?add=${eventId}#events`);
    expect(data![0].event_name).toContain("TestDb Season Weekly");
  });

  it("adds it with its placements, ranks players, and keeps teens' ranks from guests", async () => {
    const { resultsFromSmashy, seasonRanksFor, seasonsCounting, offerToSeasons, seasonsToAdd } = await import("@/lib/seasons");
    const { getHostedEvent } = await import("@/lib/hostedEvents");
    const ev = (await getHostedEvent(eventId, admin))!;
    // The host can add it to their season (and someone else can't); once added, no more button.
    expect(await seasonsToAdd(ev, host.id)).toEqual([{ id: seasonId, name: "TestDb Flow Season" }]);
    expect(await seasonsToAdd(ev, adult.id)).toEqual([]);
    const found = await resultsFromSmashy(eventId, "melee");
    if (typeof found === "string") throw new Error(found);
    expect(found.results.map((r) => [r.key, r.place]).sort((a, b) => Number(a[1]) - Number(b[1]))).toEqual([[`u:${adult.id}`, 1], [`u:${teen.id}`, 2], ["g:walky", 3]]);
    expect(await resultsFromSmashy(eventId, "ultimate")).toBe("wrongGame");
    await admin.from("season_events").insert({ season_id: seasonId, source: found.source, ref: found.ref, name: found.name, held_on: found.heldOn, entrants: found.entrants, results: found.results });

    expect(await seasonRanksFor([`u:${adult.id}`], null)).toEqual([expect.objectContaining({ seasonId, rank: 1, players: 3, points: 100, current: true })]);
    expect(await seasonRanksFor([`u:${teen.id}`], null)).toEqual([]); // a guest
    expect(await seasonRanksFor([`u:${teen.id}`], host.id)).toEqual([expect.objectContaining({ rank: 2 })]);
    expect(await seasonsCounting("smashy", [eventId])).toEqual([{ id: seasonId, name: "TestDb Flow Season" }]);
    expect(await seasonsToAdd(ev, host.id)).toEqual([]);

    // Already in the season: no new offer.
    await admin.from("notifications").delete().eq("user_id", host.id).eq("type", "event_update");
    await offerToSeasons(eventId);
    expect((await admin.from("notifications").select("id").eq("user_id", host.id).eq("type", "event_update")).data).toHaveLength(0);
  });
});
