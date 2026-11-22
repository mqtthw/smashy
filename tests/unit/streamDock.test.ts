// The stream that keeps playing between pages (round 718): who owns the player's spot.
import { beforeEach, describe, expect, it } from "vitest";
import { closeStream, getStreamDock, releaseStreamSlot, resetStreamDock, showStream, subscribeStreamDock } from "@/lib/streamDock";

const el = (name: string) => ({ name }) as unknown as HTMLElement;
const stream = { channel: "vgbootcamp", eventName: "Kagaribi 16", eventPath: "/events/16-kagaribi-16" };

describe("stream dock", () => {
  beforeEach(() => resetStreamDock());
  it("floats when its page goes away, and returns to the page's spot", () => {
    const a = el("a");
    showStream(stream, a);
    expect(getStreamDock()).toEqual({ stream, slot: a });
    releaseStreamSlot(a);
    expect(getStreamDock()).toEqual({ stream, slot: null }); // still playing, floating
    const b = el("b");
    showStream(stream, b);
    expect(getStreamDock().slot).toBe(b);
  });
  it("ignores an old page letting go after a new page took the stream", () => {
    const a = el("a");
    const b = el("b");
    showStream(stream, a);
    showStream({ ...stream, channel: "btssmash" }, b);
    releaseStreamSlot(a);
    expect(getStreamDock()).toMatchObject({ stream: { channel: "btssmash" }, slot: b });
  });
  it("closes, and tells whoever is listening", () => {
    let calls = 0;
    const stop = subscribeStreamDock(() => calls++);
    showStream(stream, el("a"));
    closeStream();
    expect(getStreamDock().stream).toBeNull();
    expect(calls).toBe(2);
    stop();
  });
});
