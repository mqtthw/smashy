// Structured data for event pages (schema.org Event), so search engines can show events with their
// date and place. Returned as a string that's safe to put inside <script type="application/ld+json">.
export type EventSchemaInput = {
  name: string;
  url: string;
  startIso: string;
  endIso?: string | null;
  online: boolean;
  venueName?: string | null;
  address?: string | null;
  canceled?: boolean;
  image?: string | null;
  description?: string | null;
};

export function eventJsonLd(e: EventSchemaInput): string {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: e.name,
    url: e.url,
    startDate: e.startIso,
    ...(e.endIso ? { endDate: e.endIso } : {}),
    eventStatus: e.canceled ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
    eventAttendanceMode: e.online ? "https://schema.org/OnlineEventAttendanceMode" : "https://schema.org/OfflineEventAttendanceMode",
    location: e.online
      ? { "@type": "VirtualLocation", url: e.url }
      : { "@type": "Place", name: e.venueName ?? e.address ?? "TBA", ...(e.address ? { address: e.address } : {}) },
    ...(e.image ? { image: [e.image] } : {}),
    ...(e.description ? { description: e.description.slice(0, 500) } : {}),
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
