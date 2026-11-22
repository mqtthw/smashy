// Add to calendar: a .ics file for the next expected edition of a weekly.
import { getExpectedWeekly } from "@/lib/events";
import { calendarFile } from "@/lib/rsvps";

export async function GET(request: Request, { params }: RouteContext<"/events/weekly/[id]/calendar.ics">) {
  const { id } = await params;
  const w = await getExpectedWeekly(id).catch(() => null);
  if (!w) return new Response("Weekly not found", { status: 404 });
  const { origin } = new URL(request.url);
  const body = calendarFile({
    uid: `weekly-${w.id}-${w.startAt}`,
    name: w.name,
    startAt: w.startAt,
    endAt: null,
    location: w.venueAddress ?? w.venueName ?? w.city,
    url: `${origin}/events/weekly/${w.id}`,
    description: "Expected date, based on past events. Double-check with the organizer.",
  });
  return new Response(body, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="weekly.ics"` },
  });
}
