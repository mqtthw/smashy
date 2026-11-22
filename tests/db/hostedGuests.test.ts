// Walk-ins: the host adds players without a Smashy account; only the host can, and only before the bracket.
import { afterAll, describe, expect, it } from "vitest";
import { admin, cleanup, guest, hasDb, makeUser } from "./helpers";

const inHours = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();

describe.skipIf(!hasDb)("hosted event walk-ins", () => {
  afterAll(cleanup);

  it("only the host adds walk-ins; they're public, checked in and count toward the cap", async () => {
    const [host, a, b] = await Promise.all([makeUser("HgHost"), makeUser("HgA"), makeUser("HgB")]);
    const { data: ev } = await host.c.from("hosted_events").insert({ host_id: host.id, name: "Walk-in test", game: "melee", starts_at: inHours(48), entrant_cap: 2 }).select("id").single();
    expect((await a.c.rpc("host_add_guest", { ev: ev!.id, guest_tag: "Sneaky" })).error).not.toBeNull(); // not the host
    const added = await host.c.rpc("host_add_guest", { ev: ev!.id, guest_tag: "  Walky  " });
    expect(added.error).toBeNull();
    expect((await host.c.rpc("host_add_guest", { ev: ev!.id, guest_tag: "walky" })).error).not.toBeNull(); // same tag twice
    const { data: rows } = await guest().from("hosted_guests").select("id, tag, checked_in_at").eq("event_id", ev!.id);
    expect(rows).toHaveLength(1);
    expect(rows![0].tag).toBe("Walky");
    expect(rows![0].checked_in_at).not.toBeNull();
    // Cap 2: one walk-in + one sign-up fills it.
    expect((await a.c.rpc("join_hosted_event", { ev: ev!.id })).error).toBeNull();
    expect((await b.c.rpc("join_hosted_event", { ev: ev!.id })).error?.message).toMatch(/full/);
    expect((await host.c.rpc("host_add_guest", { ev: ev!.id, guest_tag: "Another" })).error?.message).toMatch(/full/);
    // Nobody can write the table directly.
    expect((await host.c.from("hosted_guests").insert({ event_id: ev!.id, tag: "Direct" })).error).not.toBeNull();
    // Seeding and removal cover walk-ins.
    const gid = added.data as string;
    expect((await host.c.rpc("host_set_seeds", { ev: ev!.id, ordered: [gid, a.id] })).error).toBeNull();
    expect((await admin.from("hosted_guests").select("seed").eq("id", gid).single()).data?.seed).toBe(1);
    expect((await a.c.rpc("host_remove_entrant", { ev: ev!.id, person: gid })).error).not.toBeNull();
    expect((await host.c.rpc("host_remove_entrant", { ev: ev!.id, person: gid })).error).toBeNull();
    expect((await admin.from("hosted_guests").select("id").eq("event_id", ev!.id)).data).toEqual([]);
  });

  it("no walk-ins once the bracket has started", async () => {
    const host = await makeUser("HgHost2");
    const { data: ev } = await host.c.from("hosted_events").insert({ host_id: host.id, name: "Started test", game: "melee", starts_at: inHours(48) }).select("id").single();
    await admin.from("hosted_events").update({ status: "in_progress" }).eq("id", ev!.id);
    expect((await host.c.rpc("host_add_guest", { ev: ev!.id, guest_tag: "Late" })).error).not.toBeNull();
  });
});
