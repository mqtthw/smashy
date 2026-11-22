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
