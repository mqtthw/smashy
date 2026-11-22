import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));

import { checkMajorVod, readPlaylistLink, vodProvider } from "@/lib/majorVods";

describe("top 8 VOD links", () => {
  it("takes a YouTube playlist", () => {
    expect(readPlaylistLink("youtube.com/playlist?list=PLabcdefghij123")).toBe("https://www.youtube.com/playlist?list=PLabcdefghij123");
    expect(checkMajorVod("https://www.youtube.com/playlist?list=PLabcdefghij123", " Top 8 ", "melee")).toEqual({
      url: "https://www.youtube.com/playlist?list=PLabcdefghij123",
      label: "Top 8",
      game: "melee",
    });
  });

  it("takes a single video (a watch link inside a playlist stays that video)", () => {
    const r = checkMajorVod("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLabcdefghij123", "", "melee");
    expect(r).toMatchObject({ label: null, game: "melee" });
    expect("url" in r && r.url).toContain("dQw4w9WgXcQ");
  });

  it("refuses other links and a missing game", () => {
    expect(checkMajorVod("https://example.com/video", "", "melee")).toEqual({ error: { key: "history.vod.err.link" } });
    expect(checkMajorVod("https://www.youtube.com/@somechannel", "", "melee")).toEqual({ error: { key: "history.vod.err.link" } });
    expect(checkMajorVod("https://www.youtube.com/playlist?list=PLabcdefghij123", "", "")).toHaveProperty("error");
  });

  it("names where it plays", () => {
    expect(vodProvider("https://www.youtube.com/playlist?list=PLx")).toBe("YouTube playlist");
    expect(vodProvider("https://youtu.be/abc")).toBe("YouTube");
    expect(vodProvider("https://www.twitch.tv/videos/123")).toBe("Twitch");
  });
});
