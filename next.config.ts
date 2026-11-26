import type { NextConfig } from "next";

// Content security policy, the parts that cost nothing (round 573, code review S8): no plug-in content
// (Flash-style <object>/<embed>), and the page's base address can't be changed by injected HTML.
// Rules for scripts are left out on purpose: Next's
// way of allowing its own scripts (a per-visit nonce) would make every page render per visit, undoing
// the instant shells. So is form-action: Chrome applies it to sign-in redirects (Discord, Apple).
const CSP_BASE = "object-src 'none'; base-uri 'self'";

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    // Photos on posts go through a server action. The browser shrinks them first (usually well
    // under 1 MB); this leaves room for big ones. (Vercel's own limit is 4.5 MB per request.)
    serverActions: { bodySizeLimit: "4mb" },
    // Round 553 (Matthew: "it should be instant"): a page opened in the last minute shows again
    // straight away when you go back to it (Feed → Events → Feed), instead of asking the server again.
    // Posting, liking, following and the like refresh it as before; the new-posts banner and the
    // unread counts stay live on their own.
    staleTimes: { dynamic: 60 },
  },
  images: {
    // Tournament banners and logos come from start.gg's image host.
    remotePatterns: [{ protocol: "https", hostname: "images.start.gg" }],
    // Loaded straight from start.gg, not resized by Vercel (round 651): the free plan's monthly
    // allowance of image resizes ran out on 2026-11-21 and Vercel answered 402, so banners and logos
    // stopped showing. start.gg's own copies are a little bigger but always load.
    unoptimized: true,
  },
  partialPrefetching: true,
  // Videos on posts are re-saved with ffmpeg (lib/postVideos.ts). The package points at a program
  // file next to it, so it's loaded as-is (not bundled), and that file ships with the one route
  // that runs it.
  serverExternalPackages: ["ffmpeg-static"],
  outputFileTracingIncludes: { "/api/post-videos/finish": ["./node_modules/ffmpeg-static/ffmpeg*"] },
  // The service worker (push notifications) must always be fetched fresh so fixes reach phones.
  // Past tournaments moved onto the Brackets page (round 854); the search's ?q=…&region=… carries over.
  async redirects() {
    return [{ source: "/events/past", destination: "/brackets", permanent: true }];
  },
  async headers() {
    return [
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] },
      {
        // Baseline protections on every page: browsers don't guess file types, other sites only learn
        // Smashy's address (not which page) from links, and pages can't ask for the camera,
        // microphone, payments or USB. Location: only Smashy's own pages may ask (Events' "Near me",
        // round 855), and the browser still asks the visitor first.
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=()" },
        ],
      },
      {
        // Other sites can't put Smashy in a frame (clickjacking). The one exception is a hosted
        // bracket's embed page, /host/<id>/embed, which exists to be framed on a TO's website: it
        // shows only what's public and has nothing on it that changes anything.
        source: "/:path((?!host/[^/]+/embed$).*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: `frame-ancestors 'self'; ${CSP_BASE}` },
        ],
      },
      // The embed page gets the same rules, minus the framing one.
      { source: "/host/:id/embed", headers: [{ key: "Content-Security-Policy", value: CSP_BASE }] },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
    // sql.js (reading a Slippipedia database on /replays) mentions Node's fs and path for when it
    // runs on a server; in the browser those are never used, so browser builds get an empty stand-in.
    resolveAlias: {
      fs: { browser: "./src/lib/emptyModule.ts" },
      // Browsers get only the English phrases browser code shows (round 565): the full English was
      // the largest piece of script on a first visit. tests/unit/enClient.test.ts keeps it complete,
      // and a phrase it misses fetches the full English (src/lib/i18n/client.tsx).
      "@/lib/i18n/en": { browser: "./src/lib/i18n/en.client.ts" },
      // The same for Spanish, Japanese and French (round 746).
      "@/lib/i18n/es": { browser: "./src/lib/i18n/es.client.ts" },
      "@/lib/i18n/ja": { browser: "./src/lib/i18n/ja.client.ts" },
      "@/lib/i18n/fr": { browser: "./src/lib/i18n/fr.client.ts" },
      path: { browser: "./src/lib/emptyModule.ts" },
    },
  },
};

export default nextConfig;
