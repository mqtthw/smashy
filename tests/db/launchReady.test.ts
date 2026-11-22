// Launch prep: server-only error log and usage check, scene links, the weekly digest, suspensions.
import { readFileSync } from "node:fs";
import { afterAll, describe, expect, it, vi } from "vitest";
import { admin, cleanup, guest, hasDb, makeUser } from "./helpers";
vi.mock("server-only", () => ({}));
// The real events list uses Next.js caching (app only); the digest test uses a small fake week instead.
vi.mock("@/lib/events", () => ({
  getRegionEvents: async () => {
    const day = 86400;
    const soon = Math.floor(Date.now() / 1000);
    return {
      tournaments: [
        { city: "San Antonio, TX", startAt: soon + 9 * day },
        { city: "San Antonio", startAt: soon + 9 * day + 60 },
        { city: "Austin", startAt: soon + 9 * day },
      ],
      expected: [],
    };
  },
}));
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^(\w+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

describe.skipIf(!hasDb)("launch prep", () => {
  afterAll(async () => {
    await admin.from("error_reports").delete().like("fingerprint", "server|/test-launch%");
    await cleanup();
  });

  it("the error log and usage check are server-only", async () => {
    const u = await makeUser("LRUser");
    for (const c of [u.c, guest()]) {
      expect((await c.from("error_reports").select("*")).error).not.toBeNull();
      expect((await c.rpc("log_error", { p_fingerprint: "x", p_source: "server", p_message: "x", p_path: null, p_digest: null })).error).not.toBeNull();
      expect((await c.rpc("admin_usage")).error).not.toBeNull();
    }
    const { logError } = await import("@/lib/errorLog");
    await logError("server", "Test launch error 123", "/test-launch/9?q=secret");
    await logError("server", "Test launch error 456", "/test-launch/10");
    const { data } = await admin.from("error_reports").select("count, path").like("fingerprint", "server|/test-launch%");
    expect(data).toEqual([{ count: 2, path: "/test-launch/10" }]); // repeats counted on one row; no search words kept
    const usage = (await admin.rpc("admin_usage")).data as { database_bytes: number };
    expect(usage.database_bytes).toBeGreaterThan(0);
  });

  it("scene links must be a short list", async () => {
    const { data: scene } = await admin.from("scenes").select("id, links").eq("slug", "san-antonio").single();
    const tooMany = Array.from({ length: 7 }, (_, i) => ({ label: `L${i}`, url: "https://example.com" }));
    expect((await admin.from("scenes").update({ links: tooMany }).eq("id", scene!.id)).error).not.toBeNull();
    const u = await makeUser("LRScene");
    await u.c.from("scenes").update({ links: [] }).eq("id", scene!.id); // not an admin, and no direct edits anyway
    expect((await admin.from("scenes").select("links").eq("id", scene!.id).single()).data!.links).toEqual(scene!.links);
  });

  it("the weekly digest goes out on Mondays, once, and respects the setting", async () => {
    const { sendWeeklyDigests } = await import("@/lib/digest");
    const [a, b] = await Promise.all([makeUser("LRDigA", { city: "San Antonio" }), makeUser("LRDigB")]);
    await admin.from("profiles").update({ notification_mutes: ["weekly_digest"] }).eq("id", b.id);
    // The Monday (midnight UTC) of the week the fake events (9 days out) fall in, whatever day the tests run.
    const monday = new Date(Date.now() + 9 * 86400e3);
    monday.setUTCHours(0, 0, 0, 0);
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
    expect(await sendWeeklyDigests(new Date(monday.getTime() + 86400e3), [a.id, b.id])).toBe("not Monday");
    const first = await sendWeeklyDigests(monday, [a.id, b.id]);
    const again = await sendWeeklyDigests(monday, [a.id, b.id]);
    const rows = (await admin.from("notifications").select("user_id, event_name").eq("type", "weekly_digest").in("user_id", [a.id, b.id])).data ?? [];
    expect(first).toBe(1);
    expect(again).toBe(0);
    expect(rows.map((r) => r.user_id)).toEqual([a.id]);
    expect(rows[0].event_name).toBe("This week: 2 Smash events in San Antonio");
  });

  it("suspended accounts can't sign in until unsuspended", async () => {
    const { suspendAccount, unsuspendAccount, findAccount } = await import("@/lib/accounts");
    const u = await makeUser("LRSusp");
    const { data: p } = await admin.from("profiles").select("handle").eq("id", u.id).single();
    await suspendAccount(u.id, "test", u.id);
    expect((await findAccount(p!.handle))!.suspended).toBe(true);
    expect((await u.c.auth.refreshSession()).error).not.toBeNull(); // the session can't be renewed
    await unsuspendAccount(u.id);
    expect((await findAccount(p!.handle))!.suspended).toBe(false);
  });
});
