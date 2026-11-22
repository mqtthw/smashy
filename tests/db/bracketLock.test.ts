// The bracket lock: two changes to the same event at the same moment take turns (never overlap).
import { readFileSync } from "node:fs";
import { afterAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: () => {}, refresh: () => {} }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
import { admin, cleanup, hasDb, makeUser } from "./helpers";

// The app's server code reads its keys from the environment: load them from .env.local first.
function loadEnvIntoProcess() {
  try {
    for (const line of readFileSync(new URL("../../.env.local", import.meta.url), "utf8").split("\n")) {
      const at = line.indexOf("=");
      if (at < 1 || !/^\w+$/.test(line.slice(0, at))) continue;
      const key = line.slice(0, at);
      if (!process.env[key]) process.env[key] = line.slice(at + 1).trim();
    }
  } catch {}
}

describe.skipIf(!hasDb)("bracket lock", () => {
  afterAll(cleanup);

  it("runs one change at a time and leaves the version moving forward", async () => {
    loadEnvIntoProcess();
    const { withBracketLock } = await import("@/lib/hostedBracket");
    const host = await makeUser("LockHost");
    const { data: ev } = await host.c
      .from("hosted_events")
      .insert({ host_id: host.id, name: "Lock test", game: "melee", starts_at: new Date(Date.now() + 86_400_000).toISOString() })
      .select("id")
      .single();
    let inside = 0;
    let overlapped = false;
    const work = (ms: number) =>
      withBracketLock(ev!.id, async () => {
        inside++;
        if (inside > 1) overlapped = true;
        await new Promise((r) => setTimeout(r, ms));
        inside--;
        return ms;
      });
    const results = await Promise.all([work(400), work(300), work(200)]);
    expect(results.sort()).toEqual([200, 300, 400]);
    expect(overlapped).toBe(false);
    const { data } = await admin.from("hosted_events").select("bracket_version").eq("id", ev!.id).single();
    expect(data?.bracket_version).toBe(3); // three changes, lock released each time

    // A lock left behind by a request that died (taken over 3 minutes ago) is taken over...
    const now = Math.floor(Date.now() / 1000);
    await admin.from("hosted_events").update({ bracket_version: -(now - 200) }).eq("id", ev!.id);
    expect(await withBracketLock(ev!.id, async () => "took over")).toBe("took over");
    expect((await admin.from("hosted_events").select("bracket_version").eq("id", ev!.id).single()).data?.bracket_version).toBe(1);
    // ...and so is one from the old scheme (a small negative number).
    await admin.from("hosted_events").update({ bracket_version: -4 }).eq("id", ev!.id);
    expect(await withBracketLock(ev!.id, async () => "old scheme")).toBe("old scheme");

    // A lock taken a moment ago is respected: the change waits, then gives up with a clear message.
    await admin.from("hosted_events").update({ bracket_version: -Math.floor(Date.now() / 1000) }).eq("id", ev!.id);
    await expect(withBracketLock(ev!.id, async () => "should not run")).rejects.toThrow(/busy/);
    expect((await admin.from("hosted_events").select("bracket_version").eq("id", ev!.id).single()).data?.bracket_version).toBeLessThan(0); // untouched
  }, 30_000);
});
