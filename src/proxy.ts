// Runs before each request. Keeps the login session fresh, keeps crawlers off the pages that cost
// start.gg requests, and slows down one signed-out address that opens start.gg-backed pages faster
// than a person would (see lib/guestPages.ts).
import { NextResponse, type NextRequest } from "next/server";
import { GUEST_PAGES_RETRY_S, countsAsCrawlerPage, countsAsGuestPage, crawlerName, crawlerOffLimits, isPlayerPage, isAiTrainingCrawler, isCrawler, notABrowser, takeCrawlerPage, takeGuestPage } from "@/lib/guestPages";
import { updateSession } from "@/lib/supabase/proxy";
import { apiBucket, takeApiCall } from "@/lib/apiLimit";
import { canonicalLinkHeader, oldAddressRedirect } from "@/lib/siteMeta";

export async function proxy(request: NextRequest) {
  // robots.txt asks crawlers to skip these pages; the ones that say who they are get told here too.
  // Round 475: and so are scrapers that pose as a browser but don't load pages the way one does.
  // The old address sends page visits to smashy.gg (round 796): one site for people and for Google.
  const moved = oldAddressRedirect(request.headers.get("host"), request.method, request.nextUrl.pathname, request.nextUrl.search);
  if (moved) return NextResponse.redirect(moved, 308);
  const ua = request.headers.get("user-agent");
  // AI training crawlers (round 655): robots.txt asks them to stay off; the ones that come anyway get a
  // cheap refusal here, before any page is built. robots.txt itself stays readable.
  if (isAiTrainingCrawler(ua) && request.nextUrl.pathname !== "/robots.txt") {
    return new NextResponse("Smashy isn't open to AI training crawlers. See /robots.txt.\n", {
      status: 403,
      headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex", "Cache-Control": "public, max-age=86400" },
    });
  }
  // The public API (round 708): always answered as a signed-out visitor would see it, so a sign-in cookie
  // sent along never changes the answer (answers are shared through Vercel's network). Each address has
  // a per-minute allowance.
  if (request.nextUrl.pathname === "/api/v1" || request.nextUrl.pathname.startsWith("/api/v1/")) {
    const address = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
    const { ok, limit } = takeApiCall(address, apiBucket(request.nextUrl.pathname), Date.now());
    if (!ok) {
      return NextResponse.json(
        { error: "Too many requests from this address. Wait a minute and try again." },
        { status: 429, headers: { "Retry-After": "60", "RateLimit-Limit": String(limit), "RateLimit-Remaining": "0", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" } },
      );
    }
    const headers = new Headers(request.headers);
    headers.delete("cookie");
    headers.delete("authorization");
    const response = NextResponse.next({ request: { headers } });
    response.headers.set("RateLimit-Limit", String(limit)); // no "Remaining" here: answers kept by the network would show an old count
    return response;
  }
  // Player pages (round 791) are open to crawlers that name themselves, but not to scrapers that pose as a
  // browser without loading pages like one.
  const posing = isPlayerPage(request.nextUrl.pathname) && !isCrawler(ua) && notABrowser(ua, (name) => request.headers.get(name));
  if (posing || (crawlerOffLimits(request.nextUrl.pathname) && (isCrawler(ua) || notABrowser(ua, (name) => request.headers.get(name))))) {
    return new NextResponse("This page isn't open to crawlers. See /robots.txt.\n", {
      status: 403,
      headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex", "Cache-Control": "no-store" },
    });
  }
  // Round 771: a crawler that names itself opens the start.gg-backed pages it's allowed on (tournaments,
  // weeklies) at a slow pace, counted by its name, since it comes from many addresses.
  const crawler = crawlerName(ua);
  if (crawler && countsAsCrawlerPage(request.nextUrl.pathname, (name) => request.headers.get(name)) && !takeCrawlerPage(crawler, Date.now()).ok) {
    return new NextResponse("Slow down: these pages read start.gg, which allows Smashy only so many requests a minute. Come back in a couple of minutes.\n", {
      status: 429,
      headers: { "Retry-After": String(GUEST_PAGES_RETRY_S), "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
  const { response, signedIn } = await updateSession(request);
  const canonical = canonicalLinkHeader(request.headers.get("host"), request.nextUrl.pathname, request.nextUrl.search);
  if (canonical) response.headers.set("Link", canonical);
  if (countsAsGuestPage(request.nextUrl.pathname, signedIn, (name) => request.headers.get(name))) {
    const address = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
    const { ok, left } = takeGuestPage(address, Date.now());
    if (!ok) {
      return new NextResponse(
        "You're opening a lot of bracket and event pages in a short time. Wait a couple of minutes and try again, or sign in to keep going.\n",
        { status: 429, headers: { "Retry-After": String(GUEST_PAGES_RETRY_S), "RateLimit-Remaining": "0", "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } },
      );
    }
    // Say how many are left, the usual way (it also shows whether the count is holding on the live servers).
    response.headers.set("RateLimit-Remaining", String(left));
  }
  return response;
}

/**
 * Which requests run the proxy (round 1009). Not static files and images, and not the site's own icon,
 * manifest, service worker and robots.txt (they never need a sign-in or a limit). Not the site quietly
 * preloading a link either ("next-router-prefetch"): in the week to Nov 27 those were about two thirds of
 * the proxy's runs, about four per link on screen per visit, and the proxy was ~38% of all server time.
 * A preload only fetches a page's shared outline (partialPrefetching); opening the page is a normal
 * request and still runs everything here.
 *
 * Round 1012: and only the requests it has a job for. A guest opening an ordinary page (the Feed, Discuss,
 * a character page…) needs nothing from it, and those were most of what was left. It still runs for:
 * anyone with a sign-in cookie (keeping the login fresh), the pages with crawler and guest limits
 * (players, tournaments, brackets, sets), AI training crawlers (turned away everywhere), Vercel's own
 * addresses (the old address's redirect, the "real page is on smashy.gg" header), and the public API.
 * Each entry below is one of those; Next's config must be written out, so the page pattern repeats.
 */
export const config = {
  matcher: [
    {
      source: "/((?!(?:_next/static|_next/image|favicon\\.ico|icon|apple-icon|sw\\.js|manifest\\.webmanifest|robots\\.txt)(?:/|$)|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
      has: [{ type: "header", key: "cookie", value: ".*sb-[^=;]*-auth-token.*" }],
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
    {
      source: "/((?:players|events|brackets|sets)/.*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
    // Same names as AI_TRAINING_CRAWLERS in lib/guestPages.ts (a test keeps the two lists together).
    {
      source: "/((?!(?:_next/static|_next/image|favicon\\.ico|icon|apple-icon|sw\\.js|manifest\\.webmanifest|robots\\.txt)(?:/|$)|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
      has: [{ type: "header", key: "user-agent", value: ".*(?:GPTBot|ClaudeBot|anthropic-ai|meta-externalagent|Amazonbot|CCBot|Bytespider|Applebot-Extended|cohere-training-data-crawler|Diffbot|Timpibot|ImagesiftBot|omgili).*" }],
    },
    {
      source: "/((?!(?:_next/static|_next/image|favicon\\.ico|icon|apple-icon|sw\\.js|manifest\\.webmanifest|robots\\.txt)(?:/|$)|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
      has: [{ type: "host", value: ".*\\.vercel\\.app" }],
    },
    // The public API always, even an address that ends like an image (round 717): otherwise it would
    // skip the per-address limit and keep its sign-in cookies.
    "/api/v1/:path*",
  ],
};
