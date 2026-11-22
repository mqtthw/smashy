// Round 515: start.gg pacing gives up after a short wait instead of queueing requests for minutes.
import { describe, expect, it } from "vitest";
import { MAX_SLOT_WAIT_MS, slotWait } from "@/lib/startgg";

describe("start.gg pacing", () => {
  it("sends straight away while under the per-minute allowance", () => {
    expect(slotWait([], 100_000, 3)).toBeNull();
    expect(slotWait([90_000, 95_000], 100_000, 3)).toBeNull();
  });

  it("ignores requests older than a minute", () => {
    expect(slotWait([10_000, 20_000, 30_000], 100_000, 3)).toBeNull();
  });

  it("waits until the oldest request in the last minute is a minute old", () => {
    // Three sent at 50s, 60s, 70s; at 100s the next slot opens when the 50s one turns a minute old (110s).
    expect(slotWait([50_000, 60_000, 70_000], 100_000, 3)).toBe(10_025);
  });

  it("gives up after seconds, not minutes", () => {
    expect(MAX_SLOT_WAIT_MS).toBeLessThanOrEqual(15_000);
  });
});

describe("start.gg's object cap", () => {
  it("recognises start.gg's 'too complex' error and nothing else", async () => {
    const { isTooComplex } = await import("@/lib/startgg");
    expect(isTooComplex(new Error("start.gg request failed: Your query complexity is too high. A maximum of 1000 objects may be returned by each request. (actual: 1038)"))).toBe(true);
    expect(isTooComplex(new Error("start.gg is busy right now (rate limited): Rate limit exceeded - api-token"))).toBe(false);
    expect(isTooComplex("complexity is too high")).toBe(false);
  });
});

describe("the whole site's start.gg count", () => {
  it("goes when the site has room, and when the shared count can't be reached", async () => {
    const { waitForSlot } = await import("@/lib/startgg");
    await expect(waitForSlot(async () => 0)).resolves.toBeUndefined();
    await expect(waitForSlot(async () => null)).resolves.toBeUndefined();
  });

  it("waits for a free slot, then goes", async () => {
    const { waitForSlot } = await import("@/lib/startgg");
    const answers = [30, 0];
    let asked = 0;
    await waitForSlot(async () => (asked++, answers.shift()!));
    expect(asked).toBe(2);
  });

  it("says busy instead of waiting past the deadline", async () => {
    const { waitForSlot } = await import("@/lib/startgg");
    await expect(waitForSlot(async () => 50_000, Date.now() + 1_000)).rejects.toThrow(/busy/);
  });
});

describe("start.gg slots: shared calls and one spare (rounds 562, 580)", () => {
  it("asks once for requests made together, plus one spare", async () => {
    const { siteSlots } = await import("@/lib/startgg");
    const asks: number[] = [];
    const take = siteSlots(async (want) => (asks.push(want), { granted: want, waitMs: 0 }), () => 0);
    expect(await Promise.all([take(), take(), take(), take()])).toEqual([0, 0, 0, 0]);
    expect(await take()).toBe(0); // the spare: no database call
    expect(asks).toEqual([5]);
  });

  it("a loop asking one at a time calls the database every other request", async () => {
    const { siteSlots } = await import("@/lib/startgg");
    let asked = 0;
    const take = siteSlots(async (want) => (asked++, { granted: want, waitMs: 0 }), () => 0);
    for (let i = 0; i < 6; i++) expect(await take()).toBe(0);
    expect(asked).toBe(3);
  });

  it("drops the spare after 3 seconds", async () => {
    const { siteSlots } = await import("@/lib/startgg");
    let t = 0;
    let asked = 0;
    const take = siteSlots(async (want) => (asked++, { granted: want, waitMs: 0 }), () => t);
    await take();
    t = 4_000;
    await take();
    expect(asked).toBe(2);
  });

  it("asks again for the rest when fewer slots are free", async () => {
    const { siteSlots } = await import("@/lib/startgg");
    const answers = [{ granted: 1, waitMs: 0 }, { granted: 0, waitMs: 3_000 }];
    const take = siteSlots(async () => answers.shift()!);
    const [a, b] = await Promise.all([take(), take()]);
    expect(a).toBe(0);
    expect(b).toBeGreaterThanOrEqual(3_000);
    expect(b).toBeLessThan(3_250);
  });

  it("answers null without a shared count", async () => {
    const { siteSlots } = await import("@/lib/startgg");
    expect(await siteSlots(async () => null)()).toBeNull();
  });
});
