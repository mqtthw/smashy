// One tournament by its start.gg slug (round 708), e.g. /api/v1/events/genesis-x4. Kept a while by
// Smashy's own cache; a tournament it hasn't seen yet is looked up on start.gg (a tighter per-minute allowance).
import { apiError, apiFailed, apiJson, apiTournament } from "@/lib/publicApi";
import { getTournament } from "@/lib/startgg";

export async function GET(_request: Request, { params }: RouteContext<"/api/v1/events/[...slug]">) {
  const slug = (await params).slug.join("/");
  if (!/^(parrygg\/)?[a-z0-9-]{1,120}$/i.test(slug)) return apiError(400, "That isn't a tournament slug.");
  try {
    const t = await getTournament(slug);
    if (!t) return apiError(404, "No such tournament, or it has no Smash brackets.");
    return apiJson({ tournament: apiTournament(t) });
  } catch (e) {
    return apiFailed("event", e);
  }
}
