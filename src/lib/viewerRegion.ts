// Which region to show someone: their profile setting, or for visitors the rough location Vercel
// detects for the request (country + state/province; not stored), or Texas, where Smashy started.
import "server-only";
import { headers } from "next/headers";
import { HOME_REGION, isRegion, regionFromGeo } from "./regions";
import { getMyRegion } from "./viewer";

export async function getProfileRegion(userId: string | null): Promise<string | null> {
  const region = await getMyRegion(userId); // shares the page's one read of the profile row
  return isRegion(region) ? region : null;
}

export async function detectedRegion(): Promise<string | null> {
  const h = await headers();
  return regionFromGeo(h.get("x-vercel-ip-country"), h.get("x-vercel-ip-country-region"));
}

/** `override` = a region picked on the page (e.g. Events' region menu). */
export async function getViewerRegion(userId: string | null, override?: string | null): Promise<string> {
  if (isRegion(override)) return override;
  return (await getProfileRegion(userId)) ?? (await detectedRegion()) ?? HOME_REGION;
}
