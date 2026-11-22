// The birthday is optional at sign-up: a member can create their profile without one, is treated as a
// teen until they add it (hidden from guests, private to start), can add it once later, and the
// database still refuses an under-13 birthday.
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import { admin, guest, hasDb } from "./helpers";

const ids: string[] = [];

async function signedInWithoutProfile(): Promise<{ id: string; c: SupabaseClient }> {
  const email = `smashy-testdb-${randomUUID().slice(0, 8)}@example.com`;
  const password = `Test-${randomUUID()}-A1!`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  ids.push(data.user.id);
  await admin.from("invite_redemptions").insert({ user_id: data.user.id, code: null }); // in case sign-ups are invite-only
  const c = guest(); // a fresh client, signed in below
  const { error: se } = await c.auth.signInWithPassword({ email, password });
  if (se) throw se;
  return { id: data.user.id, c };
}

describe.skipIf(!hasDb)("optional birthday", () => {
  afterAll(async () => {
    for (const id of ids.splice(0)) await admin.auth.admin.deleteUser(id);
  });

  it("lets a member join without a birthday, as a teen until they add one", async () => {
    const u = await signedInWithoutProfile();
    const handle = `nobday_${randomUUID().slice(0, 6)}`;
    const { error } = await u.c.from("profiles").insert({ id: u.id, tag: "TestDbNoBday", handle, games: ["melee"] });
    expect(error).toBeNull();
    // Teen rules: private to start, and hidden from guests.
    expect((await admin.from("profiles").select("protected").eq("id", u.id).single()).data?.protected).toBe(true);
    expect((await guest().from("profiles").select("id").eq("id", u.id)).data ?? []).toHaveLength(0);

    // Under 13 is still refused; an adult birthday can be added once, and then not changed.
    const y = new Date().getUTCFullYear();
    expect((await u.c.from("private_profile_data").insert({ user_id: u.id, date_of_birth: `${y - 10}-01-01` })).error).not.toBeNull();
    expect((await u.c.from("private_profile_data").insert({ user_id: u.id, date_of_birth: `${y - 30}-01-01` })).error).toBeNull();
    expect((await u.c.from("private_profile_data").insert({ user_id: u.id, date_of_birth: `${y - 20}-01-01` })).error).not.toBeNull();
    await u.c.from("private_profile_data").update({ date_of_birth: `${y - 14}-01-01` }).eq("user_id", u.id);
    expect((await admin.from("private_profile_data").select("date_of_birth").eq("user_id", u.id).single()).data?.date_of_birth).toBe(`${y - 30}-01-01`);
    // Now an adult: guests can see the profile once it's made public.
    await u.c.from("profiles").update({ protected: false }).eq("id", u.id);
    expect((await guest().from("profiles").select("id").eq("id", u.id)).data ?? []).toHaveLength(1);
  });

  it("still won't make a profile for someone else", async () => {
    const [a, b] = await Promise.all([signedInWithoutProfile(), signedInWithoutProfile()]);
    const { error } = await a.c.from("profiles").insert({ id: b.id, tag: "TestDbNotMine", handle: `notmine_${randomUUID().slice(0, 6)}`, games: ["melee"] });
    expect(error).not.toBeNull();
  });
});
