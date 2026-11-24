// Round 817: YouTube Shorts whose owner turned off playing on other sites stay out of Reels.
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { getYouTubeVideos } from "@/lib/youtube";

const item = (id: string, status?: { embeddable?: boolean }) => ({
  id,
  snippet: { channelId: "UC1", channelTitle: "c", title: "t", publishedAt: "2026-11-24T00:00:00Z" },
  contentDetails: { duration: "PT40S" },
  statistics: { viewCount: "10" },
  ...(status ? { status } : {}),
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("which Shorts may play on Smashy", () => {
  it("reads the owner's setting, and asks YouTube for it", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "test");
    let asked = "";
    vi.stubGlobal("fetch", async (url: string) => {
      asked = String(url);
      return new Response(JSON.stringify({ items: [item("a", { embeddable: true }), item("b", { embeddable: false }), item("c")] }));
    });
    const videos = await getYouTubeVideos(["a", "b", "c"]);
    expect(new URL(asked).searchParams.get("part")).toContain("status");
    expect(videos.map((v) => [v.id, v.embeddable])).toEqual([["a", true], ["b", false], ["c", true]]);
  });
});
