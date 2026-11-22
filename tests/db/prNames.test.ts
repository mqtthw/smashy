// Names on the PR: closed to everyone but the server, one name per host per player, and a row is
// either a member or a walk-in tag (not both, not neither).
import { afterAll, describe, expect, it } from "vitest";
import { admin, cleanup, guest, hasDb, makeUser } from "./helpers";

describe.skipIf(!hasDb)("PR names", () => {
  afterAll(cleanup);

  it("is server-only and keeps one name per host per player", async () => {
    const [host, player] = await Promise.all([makeUser("PrHost"), makeUser("PrPlayer")]);
    expect((await admin.from("pr_names").insert({ host_id: host.id, user_id: player.id, pr_name: "Blair" })).error).toBeNull();
    expect((await admin.from("pr_names").insert({ host_id: host.id, guest_tag: "Walk In", pr_name: "WalkIn" })).error).toBeNull();

    // Nobody reads or writes it through the API, not the host and not the player.
    for (const who of [host.c, player.c, guest()]) {
      expect((await who.from("pr_names").select("pr_name")).data ?? []).toEqual([]);
      expect((await who.from("pr_names").insert({ host_id: host.id, user_id: player.id, pr_name: "X" })).error).not.toBeNull();
    }

    // One per host per member; one per host per walk-in tag, any capitals.
    expect((await admin.from("pr_names").insert({ host_id: host.id, user_id: player.id, pr_name: "Again" })).error?.code).toBe("23505");
    expect((await admin.from("pr_names").insert({ host_id: host.id, guest_tag: "walk in", pr_name: "Again" })).error?.code).toBe("23505");
    // A member or a walk-in, never both or neither; a name is required.
    expect((await admin.from("pr_names").insert({ host_id: host.id, user_id: player.id, guest_tag: "X", pr_name: "Both" })).error).not.toBeNull();
    expect((await admin.from("pr_names").insert({ host_id: host.id, pr_name: "Neither" })).error).not.toBeNull();
    expect((await admin.from("pr_names").insert({ host_id: host.id, guest_tag: "Other", pr_name: "  " })).error).not.toBeNull();
  });
});
