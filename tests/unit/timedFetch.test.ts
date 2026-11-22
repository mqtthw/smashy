import { afterEach, describe, expect, it, vi } from "vitest";
import { timedFetch } from "@/lib/supabase/timedFetch";

// A fetch that never answers on its own: it only settles when its signal aborts.
function hangingFetch() {
  return vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(init.signal!.reason));
    }),
  );
}

describe("timedFetch", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("gives up after the time limit", async () => {
    vi.stubGlobal("fetch", hangingFetch());
    await expect(timedFetch(30)("https://example.com")).rejects.toMatchObject({ name: "TimeoutError" });
  });

  it("still stops when the caller aborts first", async () => {
    vi.stubGlobal("fetch", hangingFetch());
    const caller = new AbortController();
    const pending = timedFetch(10_000)("https://example.com", { signal: caller.signal });
    caller.abort(new Error("caller stopped"));
    await expect(pending).rejects.toThrow("caller stopped");
  });

  it("passes the answer through when it comes in time", async () => {
    const ok = new Response("ok");
    const f = vi.fn<typeof fetch>(async () => ok);
    vi.stubGlobal("fetch", f);
    await expect(timedFetch(1000)("https://example.com", { method: "POST" })).resolves.toBe(ok);
    expect(f.mock.calls[0][1]).toMatchObject({ method: "POST" });
  });
});
