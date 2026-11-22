// The desktop side column's data (round 500): events near the visitor (from their rough location,
// nothing stored) and the next majors, as JSON. Only wide screens ask for it.
import { getSideColumn } from "@/lib/sideColumn";
import { HOME_REGION } from "@/lib/regions";
import { detectedRegion } from "@/lib/viewerRegion";

export async function GET() {
  const region = (await detectedRegion()) ?? HOME_REGION;
  const data = await getSideColumn(region);
  return Response.json(data, { headers: { "Cache-Control": "private, max-age=300" } });
}
