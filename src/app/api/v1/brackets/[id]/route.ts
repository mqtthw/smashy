// One bracket run on Smashy (round 708): its details. The players, sets and placements are at .../results.
import { getHostedEvent } from "@/lib/hostedEvents";
import { apiBracket, apiError, apiFailed, apiJson } from "@/lib/publicApi";
import { isUuid } from "@/lib/siteMeta";
import { createGuestClient } from "@/lib/supabase/guest";

export async function GET(_request: Request, { params }: RouteContext<"/api/v1/brackets/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) return apiError(400, "That isn't a bracket id.");
  try {
    const event = await getHostedEvent(id, createGuestClient());
    if (!event || event.removed) return apiError(404, "No such bracket.");
    return apiJson({ bracket: apiBracket(event) }, event.status === "in_progress" ? "live" : "short");
  } catch (e) {
    return apiFailed("bracket", e);
  }
}
