// Several brackets in one event: who may add an extra bracket, who runs it, and when it takes sign-ups.
import { afterAll, describe, expect, it } from "vitest";
import { admin, cleanup, hasDb, makeUser } from "./helpers";

const inHours = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();

describe.skipIf(!hasDb)("extra brackets of a hosted event", () => {
  afterAll(cleanup);

  it("only the host adds a bracket, to a main event, with a name, near the event's date", async () => {
    const [host, other] = await Promise.all([makeUser("EbHost"), makeUser("EbOther")]);
    const { data: main } = await host.c.from("hosted_events").insert({ host_id: host.id, name: "Brackets main", game: "melee", starts_at: inHours(48) }).select("id").single();
    const bracket = (who: { id: string }, extra: Record<string, unknown> = {}) => ({
      host_id: who.id,
      parent_id: main!.id,
      bracket_name: "Redemption",
      name: "Brackets main: Redemption",
      game: "melee",
      starts_at: inHours(48),
      ...extra,
    });

    // Someone else can't hang a bracket on the host's event.
    expect((await other.c.from("hosted_events").insert(bracket(other)).select("id")).error?.message).toMatch(/your own events/);
    // The host can, and it may start right away (no "10 minutes from now" rule for a bracket).
    const made = await host.c.from("hosted_events").insert(bracket(host, { starts_at: inHours(47.9) })).select("id, parent_id, bracket_name").single();
    expect(made.error).toBeNull();
    expect(made.data).toMatchObject({ parent_id: main!.id, bracket_name: "Redemption" });
    // Not without a name, not far from the event's date, not under another bracket.
    expect((await host.c.from("hosted_events").insert(bracket(host, { bracket_name: null })).select("id")).error?.message).toMatch(/Name the bracket/);
    expect((await host.c.from("hosted_events").insert(bracket(host, { starts_at: inHours(48 + 15 * 24) })).select("id")).error?.message).toMatch(/within a week/);
    expect((await host.c.from("hosted_events").insert(bracket(host, { parent_id: made.data!.id })).select("id")).error?.message).toMatch(/main event/);
    // It stays in its event: members can't write that column afterwards.
    expect((await host.c.from("hosted_events").update({ parent_id: null }).eq("id", made.data!.id).select("id")).error).not.toBeNull();
    expect((await admin.from("hosted_events").select("parent_id").eq("id", made.data!.id).single()).data?.parent_id).toBe(main!.id);
    // The name can change.
    const renamed = await host.c.from("hosted_events").update({ bracket_name: "Amateur", name: "Brackets main: Amateur" }).eq("id", made.data!.id).select("bracket_name").single();
    expect(renamed.data?.bracket_name).toBe("Amateur");
  });

  it("co-TOs of the main event run its brackets; a bracket takes sign-ups after its start time", async () => {
    const [host, co, player, other] = await Promise.all([makeUser("EbHost2"), makeUser("EbCo"), makeUser("EbPlayer"), makeUser("EbOther2")]);
    const { data: main } = await host.c.from("hosted_events").insert({ host_id: host.id, name: "Brackets crew", game: "melee", starts_at: inHours(1) }).select("id").single();
    // A bracket whose start time has already passed (made on the day, after the event began).
    const { data: side, error } = await host.c
      .from("hosted_events")
      .insert({ host_id: host.id, parent_id: main!.id, bracket_name: "Side", name: "Brackets crew: Side", game: "melee", starts_at: inHours(-0.5), checkin_minutes: 0 })
      .select("id")
      .single();
    expect(error).toBeNull();

    // Added to the main event only, the co-TO can run the bracket; a stranger can't.
    expect((await host.c.rpc("host_add_cohost", { ev: main!.id, person: co.id })).error).toBeNull();
    expect((await co.c.rpc("host_add_guest", { ev: side!.id, guest_tag: "SideWalk" })).error).toBeNull();
    expect((await other.c.rpc("host_add_guest", { ev: side!.id, guest_tag: "Nope" })).error).not.toBeNull();

    // Sign-ups stay open until the host closes them or starts the bracket.
    expect((await player.c.rpc("join_hosted_event", { ev: side!.id })).error).toBeNull();
    await host.c.from("hosted_events").update({ status: "closed" }).eq("id", side!.id);
    expect((await other.c.rpc("join_hosted_event", { ev: side!.id })).error?.message).toMatch(/closed/);
  });

  it("holds 8 extra brackets at most", async () => {
    const host = await makeUser("EbHost3");
    const { data: main } = await host.c.from("hosted_events").insert({ host_id: host.id, name: "Brackets cap", game: "melee", starts_at: inHours(48) }).select("id").single();
    for (let i = 1; i <= 8; i++) {
      const res = await host.c.from("hosted_events").insert({ host_id: host.id, parent_id: main!.id, bracket_name: `Side ${i}`, name: `Brackets cap: Side ${i}`, game: "melee", starts_at: inHours(48) }).select("id");
      expect(res.error).toBeNull();
    }
    const ninth = await host.c.from("hosted_events").insert({ host_id: host.id, parent_id: main!.id, bracket_name: "Side 9", name: "Brackets cap: Side 9", game: "melee", starts_at: inHours(48) }).select("id");
    expect(ninth.error?.message).toMatch(/up to 8/);
  });
});
