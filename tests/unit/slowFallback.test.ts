// Round 778: the Feed's stand-in for a stalled database.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { orStandIn, within } from "@/lib/slowFallback";

const after = <T,>(ms: number, value: T) => new Promise<T>((r) => setTimeout(() => r(value), ms));
const failAfter = (ms: number, message: string) => new Promise<never>((_, r) => setTimeout(() => r(new Error(message)), ms));

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("within", () => {
  it("gives the answer when it comes in time", async () => {
    const p = within(after(100, ["melee"]), 1500, []);
    await vi.advanceTimersByTimeAsync(100);
    expect(await p).toEqual(["melee"]);
  });
  it("gives the fallback when it's slow, or failed", async () => {
    const slow = within(after(5000, ["melee"]), 1500, []);
    const broken = within(failAfter(10, "down"), 1500, ["x"]);
    await vi.advanceTimersByTimeAsync(1500);
    expect(await slow).toEqual([]);
    expect(await broken).toEqual(["x"]);
  });
});

describe("orStandIn", () => {
  it("uses the member's own answer when it's quick, and never starts the stand-in", async () => {
    const standIn = vi.fn(() => after(10, "shared"));
    const p = orStandIn(after(300, "own"), 1500, standIn);
    await vi.advanceTimersByTimeAsync(5000);
    expect(await p).toEqual({ value: "own", usedStandIn: false });
    expect(standIn).not.toHaveBeenCalled();
  });
  it("uses the stand-in when the own answer stalls", async () => {
    const p = orStandIn(after(9000, "own"), 1500, () => after(50, "shared"));
    await vi.advanceTimersByTimeAsync(1550);
    expect(await p).toEqual({ value: "shared", usedStandIn: true });
  });
  it("still prefers the own answer if it arrives before the stand-in is ready", async () => {
    const p = orStandIn(after(1600, "own"), 1500, () => after(4000, "shared"));
    await vi.advanceTimersByTimeAsync(1600);
    expect(await p).toEqual({ value: "own", usedStandIn: false });
  });
  it("waits for the own answer when the stand-in fails", async () => {
    const p = orStandIn(after(3000, "own"), 1500, () => failAfter(10, "no copy"));
    await vi.advanceTimersByTimeAsync(3000);
    expect(await p).toEqual({ value: "own", usedStandIn: false });
  });
  it("a quick failure is passed on at once, as before", async () => {
    const standIn = vi.fn(() => after(10, "shared"));
    const p = orStandIn(failAfter(100, "query cancelled"), 1500, standIn);
    const caught = p.catch((e: Error) => e.message);
    await vi.advanceTimersByTimeAsync(100);
    expect(await caught).toBe("query cancelled");
    expect(standIn).not.toHaveBeenCalled();
  });
  it("a late failure uses the stand-in; both failing passes on the own error", async () => {
    const ok = orStandIn(failAfter(4000, "query cancelled"), 1500, () => after(50, "shared"));
    const both = orStandIn(failAfter(4000, "query cancelled"), 1500, () => failAfter(50, "no copy")).catch((e: Error) => e.message);
    await vi.advanceTimersByTimeAsync(4000);
    expect(await ok).toEqual({ value: "shared", usedStandIn: true });
    expect(await both).toBe("query cancelled");
  });
});
