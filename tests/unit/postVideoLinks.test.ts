import { describe, expect, it } from "vitest";
import { MAX_VIDEO_BYTES, videoLength } from "@/lib/postVideoLinks";

describe("videoLength", () => {
  it("writes minutes and seconds", () => {
    expect(videoLength(42_000)).toBe("0:42");
    expect(videoLength(60_000)).toBe("1:00");
    expect(videoLength(9_400)).toBe("0:09");
    expect(videoLength(9_600)).toBe("0:10");
  });
});

describe("limits", () => {
  it("matches the storage bucket's 50 MB cap", () => {
    expect(MAX_VIDEO_BYTES).toBe(52_428_800);
  });
});
