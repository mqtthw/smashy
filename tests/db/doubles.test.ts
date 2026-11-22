// Doubles: the entries are teams of two. Who can make a team, who it shows to, and who can change it.
import { afterAll, describe, expect, it } from "vitest";
import { admin, cleanup, guest, hasDb, makeUser } from "./helpers";

const inHours = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();

describe.skipIf(!hasDb)("doubles events", () => {
  afterAll(cleanup);

  it("takes sign-ups as teams: one team each, checked in and left by either member", async () => {
    const [host, a, b, c] = await Promise.all([makeUser("DbHost"), makeUser("DbAda"), makeUser("DbBen"), makeUser("DbCy")]);
    const { data: ev, error } = await host.c.from("hosted_events").insert({ host_id: host.id, name: "Doubles test", game: "melee", starts_at: inHours(48), team_size: 2, checkin_minutes: 0 }).select("id, team_size").single();
    expect(error).toBeNull();
    expect(ev!.team_size).toBe(2);

    // Signing up alone is refused; so is a single walk-in.
    expect((await a.c.rpc("join_hosted_event", { ev: ev!.id })).error?.message).toMatch(/doubles/);
    expect((await host.c.rpc("host_add_guest", { ev: ev!.id, guest_tag: "Solo" })).error?.message).toMatch(/doubles/);

    // Ada signs up with Ben (an account): one entry named after both, with both as members.
    const team = await a.c.rpc("join_hosted_team", { ev: ev!.id, partner: b.id, partner_name: null });
    expect(team.error).toBeNull();
    const { data: row } = await guest().from("hosted_guests").select("id, tag, checked_in_at").eq("event_id", ev!.id).single();
    expect(row).toMatchObject({ id: team.data, tag: "TestDbDbAda / TestDbDbBen", checked_in_at: null });
    const { data: members } = await guest().from("hosted_team_members").select("slot, user_id, name").eq("guest_id", team.data as string).order("slot");
    expect(members).toEqual([
      { slot: 1, user_id: a.id, name: "TestDbDbAda" },
      { slot: 2, user_id: b.id, name: "TestDbDbBen" },
    ]);

    // One team per person: neither can be on another, as the one signing up or as the partner.
    expect((await b.c.rpc("join_hosted_team", { ev: ev!.id, partner: null, partner_name: "Someone" })).error?.message).toMatch(/already on a team/);
    expect((await c.c.rpc("join_hosted_team", { ev: ev!.id, partner: a.id, partner_name: null })).error?.message).toMatch(/already on a team/);
    expect((await c.c.rpc("join_hosted_team", { ev: ev!.id, partner: c.id, partner_name: null })).error?.message).toMatch(/someone else/);

    // The partner (who didn't press anything) can check the team in, and can leave: the team goes.
    expect((await b.c.rpc("check_in_hosted_team", { ev: ev!.id })).error).toBeNull();
    expect((await admin.from("hosted_guests").select("checked_in_at").eq("id", team.data as string).single()).data?.checked_in_at).not.toBeNull();
    expect((await c.c.rpc("leave_hosted_team", { ev: ev!.id })).error).toBeNull(); // not on a team: nothing happens
    expect((await admin.from("hosted_guests").select("id").eq("event_id", ev!.id)).data).toHaveLength(1);
    expect((await b.c.rpc("leave_hosted_team", { ev: ev!.id })).error).toBeNull();
    expect((await admin.from("hosted_guests").select("id").eq("event_id", ev!.id)).data).toEqual([]);
    expect((await admin.from("hosted_team_members").select("slot").eq("event_id", ev!.id)).data).toEqual([]);

    // Nobody writes teams directly.
    expect((await a.c.from("hosted_team_members").insert({ guest_id: team.data, event_id: ev!.id, slot: 1, user_id: a.id, name: "X" })).error).not.toBeNull();
  });

  it("takes a partner by name, and teams typed by the host; a singles event takes neither", async () => {
    const [host, a, other] = await Promise.all([makeUser("DbHost2"), makeUser("DbDee"), makeUser("DbEli")]);
    const { data: ev } = await host.c.from("hosted_events").insert({ host_id: host.id, name: "Doubles names", game: "melee", starts_at: inHours(48), team_size: 2 }).select("id").single();

    const mine = await a.c.rpc("join_hosted_team", { ev: ev!.id, partner: null, partner_name: "  Walkin   Wes " });
    expect(mine.error).toBeNull();
    expect((await guest().from("hosted_guests").select("tag").eq("id", mine.data as string).single()).data?.tag).toBe("TestDbDbDee / Walkin Wes");
    expect((await other.c.rpc("join_hosted_team", { ev: ev!.id, partner: null, partner_name: "" })).error?.message).toMatch(/1–30/);

    // The host types two names: a team that's already checked in, with nobody's account on it.
    const typed = await host.c.rpc("host_add_team", { ev: ev!.id, name1: "Fox Guy", name2: "Marth Main" });
    expect(typed.error).toBeNull();
    const { data: t } = await guest().from("hosted_guests").select("tag, checked_in_at").eq("id", typed.data as string).single();
    expect(t?.tag).toBe("Fox Guy / Marth Main");
    expect(t?.checked_in_at).not.toBeNull();
    expect((await host.c.rpc("host_add_team", { ev: ev!.id, name1: "fox guy", name2: "marth main" })).error?.message).toMatch(/already/);
    expect((await other.c.rpc("host_add_team", { ev: ev!.id, name1: "A", name2: "B" })).error).not.toBeNull(); // not the host

    // The host can remove a team like any entry, and seed them.
    expect((await host.c.rpc("host_set_seeds", { ev: ev!.id, ordered: [typed.data as string, mine.data as string] })).error).toBeNull();
    expect((await host.c.rpc("host_remove_entrant", { ev: ev!.id, person: typed.data as string })).error).toBeNull();
    expect((await admin.from("hosted_guests").select("id").eq("event_id", ev!.id)).data).toHaveLength(1);

    const { data: singles } = await host.c.from("hosted_events").insert({ host_id: host.id, name: "Singles stays singles", game: "melee", starts_at: inHours(48) }).select("id, team_size").single();
    expect(singles!.team_size).toBe(1);
    expect((await a.c.rpc("join_hosted_team", { ev: singles!.id, partner: null, partner_name: "Wes" })).error?.message).toMatch(/singles/);
    expect((await host.c.rpc("host_add_team", { ev: singles!.id, name1: "A", name2: "B" })).error?.message).toMatch(/singles/);
    // Singles or doubles is fixed once the event exists.
    expect((await host.c.from("hosted_events").update({ team_size: 2 }).eq("id", singles!.id).select("id")).error).not.toBeNull();
  });

  it("shows a team with a teen only to signed-in people, and respects blocks", async () => {
    const [host, adult, teen, blocker] = await Promise.all([makeUser("DbHost3"), makeUser("DbFay"), makeUser("DbTeen", { teen: true }), makeUser("DbGus")]);
    const { data: ev } = await host.c.from("hosted_events").insert({ host_id: host.id, name: "Doubles privacy", game: "melee", starts_at: inHours(48), team_size: 2 }).select("id").single();

    const team = await adult.c.rpc("join_hosted_team", { ev: ev!.id, partner: teen.id, partner_name: null });
    expect(team.error).toBeNull();
    expect((await guest().from("hosted_guests").select("id").eq("event_id", ev!.id)).data).toEqual([]); // signed out: not listed
    expect((await guest().from("hosted_team_members").select("slot").eq("event_id", ev!.id)).data).toEqual([]);
    expect((await host.c.from("hosted_guests").select("id").eq("event_id", ev!.id)).data).toHaveLength(1); // signed in: listed
    expect((await host.c.from("hosted_team_members").select("slot").eq("event_id", ev!.id)).data).toHaveLength(2);

    // Someone who blocked you can't be made your partner.
    await blocker.c.from("blocks").insert({ blocker_id: blocker.id, blocked_id: host.id });
    expect((await host.c.rpc("join_hosted_team", { ev: ev!.id, partner: blocker.id, partner_name: null })).error?.message).toMatch(/can't team up/);
  });
});
