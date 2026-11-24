"use client";

import { SpeedInsights } from "@vercel/speed-insights/next";
import { keepSpeedEvent } from "@/lib/speedEvents";

/** Vercel Speed Insights, minus the pages whose measurements aren't worth their share of the monthly allowance (see speedEvents.ts). */
export default function SpeedInsightsFiltered() {
  return <SpeedInsights beforeSend={(event) => (keepSpeedEvent(event.url) ? event : null)} />;
}
