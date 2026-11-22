// The waitlist for a full event (who can wait, and who moves up when a spot opens), and the TO's
// "who has paid" ticks (closed to everyone but the server).
import { afterAll, describe, expect, it } from "vitest";
import { admin, cleanup, guest, hasDb, makeUser } from "./helpers";

const inHours = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();
const entrants = async (ev: string) => ((await admin.from("hosted_entrants").select("user_id").eq("event_id", ev)).data ?? []).map((r) => r.user_id as string);
const waiting = async (ev: string) => ((await admin.from("hosted_waitlist").select("user_id").eq("event_id", ev).order("created_at")).data ?? []).map((r) => r.user_id as string);

describe.skipIf(!hasDb)("waitlist and who has paid", () => {
  afterAll(cleanup);

  it("lets people wait for a full event and moves the first in line up when a spot opens", async () => {
    const [host, a, b, c, d, e] = await Promise.all([makeUser("WlHost"), makeUser("WlAda"), makeUser("WlBen"), makeUser("WlCy"), makeUser("WlDee"), makeUser("WlEli")]);
    const { data: ev } = await host.c.from("hosted_events").insert({ host_id: host.id, name: "Waitlist test", game: "melee", starts_at: inHours(48), entrant_cap: 2, checkin_minutes: 0 }).select("id").single();
    const id = ev!.id as string;

    // Not while there's room; then the event fills up.
    expect((await c.c.rpc("join_hosted_waitlist", { ev: id })).error?.message).toMatch(/room/);
    await a.c.rpc("join_hosted_event", { ev: id });
    await b.c.rpc("join_hosted_event", { ev: id });
    expect((await c.c.rpc("join_hosted_event", { ev: id })).error?.message).toMatch(/full/);

    // Cy, then Dee, get in line (twice is harmless). Someone already in can't.
    expect((await c.c.rpc("join_hosted_waitlist", { ev: id })).error).toBeNull();
    expect((await c.c.rpc("join_hosted_waitlist", { ev: id })).error).toBeNull();
    expect((await d.c.rpc("join_hosted_waitlist", { ev: id })).error).toBeNull();
    expect((await a.c.rpc("join_hosted_waitlist", { ev: id })).error?.message).toMatch(/already in/);
    expect(await waiting(id)).toEqual([c.id, d.id]);
    expect((await guest().from("hosted_waitlist").select("user_id").eq("event_id", id)).data).toHaveLength(2); // the line is public
    expect((await d.c.from("hosted_waitlist").insert({ event_id: id, user_id: e.id })).error).not.toBeNull(); // nobody writes it directly

    // Ben withdraws: Cy (first in line) is in, and is told.
    expect((await b.c.rpc("leave_hosted_event", { ev: id })).error).toBeNull();
    expect((await entrants(id)).sort()).toEqual([a.id, c.id].sort());
    expect(await waiting(id)).toEqual([d.id]);
    const { data: told } = await admin.from("notifications").select("event_name, event_href").eq("user_id", c.id).eq("type", "event_update");
    expect(told).toEqual([{ event_name: "A spot opened up: you're in Waitlist test. Tap to see it, or to withdraw", event_href: `/host/${id}` }]);

    // The host removes Ada: Dee is in.
    expect((await host.c.rpc("host_remove_entrant", { ev: id, person: a.id })).error).toBeNull();
    expect((await entrants(id)).sort()).toEqual([c.id, d.id].sort());
    expect(await waiting(id)).toEqual([]);

    // Full again; Eli waits, changes their mind, waits again; the host raises the cap and Eli is in.
    expect((await e.c.rpc("join_hosted_waitlist", { ev: id })).error).toBeNull();
    expect((await e.c.rpc("leave_hosted_waitlist", { ev: id })).error).toBeNull();
    expect(await waiting(id)).toEqual([]);
    expect((await e.c.rpc("join_hosted_waitlist", { ev: id })).error).toBeNull();
    expect((await host.c.from("hosted_events").update({ entrant_cap: 3 }).eq("id", id).select("id")).error).toBeNull();
    expect((await entrants(id)).sort()).toEqual([c.id, d.id, e.id].sort());
    expect(await waiting(id)).toEqual([]);
  });

  it("has no waitlist once sign-ups are closed, or for a doubles event", async () => {
    const [host, a, b, c] = await Promise.all([makeUser("WlHost2"), makeUser("WlFay"), makeUser("WlGus"), makeUser("WlHal")]);
    const { data: ev } = await host.c.from("hosted_events").insert({ host_id: host.id, name: "Waitlist closed", game: "melee", starts_at: inHours(48), entrant_cap: 2 }).select("id").single();
    await a.c.rpc("join_hosted_event", { ev: ev!.id });
    await b.c.rpc("join_hosted_event", { ev: ev!.id });
    await host.c.from("hosted_events").update({ status: "closed" }).eq("id", ev!.id);
    expect((await c.c.rpc("join_hosted_waitlist", { ev: ev!.id })).error?.message).toMatch(/closed/);

    const { data: dbl } = await host.c.from("hosted_events").insert({ host_id: host.id, name: "Waitlist doubles", game: "melee", starts_at: inHours(48), entrant_cap: 2, team_size: 2 }).select("id").single();
    expect((await c.c.rpc("join_hosted_waitlist", { ev: dbl!.id })).error?.message).toMatch(/Doubles/);
  });

  it("keeps who has paid closed to everyone but the server", async () => {
    const [host, a, other] = await Promise.all([makeUser("WlHost3"), makeUser("WlIvy"), makeUser("WlJon")]);
    const { data: ev } = await host.c.from("hosted_events").insert({ host_id: host.id, name: "Paid test", game: "melee", starts_at: inHours(48) }).select("id").single();
    await a.c.rpc("join_hosted_event", { ev: ev!.id });
    expect((await admin.from("hosted_paid").insert({ event_id: ev!.id, entry_id: a.id, marked_by: host.id })).error).toBeNull();

    // Not the player, not a stranger, not a signed-out visitor, and not even the host through the API.
    for (const who of [a.c, other.c, host.c, guest()]) {
      const read = await who.from("hosted_paid").select("entry_id").eq("event_id", ev!.id);
      expect(read.data ?? []).toEqual([]);
      expect((await who.from("hosted_paid").insert({ event_id: ev!.id, entry_id: other.id })).error).not.toBeNull();
    }

    // Removing the player takes their tick with them.
    expect((await host.c.rpc("host_remove_entrant", { ev: ev!.id, person: a.id })).error).toBeNull();
    expect((await admin.from("hosted_paid").select("entry_id").eq("event_id", ev!.id)).data).toEqual([]);
  });
});
