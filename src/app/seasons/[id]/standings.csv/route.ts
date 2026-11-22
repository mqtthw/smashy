// A season's standings as a spreadsheet file (CSV). Teens' names only for signed-in viewers, as on the page.
import { getSeason, getSeasonEvents, getStandings } from "@/lib/seasons";
import { standingsCsv } from "@/lib/seasonsMath";
import { getUserId } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";

export async function GET(_request: Request, { params }: RouteContext<"/seasons/[id]/standings.csv">) {
  const { id } = await params;
  const season = await getSeason(id);
  if (!season || season.removed) return new Response("Season not found", { status: 404 });
  const [userId, t] = await Promise.all([getUserId(), getT()]);
  const events = await getSeasonEvents(season.id);
  const rows = await getStandings(season, events, userId);
  const hidden = new Set(rows.filter((r) => r.hidden).map((r) => r.key));
  const body = standingsCsv(rows, (r) => hidden.has(r.key), t("season.hiddenPlayer"), events);
  const file = season.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "season";
  return new Response(body, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${file}.csv"`, "Cache-Control": "private, no-store" },
  });
}
