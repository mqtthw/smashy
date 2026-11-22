// Private beta: a profile needs an invite code while invite-only is on.
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { admin, guest, hasDb } from "./helpers";

describe.skipIf(!hasDb)("invite codes", () => {
  const made: string[] = [];
  const code = `TEST-${randomUUID().slice(0, 8).toUpperCase()}`;

  /** A signed-in account with a birthdate but no profile and no invite yet (like someone new). */
  async function newcomer() {
    const email = `smashy-testdb-${randomUUID().slice(0, 8)}@example.com`;
    const password = `Test-${randomUUID()}-A1!`;
    const { data } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    made.push(data.user!.id);
    await admin.from("private_profile_data").insert({ user_id: data.user!.id, date_of_birth: "1995-01-01" });
    const c = guest();
    await c.auth.signInWithPassword({ email, password });
    return { id: data.user!.id, c };
  }
  const makeProfile = (u: { id: string; c: ReturnType<typeof guest> }) =>
    u.c.from("profiles").insert({ id: u.id, tag: "Newcomer", handle: `new_${u.id.slice(0, 8)}`, games: ["melee"] });

  afterAll(async () => {
    for (const id of made) await admin.auth.admin.deleteUser(id);
    await admin.from("invite_codes").delete().eq("code", code);
  });

  it("no code, no profile; a bad code is refused; a good one works once", async () => {
    await admin.from("app_settings").update({ invite_only: true }).eq("id", 1);
    await admin.from("invite_codes").insert({ code, max_uses: 1 });
    const first = await newcomer();
    expect((await makeProfile(first)).error?.message).toMatch(/invite-only/);
    expect((await first.c.rpc("needs_invite")).data).toBe(true);
    // A wrong code doesn't raise (so the attempt counts toward the hourly limit); it just doesn't redeem.
    expect((await first.c.rpc("redeem_invite", { p_code: "NOPE-0000" })).error).toBeNull();
    expect((await first.c.rpc("needs_invite")).data).toBe(true);
    expect((await first.c.rpc("redeem_invite", { p_code: code.toLowerCase() })).error).toBeNull();
    expect((await makeProfile(first)).error).toBeNull();

    const second = await newcomer();
    expect((await second.c.rpc("redeem_invite", { p_code: code })).error).toBeNull();
    expect((await second.c.rpc("needs_invite")).data).toBe(true); // used up: not redeemed
  });

  it("nobody can list codes or redemptions through the API", async () => {
    const u = await newcomer();
    for (const table of ["invite_codes", "invite_redemptions", "app_settings"]) {
      expect((await u.c.from(table).select("*")).error?.message ?? "").toMatch(/permission denied/);
      expect((await guest().from(table).select("*")).error?.message ?? "").toMatch(/permission denied/);
    }
  });
});
