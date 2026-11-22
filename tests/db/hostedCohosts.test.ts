// Co-TOs: the host adds helpers who can run the event (walk-ins, check-in, seeding) but not edit it.
import { afterAll, describe, expect, it } from "vitest";
import { admin, cleanup, guest, hasDb, makeUser } from "./helpers";

const inHours = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();

describe.skipIf(!hasDb)("hosted event co-TOs", () => {
  afterAll(cleanup);

  it("only the host adds co-TOs; co-TOs run the event but can't edit it or add more", async () => {
    const [host, co, player, other] = await Promise.all([makeUser("HcHost"), makeUser("HcCo"), makeUser("HcPlayer"), makeUser("HcOther")]);
    const { data: ev } = await host.c.from("hosted_events").insert({ host_id: host.id, name: "Co-TO test", game: "melee", starts_at: inHours(48), checkin_minutes: 30 }).select("id").single();
    expect((await other.c.rpc("host_add_cohost", { ev: ev!.id, person: other.id })).error).not.toBeNull(); // not the host
    expect((await host.c.rpc("host_add_cohost", { ev: ev!.id, person: co.id })).error).toBeNull();
    expect((await guest().from("hosted_cohosts").select("user_id").eq("event_id", ev!.id)).data).toEqual([{ user_id: co.id }]);
    expect((await co.c.rpc("host_add_cohost", { ev: ev!.id, person: other.id })).error).not.toBeNull(); // co-TOs can't add more

    // Running it: walk-ins, check-in, seeding.
    await player.c.rpc("join_hosted_event", { ev: ev!.id });
    const walk = await co.c.rpc("host_add_guest", { ev: ev!.id, guest_tag: "CoWalk" });
    expect(walk.error).toBeNull();
    expect((await co.c.rpc("host_check_in", { ev: ev!.id, person: player.id })).error).toBeNull();
    expect((await co.c.rpc("host_set_seeds", { ev: ev!.id, ordered: [walk.data as string, player.id] })).error).toBeNull();
    expect((await other.c.rpc("host_check_in", { ev: ev!.id, person: player.id })).error).not.toBeNull();

    // Not editing: the event row stays the host's.
    const { data: edited } = await co.c.from("hosted_events").update({ name: "Hijacked" }).eq("id", ev!.id).select("id");
    expect(edited ?? []).toEqual([]);
    expect((await admin.from("hosted_events").select("name").eq("id", ev!.id).single()).data?.name).toBe("Co-TO test");

    // A co-TO can step down; nobody else can remove them.
    expect((await other.c.rpc("host_remove_cohost", { ev: ev!.id, person: co.id })).error).not.toBeNull();
    expect((await co.c.rpc("host_remove_cohost", { ev: ev!.id, person: co.id })).error).toBeNull();
    expect((await co.c.rpc("host_check_in", { ev: ev!.id, person: player.id })).error).not.toBeNull(); // no longer a co-TO
  });

  it("at most 5 co-TOs, not the host themselves, nobody writes the table directly", async () => {
    const [host, ...rest] = await Promise.all([makeUser("HcH2"), makeUser("Hc1"), makeUser("Hc2"), makeUser("Hc3"), makeUser("Hc4"), makeUser("Hc5"), makeUser("Hc6")]);
    const { data: ev } = await host.c.from("hosted_events").insert({ host_id: host.id, name: "Co-TO cap", game: "melee", starts_at: inHours(48) }).select("id").single();
    expect((await host.c.rpc("host_add_cohost", { ev: ev!.id, person: host.id })).error).not.toBeNull();
    for (const u of rest.slice(0, 5)) expect((await host.c.rpc("host_add_cohost", { ev: ev!.id, person: u.id })).error).toBeNull();
    expect((await host.c.rpc("host_add_cohost", { ev: ev!.id, person: rest[5].id })).error?.message).toMatch(/5 co-TOs/);
    expect((await rest[5].c.from("hosted_cohosts").insert({ event_id: ev!.id, user_id: rest[5].id })).error).not.toBeNull();
  });
});
