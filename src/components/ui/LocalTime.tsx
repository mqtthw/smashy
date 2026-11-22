"use client";

import { useViewerLocale, useViewerTimeZone } from "@/lib/viewerTimeZone";

const STYLES = {
  time: { hour: "numeric", minute: "2-digit" },
  date: { month: "short", day: "numeric", year: "numeric" },
  shortDate: { month: "short", day: "numeric" },
  dateTime: { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
  dayDateTime: { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
  eventDate: { weekday: "short", month: "short", day: "numeric" },
  monthYear: { month: "long", year: "numeric" },
} satisfies Record<string, Intl.DateTimeFormatOptions>;

export type LocalTimeStyle = keyof typeof STYLES;

/** A date or time in the reader's own time zone and date style (pages built on the server fix it right after loading). */
export default function LocalTime({ iso, style = "dateTime", zone = false }: { iso: string; style?: LocalTimeStyle; zone?: boolean }) {
  const tz = useViewerTimeZone();
  const locale = useViewerLocale();
  const text = new Intl.DateTimeFormat(locale, { ...STYLES[style], timeZone: tz, ...(zone ? { timeZoneName: "short" } : {}) }).format(new Date(iso));
  return <time dateTime={iso}>{text}</time>;
}
