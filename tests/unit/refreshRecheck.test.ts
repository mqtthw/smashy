// Round 566: a server asks the database whether a background refresh is due at most every 5 minutes.
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("refresh due checks", () => {
  it("asks once, then not again for 5 minutes, per job", async () => {
    const { shouldAsk } = await import("@/lib/refreshJobs");
    const asked = new Map<string, number>();
    expect(shouldAsk(asked, "majors", 240, 0)).toBe(true);
    expect(shouldAsk(asked, "majors", 240, 60_000)).toBe(false);
    expect(shouldAsk(asked, "reels", 30, 60_000)).toBe(true);
    expect(shouldAsk(asked, "majors", 240, 5 * 60_000)).toBe(true);
  });

  it("always asks for a run started by hand", async () => {
    const { shouldAsk } = await import("@/lib/refreshJobs");
    const asked = new Map<string, number>([["reels", 0]]);
    expect(shouldAsk(asked, "reels", 0, 1_000)).toBe(true);
  });
});
