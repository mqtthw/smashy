// Rounds 1009 and 1012: which requests run the proxy. Built with Next's own matcher builder (the one the
// build uses), and the has/missing conditions checked the way Next checks them (anchored patterns).
import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { config } from "@/proxy";
import { AI_TRAINING_CRAWLERS } from "@/lib/guestPages";

type Cond = { type: string; key?: string; value?: string };
type Matcher = { regexp: string; has?: Cond[]; missing?: Cond[] };
// Next's internal builder (not in its type files), so it's loaded untyped.
const { getMiddlewareMatchers } = createRequire(import.meta.url)("next/dist/build/analysis/get-page-static-info") as {
  getMiddlewareMatchers: (matcher: unknown, nextConfig: unknown) => Matcher[];
};
const matchers = getMiddlewareMatchers(config.matcher, { i18n: undefined });

const BROWSER = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36";
const SIGNED_IN = "theme=dark; sb-pemwbclxvdjqbyomumjc-auth-token=base64-abc";
const SIGNED_IN_SPLIT = "sb-pemwbclxvdjqbyomumjc-auth-token.0=base64-abc; sb-pemwbclxvdjqbyomumjc-auth-token.1=def";

function holds(c: Cond, headers: Record<string, string>): boolean {
  const v = c.type === "host" ? headers.host?.split(":")[0].toLowerCase() : headers[(c.key ?? "").toLowerCase()];
  if (v === undefined) return false;
  return c.value === undefined || new RegExp(`^${c.value}$`).test(v);
}

function runs(path: string, headers: Record<string, string> = {}): boolean {
  const h = { host: "smashy.gg", "user-agent": BROWSER, ...headers };
  return matchers.some((m) => new RegExp(m.regexp).test(path) && (m.has ?? []).every((c) => holds(c, h)) && !(m.missing ?? []).some((c) => holds(c, h)));
}

describe("proxy matcher", () => {
  it("runs for a signed-in visitor's pages and in-site loads", () => {
    for (const cookie of [SIGNED_IN, SIGNED_IN_SPLIT]) {
      for (const p of ["/", "/discuss", "/players/123", "/api/side", "/sitemap.xml"]) expect(runs(p, { cookie }), p).toBe(true);
      expect(runs("/discuss", { cookie, rsc: "1" })).toBe(true);
    }
  });
  it("skips a guest's ordinary pages", () => {
    for (const p of ["/", "/discuss", "/reels", "/games/melee/fox/vs/falco", "/history", "/api/side"]) expect(runs(p), p).toBe(false);
    expect(runs("/", { cookie: "theme=dark" })).toBe(false);
  });
  it("runs for everyone on the pages with crawler and guest limits", () => {
    for (const p of ["/players/123", "/players/compare", "/events/genesis-x4", "/events/weekly/x", "/events/x/calendar.ics", "/brackets/startgg/1", "/sets/startgg/1", "/brackets/startgg/1/top8.png"]) {
      expect(runs(p), p).toBe(true);
      expect(runs(p, { "user-agent": "Googlebot/2.1" }), p).toBe(true);
    }
  });
  it("runs for AI training crawlers everywhere", () => {
    for (const name of AI_TRAINING_CRAWLERS) expect(runs("/discuss", { "user-agent": `Mozilla/5.0 (compatible; ${name}/1.0)` }), name).toBe(true);
    expect(runs("/discuss", { "user-agent": "Mozilla/5.0 (compatible; Claude-SearchBot/1.0)" })).toBe(false);
  });
  it("runs on Vercel's own addresses (redirect, canonical header)", () => {
    expect(runs("/discuss", { host: "smashy-five.vercel.app" })).toBe(true);
    expect(runs("/discuss", { host: "smashy-abc-smashy2.vercel.app" })).toBe(true);
  });
  it("skips link preloads", () => {
    expect(runs("/discuss", { cookie: SIGNED_IN, rsc: "1", "next-router-prefetch": "1" })).toBe(false);
    expect(runs("/events/genesis-x4", { rsc: "1", "next-router-prefetch": "1" })).toBe(false);
    expect(runs("/discuss", { cookie: SIGNED_IN, purpose: "prefetch" })).toBe(false);
  });
  it("skips static files, icons, the manifest, the service worker and robots.txt", () => {
    for (const p of ["/_next/static/x.js", "/favicon.ico", "/icon", "/apple-icon", "/sw.js", "/manifest.webmanifest", "/robots.txt", "/a/b.png"]) expect(runs(p, { cookie: SIGNED_IN }), p).toBe(false);
  });
  it("always runs for the public API, preloaded or not", () => {
    expect(runs("/api/v1/players/1.png")).toBe(true);
    expect(runs("/api/v1/events", { "next-router-prefetch": "1" })).toBe(true);
  });
});
