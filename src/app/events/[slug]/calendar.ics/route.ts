// Add to calendar: a .ics file for a tournament.
import { calendarFile } from "@/lib/rsvps";
import { getTournament } from "@/lib/startgg";

export async function GET(request: Request, { params }: RouteContext<"/events/[slug]/calendar.ics">) {
  const { slug } = await params;
  const t = await getTournament(slug).catch(() => null);
  if (!t) return new Response("Event not found", { status: 404 });
  const { origin } = new URL(request.url);
  const body = calendarFile({
    uid: `tournament-${t.id}`,
    name: t.name,
    startAt: t.startAt,
    endAt: t.endAt,
    location: t.venueAddress ?? t.venueName ?? t.city,
    url: `${origin}/events/${t.slug}`,
    description: `Sign up: ${t.registerUrl}`,
  });
  return new Response(body, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="${t.slug.replace(/[^a-z0-9-]/gi, "")}.ics"` },
  });
}
