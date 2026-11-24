// Pages opened on Vercel's own addresses point search engines at smashy.gg (round 786).
import { describe, expect, it } from "vitest";
import { canonicalLinkHeader } from "@/lib/siteMeta";

describe("canonicalLinkHeader", () => {
  it("points a vercel.app page at the same page on smashy.gg", () => {
    expect(canonicalLinkHeader("smashy-five.vercel.app", "/history", "")).toBe('<https://smashy.gg/history>; rel="canonical"');
    expect(canonicalLinkHeader("Smashy-Five.vercel.app:443", "/games/melee", "?x=1")).toBe('<https://smashy.gg/games/melee?x=1>; rel="canonical"');
  });
  it("adds nothing on smashy.gg, a dev server, or a missing host", () => {
    for (const h of ["smashy.gg", "www.smashy.gg", "localhost:3000", "p2.localhost:3000", "notvercel.app.example.com", null]) expect(canonicalLinkHeader(h, "/", "")).toBeNull();
  });
});
