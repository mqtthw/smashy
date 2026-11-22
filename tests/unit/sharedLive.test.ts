import { describe, expect, it, vi } from "vitest";
import { sharedLive } from "@/lib/sharedLive";

describe("a shared live value", () => {
  it("starts once for any number of listeners and stops when the last one leaves", () => {
    const stop = vi.fn();
    const start = vi.fn(() => stop);
    const store = sharedLive(0, start);
    expect(start).not.toHaveBeenCalled();
    const offA = store.subscribe(() => {});
    const offB = store.subscribe(() => {});
    expect(start).toHaveBeenCalledTimes(1);
    offA();
    expect(stop).not.toHaveBeenCalled();
    offB();
    expect(stop).toHaveBeenCalledTimes(1);
    store.subscribe(() => {});
    expect(start).toHaveBeenCalledTimes(2);
  });

  it("tells every listener about a change, and only when the value really changed", () => {
    let set!: (next: number | ((prev: number) => number)) => void;
    const store = sharedLive(0, (s) => {
      set = s;
      return () => {};
    });
    const a = vi.fn();
    const b = vi.fn();
    store.subscribe(a);
    store.subscribe(b);
    set(3);
    set((n) => n + 1);
    set(4);
    expect(store.get()).toBe(4);
    expect(a).toHaveBeenCalledTimes(2);
    expect(b).toHaveBeenCalledTimes(2);
  });

  it("goes back to its starting value once nobody is listening", () => {
    let set!: (next: number) => void;
    const store = sharedLive(0, (s) => {
      set = s;
      return () => {};
    });
    const off = store.subscribe(() => {});
    set(7);
    off();
    expect(store.get()).toBe(0);
  });
});
