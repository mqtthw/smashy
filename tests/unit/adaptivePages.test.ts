import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {} }));

describe("adaptivePages", () => {
  it("halves the page size when start.gg says a page is too complex, and keeps the total", async () => {
    const { adaptivePages } = await import("@/lib/startgg");
    const items = Array.from({ length: 90 }, (_, i) => i);
    const sizes: number[] = [];
    const fetchPage = async (page: number, perPage: number) => {
      sizes.push(perPage);
      if (perPage > 20) throw new Error("start.gg request failed: Your query complexity is too high.");
      return { totalPages: Math.ceil(items.length / perPage), nodes: items.slice((page - 1) * perPage, page * perPage) };
    };
    const got = await adaptivePages(fetchPage, 40, 80);
    expect(got).toEqual(items.slice(0, 80));
    expect(sizes[0]).toBe(40);
    expect(sizes.slice(1).every((s) => s === 20)).toBe(true);
  });
  it("passes other errors straight through", async () => {
    const { adaptivePages } = await import("@/lib/startgg");
    await expect(adaptivePages(async () => { throw new Error("start.gg request failed: down"); }, 40, 80)).rejects.toThrow("down");
  });
});
