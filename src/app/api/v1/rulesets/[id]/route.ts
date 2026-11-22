// One ruleset with every published version, newest first (round 708).
import { apiError, apiFailed, apiJson, apiRuleset } from "@/lib/publicApi";
import { getRuleset } from "@/lib/scenes";
import { isUuid } from "@/lib/siteMeta";

export async function GET(_request: Request, { params }: RouteContext<"/api/v1/rulesets/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) return apiError(400, "That isn't a ruleset id.");
  try {
    const ruleset = await getRuleset(id);
    if (!ruleset) return apiError(404, "No such ruleset.");
    return apiJson({ ruleset: apiRuleset(ruleset, ruleset.versions) });
  } catch (e) {
    return apiFailed("ruleset", e);
  }
}
