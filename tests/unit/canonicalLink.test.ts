// Pages opened on Vercel's own addresses point search engines at smashy.gg (round 786).
import { describe, expect, it } from "vitest";
import { canonicalLinkHeader, oldAddressRedirect, resultsTitle } from "@/lib/siteMeta";

describe("canonicalLinkHeader", () => {
  it("points a vercel.app page at the same page on smashy.gg", () => {
    expect(canonicalLinkHeader("smashy-five.vercel.app", "/history", "")).toBe('<https://smashy.gg/history>; rel="canonical"');
    expect(canonicalLinkHeader("Smashy-Five.vercel.app:443", "/games/melee", "?x=1")).toBe('<https://smashy.gg/games/melee?x=1>; rel="canonical"');
  });
  it("adds nothing on smashy.gg, a dev server, or a missing host", () => {
    for (const h of ["smashy.gg", "www.smashy.gg", "localhost:3000", "p2.localhost:3000", "notvercel.app.example.com", null]) expect(canonicalLinkHeader(h, "/", "")).toBeNull();
  });
});

describe("oldAddressRedirect", () => {
  it("sends a page visit on the old address to the same page on smashy.gg", () => {
    expect(oldAddressRedirect("smashy-five.vercel.app", "GET", "/history", "")).toBe("https://smashy.gg/history");
    expect(oldAddressRedirect("Smashy-Five.vercel.app:443", "HEAD", "/search", "?tab=players&q=zain")).toBe("https://smashy.gg/search?tab=players&q=zain");
    expect(oldAddressRedirect("smashy-five.vercel.app", "GET", "/", "")).toBe("https://smashy.gg/");
    expect(oldAddressRedirect("smashy-five.vercel.app", "GET", "/apiary", "")).toBe("https://smashy.gg/apiary"); // not /api
  });
  it("leaves sign-in returns, the site's own requests and form posts alone", () => {
    for (const path of ["/auth/callback", "/api/v1/majors", "/api", "/_next/data/x.json"]) expect(oldAddressRedirect("smashy-five.vercel.app", "GET", path, "")).toBeNull();
    expect(oldAddressRedirect("smashy-five.vercel.app", "POST", "/help", "")).toBeNull();
  });
  it("does nothing on smashy.gg, a preview address or a dev server", () => {
    for (const h of ["smashy.gg", "smashy-git-main-smashy2.vercel.app", "localhost:3000", null]) expect(oldAddressRedirect(h, "GET", "/", "")).toBeNull();
  });
});

describe("resultsTitle", () => {
  it("says results and top 8, with the year unless the name has it", () => {
    expect(resultsTitle("Genesis 8", 2022)).toBe("Genesis 8 (2022) results and top 8");
    expect(resultsTitle("Supernova 2026", 2026)).toBe("Supernova 2026 results and top 8");
  });
});
