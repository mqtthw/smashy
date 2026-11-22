// The waitlist for a full event: your place in line, and the names shown on the event page.
import { describe, expect, it } from "vitest";
import { waitlistNames, waitlistPosition, type Waiting } from "@/lib/waitlist";

const line: Waiting[] = [
  { userId: "a", tag: "Ada", handle: "ada" },
  { userId: "b", tag: null, handle: null }, // a profile this viewer can't see (a teen, for a guest)
  { userId: "c", tag: "Cy", handle: "cy" },
];

describe("a place in the waitlist", () => {
  it("counts from 1, in the order people joined", () => {
    expect(waitlistPosition(line, "a")).toBe(1);
    expect(waitlistPosition(line, "c")).toBe(3); // the hidden person ahead still counts
  });

  it("is nothing for someone who isn't waiting or isn't signed in", () => {
    expect(waitlistPosition(line, "z")).toBeNull();
    expect(waitlistPosition(line, null)).toBeNull();
    expect(waitlistPosition([], "a")).toBeNull();
  });
});

describe("the names shown for the line", () => {
  it("lists the people the viewer can see and counts the rest", () => {
    expect(waitlistNames(line)).toEqual({ names: ["Ada", "Cy"], more: 1 });
  });

  it("stops at a few names for a long line", () => {
    const long = Array.from({ length: 30 }, (_, i) => ({ userId: `u${i}`, tag: `P${i}`, handle: `p${i}` }));
    const shown = waitlistNames(long, 12);
    expect(shown.names).toHaveLength(12);
    expect(shown.more).toBe(18);
  });
});
