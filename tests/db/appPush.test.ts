// Store app notification devices (migration 20261225100000_app_push_devices.sql).
import { afterAll, describe, expect, it } from "vitest";
import { admin, cleanup, guest, hasDb, makeUser } from "./helpers";

const fakeToken = (n: string) => `test-${n}:${"A".repeat(60)}`;

describe.skipIf(!hasDb)("app push devices", () => {
  afterAll(cleanup);

  it("your own only; tokens must look like a push token; guests see nothing", async () => {
    const [a, b] = await Promise.all([makeUser("AppPushA"), makeUser("AppPushB")]);
    const token = fakeToken(a.id.slice(0, 8));
    expect((await a.c.from("app_push_devices").insert({ user_id: a.id, platform: "android", token })).error).toBeNull();
    expect((await b.c.from("app_push_devices").insert({ user_id: a.id, platform: "android", token: `${token}x` })).error).not.toBeNull(); // not for someone else
    expect((await a.c.from("app_push_devices").insert({ user_id: a.id, platform: "windows", token: `${token}y` })).error).not.toBeNull(); // android or ios only
    expect((await a.c.from("app_push_devices").insert({ user_id: a.id, platform: "ios", token: "short" })).error).not.toBeNull();
    expect((await a.c.from("app_push_devices").insert({ user_id: a.id, platform: "ios", token: `${token} <b>` })).error).not.toBeNull();
    expect((await b.c.from("app_push_devices").select("id").eq("token", token)).data).toEqual([]);
    expect((await guest().from("app_push_devices").select("id")).data ?? []).toEqual([]);
    expect((await a.c.from("app_push_devices").select("id").eq("token", token)).data).toHaveLength(1);
    // Removing your own works.
    await a.c.from("app_push_devices").delete().eq("token", token);
    expect((await admin.from("app_push_devices").select("id").eq("token", token)).data).toEqual([]);
  });

  it("an 11th device replaces the oldest", async () => {
    const u = await makeUser("AppPushCap");
    for (let i = 0; i < 11; i++) {
      expect((await u.c.from("app_push_devices").insert({ user_id: u.id, platform: "android", token: fakeToken(`${u.id.slice(0, 8)}-${i}`) })).error).toBeNull();
    }
    const { data } = await admin.from("app_push_devices").select("token").eq("user_id", u.id);
    expect(data).toHaveLength(10);
    expect(data!.some((d) => d.token === fakeToken(`${u.id.slice(0, 8)}-0`))).toBe(false);
  });
});
