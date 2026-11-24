// robots.txt: public pages are open to search engines; private and account pages aren't.
// Neither are pages that ask start.gg for data each time they're opened (brackets from other sites,
// set pages, comparing two players, calendar files): crawlers walking those use up the site's start.gg allowance.
// A player's own page is open (round 791): guests and crawlers get Smashy's saved copy or keep to a site-wide pace.
import type { MetadataRoute } from "next";
import { AI_TRAINING_CRAWLERS } from "@/lib/guestPages";
import { siteUrl } from "@/lib/siteMeta";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl().origin;
  return {
    rules: [
      // AI training crawlers: the whole site is off limits (round 655, see AI_TRAINING_CRAWLERS).
      { userAgent: AI_TRAINING_CRAWLERS, disallow: "/" },
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/auth/", "/messages", "/notifications", "/saved", "/profile", "/my-sets", "/welcome", "/invite", "/link/", "/discuss/new", "/highlights/new", "/reels/share", "/design", "/sets/", "/players/compare", "/brackets/", "/*/calendar.ics", "/*?*tab=players", "/*?*before=", "/*?*at="],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
