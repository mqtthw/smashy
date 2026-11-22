// Community rulesets made by scenes on Smashy (round 708), with each one's latest version.
import { isGameKey } from "@/lib/games";
import { apiError, apiFailed, apiJson, apiRuleset } from "@/lib/publicApi";
import { getAllRulesets } from "@/lib/scenes";

export async function GET(request: Request) {
  const game = new URL(request.url).searchParams.get("game");
  if (game !== null && !isGameKey(game)) return apiError(400, "Unknown game. See /api/v1/games for the keys.");
  try {
    const rulesets = await getAllRulesets(game ?? undefined);
    return apiJson({ game, rulesets: rulesets.map((r) => apiRuleset(r)) });
  } catch (e) {
    return apiFailed("rulesets", e);
  }
}
