import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ cacheLife: () => {} }));

const ok = { ok: true, status: 200, statusText: "OK", json: async () => ({ data: { hello: "world" } }) };
const limited = { ok: false, status: 429, statusText: "Too Many Requests", json: async () => ({ message: "Rate limit exceeded" }) };

describe("startggQuery when start.gg says slow down", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("waits and retries instead of failing", async () => {
    vi.useFakeTimers();
    vi.stubEnv("STARTGG_API_TOKEN", "test-token");
    const fetchMock = vi.fn().mockResolvedValueOnce(limited).mockResolvedValueOnce(ok);
    vi.stubGlobal("fetch", fetchMock);
    const { startggQuery } = await import("@/lib/startgg");

    const result = startggQuery<{ hello: string }>("{ hello }", {});
    await vi.advanceTimersByTimeAsync(2_500);
    await expect(result).resolves.toEqual({ hello: "world" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives a clear error if start.gg stays busy", async () => {
    vi.useFakeTimers();
    vi.stubEnv("STARTGG_API_TOKEN", "test-token");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(limited));
    const { startggQuery } = await import("@/lib/startgg");

    const result = startggQuery("{ hello }", {});
    const check = expect(result).rejects.toThrow(/busy right now/);
    await vi.advanceTimersByTimeAsync(10_000);
    await check;
  });
});
