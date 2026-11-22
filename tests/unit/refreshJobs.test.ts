// The background refresh runner: a failed scheduled or page-view run keeps its lock (so the next page
// view doesn't retry at once); a run started by hand releases it so it can be retried straight away.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const calls: [string, Record<string, unknown>][] = [];
let claimed = true;
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    rpc(name: string, args: Record<string, unknown>) {
      calls.push([name, args]);
      return Promise.resolve(name === "claim_refresh" ? { data: claimed, error: null } : { data: null, error: null });
    },
  }),
}));

const { runRefresh } = await import("@/lib/refreshJobs");

describe("runRefresh", () => {
  beforeEach(() => {
    calls.length = 0;
    claimed = true;
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("records a success", async () => {
    expect(await runRefresh("events", 180, async () => {})).toBe("ran");
    expect(calls.at(-1)).toEqual(["finish_refresh", { job: "events", ok: true }]);
  });

  it("keeps the lock after a failed due run (no retry on the next page view)", async () => {
    expect(await runRefresh("events", 180, async () => { throw new Error("start.gg down"); })).toBe("failed");
    expect(calls.map(([n]) => n)).toEqual(["claim_refresh"]);
  });

  it("releases the lock after a failed run started by hand", async () => {
    expect(await runRefresh("reels", 0, async () => { throw new Error("Twitch down"); })).toBe("failed");
    expect(calls.at(-1)).toEqual(["finish_refresh", { job: "reels", ok: false }]);
  });

  it("skips when another run holds the lock", async () => {
    claimed = false;
    const work = vi.fn(async () => {});
    expect(await runRefresh("majors", 300, work)).toBe("skipped");
    expect(work).not.toHaveBeenCalled();
  });
});
