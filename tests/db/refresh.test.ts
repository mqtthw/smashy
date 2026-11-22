// The background refresh lock: one run at a time, success recorded only when a run finishes.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, guest, hasDb } from "./helpers";

describe.skipIf(!hasDb)("refresh lock", () => {
  let saved: { last_run: string };
  const claim = async (every: number) => (await admin.rpc("claim_refresh", { job: "reels", every_minutes: every })).data;

  beforeAll(async () => {
    saved = (await admin.from("reels_sync").select("last_run").single()).data!;
    await admin.from("reels_sync").update({ last_run: "epoch", running_since: null }).eq("id", 1);
  });
  afterAll(async () => {
    await admin.from("reels_sync").update({ last_run: saved.last_run, running_since: null }).eq("id", 1);
  });

  it("only one caller gets a due job", async () => {
    expect(await claim(180)).toBe(true);
    expect(await claim(0)).toBe(false);
  });

  it("a failed run can be retried right away; a successful one isn't due again yet", async () => {
    await admin.rpc("finish_refresh", { job: "reels", ok: false });
    expect(await claim(180)).toBe(true);
    await admin.rpc("finish_refresh", { job: "reels", ok: true });
    expect(await claim(180)).toBe(false);
  });

  it("a run stuck for over 10 minutes counts as dead", async () => {
    await admin.from("reels_sync").update({ running_since: new Date(Date.now() - 11 * 60e3).toISOString(), last_run: "epoch" }).eq("id", 1);
    expect(await claim(180)).toBe(true);
  });

  it("guests can't touch the lock", async () => {
    expect((await guest().rpc("claim_refresh", { job: "reels", every_minutes: 0 })).error).not.toBeNull();
  });
});
