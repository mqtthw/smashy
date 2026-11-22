// Add to calendar: a .ics file for an event hosted on Smashy.
import { getHostedEvent } from "@/lib/hostedEvents";
import { calendarFile } from "@/lib/rsvps";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request, { params }: RouteContext<"/host/[id]/calendar.ics">) {
  const { id } = await params;
  const event = UUID.test(id) ? await getHostedEvent(id).catch(() => null) : null;
  if (!event || event.removed || event.status === "canceled") return new Response("Event not found", { status: 404 });
  const { origin } = new URL(request.url);
  const startAt = Math.floor(Date.parse(event.startsAt) / 1000);
  const body = calendarFile({
    uid: `hosted-${event.id}`,
    name: event.name,
    startAt,
    endAt: startAt + 3 * 3600, // a typical bracket night; the host can run longer
    location: event.online ? "Online" : event.location,
    url: `${origin}/host/${event.id}`,
    description: `Hosted on Smashy${event.host ? ` by ${event.host.tag}` : ""}. Sign-ups, check-in and your sets are on the event page.`,
  });
  return new Response(body, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="smashy-event.ics"` },
  });
}
