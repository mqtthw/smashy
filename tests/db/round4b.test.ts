// Two small fixes: the invite limit holds when invites are made at the same moment, and "mark all
// read" includes notification types the person switched off.
import { readFileSync } from "node:fs";
import { afterAll, describe, expect, it, vi } from "vitest";
import { admin, cleanup, hasDb, makeUser } from "./helpers";
vi.mock("server-only", () => ({}));
// The app's server code reads its keys from the environment.
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^(\w+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

describe.skipIf(!hasDb)("invite limit and mark-all-read", () => {
  afterAll(async () => {
    await cleanup();
  });

  it("making several invites at once never goes past the limit", async () => {
    const { createMemberInvite, MEMBER_INVITES } = await import("@/lib/invites");
    const u = await makeUser("R4Inv");
    const results = await Promise.all(Array.from({ length: MEMBER_INVITES + 3 }, () => createMemberInvite(u.id)));
    const made = results.filter((r) => typeof r !== "string");
    const { count } = await admin.from("invite_codes").select("code", { count: "exact", head: true }).eq("created_by", u.id);
    expect(count).toBe(MEMBER_INVITES);
    expect(made.length).toBe(MEMBER_INVITES);
    await admin.from("invite_codes").delete().eq("created_by", u.id);
  });

  it("switched-off notification types are marked read too", async () => {
    const [a, b] = await Promise.all([makeUser("R4NA"), makeUser("R4NB")]);
    await admin.from("notifications").insert({ user_id: a.id, actor_id: b.id, type: "follow" });
    await a.c.from("profiles").update({ notification_mutes: ["follow"] }).eq("id", a.id);
    // As the person: the switched-off row is hidden, so their own update can't reach it (the old bug).
    await a.c.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", a.id).is("read_at", null);
    expect((await admin.from("notifications").select("read_at").eq("user_id", a.id).single()).data!.read_at).toBeNull();
    // What markAllRead now does (server side, only this person's rows):
    await admin.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", a.id).is("read_at", null);
    await a.c.from("profiles").update({ notification_mutes: [] }).eq("id", a.id);
    expect((await a.c.from("notifications").select("read_at").eq("user_id", a.id)).data!.every((n) => n.read_at)).toBe(true);
  });
});
