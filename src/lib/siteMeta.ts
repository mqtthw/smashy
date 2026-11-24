// Shared page metadata: the site's address (link previews need full URLs) and a helper that sets a
// page's title/description for browser tabs AND link previews in one go.
import type { Metadata } from "next";

export function siteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return new URL(explicit);
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return new URL(`https://${vercel}`);
  return new URL(`http://localhost:${process.env.PORT ?? 3000}`);
}

/**
 * For a page opened on one of Vercel's own addresses (the old smashy-five.vercel.app still serves the
 * whole site): the "Link" header that tells search engines the same page on smashy.gg is the real one
 * (round 786). Without it Google sees two copies of every page and may list the old address. Null on
 * smashy.gg itself and anywhere else (a dev server).
 */
export function canonicalLinkHeader(host: string | null, pathname: string, search: string, canonicalOrigin = "https://smashy.gg"): string | null {
  const h = (host ?? "").toLowerCase().split(":")[0];
  if (!h.endsWith(".vercel.app")) return null;
  return `<${canonicalOrigin}${pathname}${search}>; rel="canonical"`;
}

/** Smashy's first address, from before smashy.gg. It still serves the site. */
export const OLD_HOST = "smashy-five.vercel.app";

/**
 * Where a page visit on the old address should go (round 796, Matthew: "Yes, redirect it"): the same
 * page on smashy.gg. Only page visits (GET and HEAD); sign-in returns (/auth), the site's own requests
 * (/api, /_next) and form posts are left alone so nothing in flight on the old address breaks. Null
 * everywhere else, including Vercel's preview addresses, which must stay viewable.
 */
export function oldAddressRedirect(host: string | null, method: string, pathname: string, search: string, canonicalOrigin = "https://smashy.gg"): string | null {
  if ((host ?? "").toLowerCase().split(":")[0] !== OLD_HOST) return null;
  if (method !== "GET" && method !== "HEAD") return null;
  if (/^\/(api|auth|_next)(\/|$)/.test(pathname)) return null;
  return `${canonicalOrigin}${pathname}${search}`;
}

/**
 * The site's own preview picture (app/opengraph-image.tsx). A page that sets `openGraph` replaces
 * the layout's, picture included, so it names this one again. Careful: a picture named here also
 * beats the route's own opengraph-image file, so routes with one use ownPictureMeta.
 */
export const SITE_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: "Smashy" };

/**
 * Title + description for a page and its link preview, with the site's preview picture (for a
 * route with its own opengraph-image file, use ownPictureMeta).
 */
export function pageMeta(title: string, description: string, extra: Metadata = {}): Metadata {
  return {
    title,
    description,
    openGraph: { title, description, siteName: "Smashy", type: "website", images: [SITE_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [SITE_IMAGE.url] },
    ...extra,
  };
}

/** pageMeta for a route with its own opengraph-image file: that file is the picture. */
export function ownPictureMeta(title: string, description: string, extra: Metadata = {}): Metadata {
  return {
    title,
    description,
    openGraph: { title, description, siteName: "Smashy", type: "website" },
    twitter: { card: "summary_large_image", title, description },
    ...extra,
  };
}

/** A finished tournament's page title: "Genesis 8 (2022) results and top 8". The year is added unless the name already has it. */
export function resultsTitle(name: string, year: number): string {
  return `${name}${name.includes(String(year)) ? "" : ` (${year})`} results and top 8`;
}

/** Shortens text to `max` characters on a word boundary, with "…". */
export function clip(text: string, max: number): string {
  const s = text.replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:!?-]+$/, "")}…`;
}

/** True for a database id like "1ed5bf07-9a95-46f6-a014-82cb5ac37b04" (checked before querying with it). */
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
