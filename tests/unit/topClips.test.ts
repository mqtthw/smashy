import { describe, expect, it } from "vitest";
import { rankTopClips } from "@/lib/topClips";

const now = Date.parse("2026-11-14T12:00:00Z");
const ago = (days: number) => new Date(now - days * 86400e3).toISOString();
const clip = (id: string, o: { days: number; views: number; channel?: string; platform?: string }) => ({
  id, platform: o.platform ?? "twitch", channel_login: o.channel ?? id, view_count: o.views, like_count: 0, created_at: ago(o.days), submitted_at: null,
});

describe("rankTopClips", () => {
  it("a fresh clip beats a much bigger one from days ago", () => {
    const rows = [clip("old", { days: 6, views: 9000 }), clip("new", { days: 0.3, views: 400 }), clip("mid", { days: 2, views: 300 })];
    expect(rankTopClips(rows, now, 3)[0].id).toBe("new");
  });
  it("gives one channel at most two spots", () => {
    const rows = ["a", "b", "c"].map((id) => clip(id, { days: 0.5, views: 1000, channel: "zain" })).concat(clip("d", { days: 1, views: 100 }));
    const out = rankTopClips(rows, now, 4).map((r) => r.id);
    expect(out.filter((id) => id !== "d")).toHaveLength(2);
    expect(out).toContain("d");
  });
  it("compares views within each platform (YouTube's big numbers don't swamp Twitch)", () => {
    const rows = [
      clip("yt1", { days: 1, views: 100000, platform: "youtube" }), clip("yt2", { days: 1, views: 120000, platform: "youtube" }),
      clip("tw1", { days: 1, views: 900, platform: "twitch" }), clip("tw2", { days: 1, views: 300, platform: "twitch" }),
    ];
    const out = rankTopClips(rows, now, 2).map((r) => r.id);
    expect(out).toContain("tw1");
  });
  it("uses the share date for clips people submitted", () => {
    const rows = [{ ...clip("shared", { days: 20, views: 200 }), submitted_at: ago(0.2) }, clip("other", { days: 3, views: 200 })];
    expect(rankTopClips(rows, now, 2)[0].id).toBe("shared");
  });
});
