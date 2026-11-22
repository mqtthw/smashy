import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { liveRefresh, type LiveRefreshOptions } from "@/lib/liveRefresh";

let visible = true;
const make = (opts: Partial<LiveRefreshOptions> = {}) => {
  const refresh = vi.fn();
  const live = liveRefresh({ refresh, isVisible: () => visible, random: () => 0, ...opts });
  return { refresh, live };
};

beforeEach(() => {
  vi.useFakeTimers();
  visible = true;
});
afterEach(() => vi.useRealTimers());

describe("when a live page reloads its data", () => {
  it("turns a burst of changes into one reload", () => {
    const { refresh, live } = make({ minGapMs: 0, settleMs: 1200 });
    for (let i = 0; i < 20; i++) live.onChange();
    vi.advanceTimersByTime(1199);
    expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(refresh).toHaveBeenCalledTimes(1);
    live.stop();
  });

  it("keeps reloads a minimum time apart", () => {
    const { refresh, live } = make({ minGapMs: 5_000, settleMs: 100 });
    vi.advanceTimersByTime(10_000);
    live.onChange();
    vi.advanceTimersByTime(100);
    expect(refresh).toHaveBeenCalledTimes(1);
    live.onChange();
    vi.advanceTimersByTime(4_999);
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(refresh).toHaveBeenCalledTimes(2);
    live.stop();
  });

  it("does not reload a background tab, and catches up when it is shown again", () => {
    const { refresh, live } = make({ minGapMs: 0, settleMs: 100 });
    visible = false;
    live.onChange();
    vi.advanceTimersByTime(1_000);
    expect(refresh).not.toHaveBeenCalled();
    visible = true;
    live.onVisible();
    vi.advanceTimersByTime(100);
    expect(refresh).toHaveBeenCalledTimes(1);
    live.stop();
  });

  it("reloads on coming back after a long time away, even if no change was heard", () => {
    const { refresh, live } = make({ minGapMs: 0, settleMs: 100, catchUpAfterMs: 30_000 });
    visible = false;
    vi.advanceTimersByTime(20_000);
    visible = true;
    live.onVisible();
    vi.advanceTimersByTime(1_000);
    expect(refresh).not.toHaveBeenCalled(); // only 20 seconds away
    visible = false;
    vi.advanceTimersByTime(20_000);
    visible = true;
    live.onVisible();
    vi.advanceTimersByTime(100);
    expect(refresh).toHaveBeenCalledTimes(1);
    live.stop();
  });

  it("with live updates connected, a quiet page reloads only on the rare safety timer", () => {
    const { refresh, live } = make({ connectedEveryMs: 5 * 60_000, offlineEveryMs: 30_000 });
    live.onStatus(true);
    vi.advanceTimersByTime(4 * 60_000);
    expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60_000 + 5_000);
    expect(refresh).toHaveBeenCalledTimes(1);
    live.stop();
  });

  it("without live updates, reloads every 30 seconds", () => {
    const { refresh, live } = make({ connectedEveryMs: 5 * 60_000, offlineEveryMs: 30_000 });
    vi.advanceTimersByTime(95_000);
    expect(refresh).toHaveBeenCalledTimes(3);
    live.stop();
  });

  it("reloads once when the connection comes back from a drop, but not on the first connect", () => {
    const { refresh, live } = make({ minGapMs: 0, settleMs: 100 });
    live.onStatus(true);
    vi.advanceTimersByTime(1_000);
    expect(refresh).not.toHaveBeenCalled();
    live.onStatus(false);
    live.onStatus(false);
    live.onStatus(true);
    vi.advanceTimersByTime(100);
    expect(refresh).toHaveBeenCalledTimes(1);
    live.stop();
  });

  it("never reloads on a timer when no timers were asked for (the inbox)", () => {
    const { refresh, live } = make({});
    vi.advanceTimersByTime(60 * 60_000);
    expect(refresh).not.toHaveBeenCalled();
    live.stop();
  });

  it("stops cleanly with a reload pending", () => {
    const { refresh, live } = make({ settleMs: 100, offlineEveryMs: 30_000 });
    live.onChange();
    live.stop();
    vi.advanceTimersByTime(120_000);
    expect(refresh).not.toHaveBeenCalled();
  });
});
