"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { countThisBrowser, keepSpeedEvent } from "@/lib/speedEvents";

const counted = () => (typeof navigator === "undefined" ? true : countThisBrowser(navigator.userAgent));

/** Vercel Speed Insights, minus the pages and the scraper whose measurements aren't worth their share of the monthly allowance (see speedEvents.ts). */
export default function SpeedInsightsFiltered() {
  return <SpeedInsights beforeSend={(event) => (counted() && keepSpeedEvent(event.url) ? event : null)} />;
}

/** Vercel Web Analytics (visit counts), minus the scraper's visits (round 823, see speedEvents.ts). */
export function AnalyticsFiltered() {
  return <Analytics beforeSend={(event) => (counted() ? event : null)} />;
}
