"use client";

// "(8:00 PM for the host, EST)" next to an event's time when the viewer's time zone differs from the
// event's, so "starts at 8 my time" in a description makes sense to everyone. Nothing when they match.
import { useViewerLocale, useViewerTimeZone } from "@/lib/viewerTimeZone";

export default function HostLocalTime({ iso, timeZone }: { iso: string; timeZone: string }) {
  const viewer = useViewerTimeZone();
  const locale = useViewerLocale();
  const at = new Date(iso);
  const fmt = (tz: string) => {
    try {
      return new Intl.DateTimeFormat(locale, { timeZone: tz, hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(at);
    } catch {
      return null;
    }
  };
  const theirs = fmt(timeZone);
  if (!theirs || theirs === fmt(viewer)) return null;
  return <span className="text-muted"> ({theirs} for the host)</span>;
}
