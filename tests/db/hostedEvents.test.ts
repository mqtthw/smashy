// Hosted events phase 1: creating, signing up, cap, check-in window, seeding, blocks, privacy.
import { afterAll, describe, expect, it } from "vitest";
import { admin, cleanup, guest, hasDb, makeUser } from "./helpers";

const inHours = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();

describe.skipIf(!hasDb)("hosted events", () => {
  afterAll(cleanup);

  it("hosts create events; players join until full; only the host seeds or removes", async () => {
    const [host, a, b, c] = await Promise.all(["HeHost", "HeA", "HeB", "HeC"].map((l) => makeUser(l)));
    const { data: ev, error } = await host.c
      .from("hosted_events")
      .insert({ host_id: host.id, name: "Test Netplay #1", game: "melee", starts_at: inHours(48), entrant_cap: 2, checkin_minutes: 30 })
      .select("id")
      .single();
    expect(error).toBeNull();
    // Someone else can't create an event in the host's name, or edit it.
    expect((await a.c.from("hosted_events").insert({ host_id: host.id, name: "Fake", game: "melee", starts_at: inHours(48) })).error).not.toBeNull();
    await a.c.from("hosted_events").update({ name: "Hijacked" }).eq("id", ev!.id);
    expect((await admin.from("hosted_events").select("name").eq("id", ev!.id).single()).data?.name).toBe("Test Netplay #1");

    expect((await a.c.rpc("join_hosted_event", { ev: ev!.id })).error).toBeNull();
    expect((await b.c.rpc("join_hosted_event", { ev: ev!.id })).error).toBeNull();
    expect((await c.c.rpc("join_hosted_event", { ev: ev!.id })).error?.message).toMatch(/full/);
    // Players can't insert entrant rows directly (only through the function).
    expect((await c.c.from("hosted_entrants").insert({ event_id: ev!.id, user_id: c.id })).error).not.toBeNull();

    // Check-in isn't open two days early.
    expect((await a.c.rpc("check_in_hosted_event", { ev: ev!.id })).error?.message).toMatch(/opens/);

    // Seeding: host only.
    expect((await a.c.rpc("host_set_seeds", { ev: ev!.id, ordered: [a.id, b.id] })).error).not.toBeNull();
    expect((await host.c.rpc("host_set_seeds", { ev: ev!.id, ordered: [b.id, a.id] })).error).toBeNull();
    const { data: seeds } = await admin.from("hosted_entrants").select("user_id, seed").eq("event_id", ev!.id).order("seed");
    expect(seeds?.map((s) => s.user_id)).toEqual([b.id, a.id]);

    // Withdraw, then the host removes the other player.
    expect((await a.c.rpc("leave_hosted_event", { ev: ev!.id })).error).toBeNull();
    expect((await a.c.rpc("host_remove_entrant", { ev: ev!.id, person: b.id })).error).not.toBeNull();
    expect((await host.c.rpc("host_remove_entrant", { ev: ev!.id, person: b.id })).error).toBeNull();
    expect((await admin.from("hosted_entrants").select("user_id").eq("event_id", ev!.id)).data).toEqual([]);

    // Guests can see the event.
    expect((await guest().from("hosted_events").select("name").eq("id", ev!.id).single()).data?.name).toBe("Test Netplay #1");
  });

  it("check-in opens in the window; closed sign-ups and blocks are refused; past starts are refused", async () => {
    const [host, a, blocked] = await Promise.all(["HeHost2", "HeA2", "HeBlk"].map((l) => makeUser(l)));
    // Starts in 20 minutes with a 30-minute check-in window: check-in is open now.
    const { data: ev } = await host.c
      .from("hosted_events")
      .insert({ host_id: host.id, name: "Soon Event", game: "ultimate", starts_at: inHours(20 / 60), checkin_minutes: 30 })
      .select("id")
      .single();
    expect((await a.c.rpc("join_hosted_event", { ev: ev!.id })).error).toBeNull();
    expect((await a.c.rpc("check_in_hosted_event", { ev: ev!.id })).error).toBeNull();
    expect((await admin.from("hosted_entrants").select("checked_in_at").eq("event_id", ev!.id).eq("user_id", a.id).single()).data?.checked_in_at).not.toBeNull();

    await admin.from("blocks").insert({ blocker_id: host.id, blocked_id: blocked.id });
    expect((await blocked.c.rpc("join_hosted_event", { ev: ev!.id })).error).not.toBeNull();

    await host.c.from("hosted_events").update({ status: "closed" }).eq("id", ev!.id);
    const late = await makeUser("HeLate");
    expect((await late.c.rpc("join_hosted_event", { ev: ev!.id })).error?.message).toMatch(/closed/);

    expect((await host.c.from("hosted_events").insert({ host_id: host.id, name: "Past", game: "melee", starts_at: inHours(-1) })).error).not.toBeNull();
  });

  it("teens can't put contact info in event details", async () => {
    const teen = await makeUser("HeTeen", { teen: true });
    const { error } = await teen.c.from("hosted_events").insert({ host_id: teen.id, name: "Text me 214 555 1234", game: "melee", starts_at: inHours(48) });
    expect(error).not.toBeNull();
  });
});
