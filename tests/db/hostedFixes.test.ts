// Hosted events fixes: series belong to their host, connect codes stay private, hosts can check people in.
import { afterAll, describe, expect, it } from "vitest";
import { admin, cleanup, guest, hasDb, makeUser } from "./helpers";

const inHours = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();

describe.skipIf(!hasDb)("hosted events fixes", () => {
  afterAll(cleanup);

  it("only a series' host can add editions to it", async () => {
    const [host, other] = await Promise.all([makeUser("HfHost"), makeUser("HfOther")]);
    const { data: first } = await host.c.from("hosted_events").insert({ host_id: host.id, name: "Weekly #1", game: "melee", starts_at: inHours(48) }).select("id").single();
    expect((await other.c.from("hosted_events").insert({ host_id: other.id, name: "Fake #2", game: "melee", starts_at: inHours(72), series_id: first!.id })).error).not.toBeNull();
    expect((await host.c.from("hosted_events").insert({ host_id: host.id, name: "Weekly #2", game: "melee", starts_at: inHours(72), series_id: first!.id })).error).toBeNull();
  });

  it("connect codes: only your own is readable; sign-ups (and their count) stay public", async () => {
    const [host, a, b] = await Promise.all([makeUser("HfH2"), makeUser("HfA"), makeUser("HfB")]);
    const { data: ev } = await host.c.from("hosted_events").insert({ host_id: host.id, name: "Codes test", game: "melee", starts_at: inHours(48) }).select("id").single();
    await a.c.rpc("join_hosted_event", { ev: ev!.id });
    await b.c.rpc("join_hosted_event", { ev: ev!.id });
    expect((await a.c.from("hosted_connect_codes").insert({ event_id: ev!.id, user_id: a.id, code: "ABCD#12" })).error).toBeNull();
    expect((await a.c.from("hosted_connect_codes").update({ code: "ABCD#123" }).eq("event_id", ev!.id).eq("user_id", a.id)).error).toBeNull();
    expect((await a.c.from("hosted_connect_codes").select("code").eq("event_id", ev!.id)).data).toEqual([{ code: "ABCD#123" }]);
    expect((await b.c.from("hosted_connect_codes").select("code").eq("event_id", ev!.id)).data).toEqual([]); // not B's
    expect((await host.c.from("hosted_connect_codes").insert({ event_id: ev!.id, user_id: host.id, code: "HOST#1" })).error).not.toBeNull(); // not signed up
    expect((await a.c.from("hosted_connect_codes").update({ code: "214 555 1234" }).eq("event_id", ev!.id).eq("user_id", a.id)).error).not.toBeNull(); // no phone numbers
    const { data: counted, error } = await guest().from("hosted_events").select("id, entrants:hosted_entrants ( count )").eq("id", ev!.id).single();
    expect(error).toBeNull();
    expect((counted as unknown as { entrants: { count: number }[] }).entrants[0].count).toBe(2);
  });

  it("hosts can check someone in before the bracket; others can't", async () => {
    const [host, a] = await Promise.all([makeUser("HfH3"), makeUser("HfA3")]);
    const { data: ev } = await host.c.from("hosted_events").insert({ host_id: host.id, name: "Check-in test", game: "melee", starts_at: inHours(48), checkin_minutes: 30 }).select("id").single();
    await a.c.rpc("join_hosted_event", { ev: ev!.id });
    expect((await a.c.rpc("host_check_in", { ev: ev!.id, person: a.id })).error).not.toBeNull();
    expect((await host.c.rpc("host_check_in", { ev: ev!.id, person: a.id })).error).toBeNull();
    expect((await admin.from("hosted_entrants").select("checked_in_at").eq("event_id", ev!.id).eq("user_id", a.id).single()).data?.checked_in_at).not.toBeNull();
  });
});
