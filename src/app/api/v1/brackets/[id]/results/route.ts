// A Smashy bracket's results in the Open Bracket Format (round 708): the same file as /host/{id}/results.json.
import { apiError, apiFailed, apiJson } from "@/lib/publicApi";
import { getResultsFile } from "@/lib/resultsFile";
import { isUuid } from "@/lib/siteMeta";

export async function GET(_request: Request, { params }: RouteContext<"/api/v1/brackets/[id]/results">) {
  const { id } = await params;
  if (!isUuid(id)) return apiError(400, "That isn't a bracket id.");
  try {
    const found = await getResultsFile(id);
    if (!found) return apiError(404, "No results for this bracket (it doesn't exist, was canceled, or hasn't started).");
    return apiJson(found.file, found.finished ? "short" : "live");
  } catch (e) {
    return apiFailed("bracket results", e);
  }
}
