// The public results file of an event hosted on Smashy, in the Open Bracket Format (a shared JSON
// format for bracket data): players, seeds, placements and every set. It's there for ranking sites
// and other tools, so any site may read it. It is built from what a signed-out visitor can see,
// whoever asks, which is also why it's safe to let the network keep a copy for a moment.
import { getResultsFile } from "@/lib/resultsFile";
import { isUuid } from "@/lib/siteMeta";

const HEADERS = { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*", "X-Robots-Tag": "noindex" };
const reply = (body: unknown, status: number, cache: string) => new Response(JSON.stringify(body, null, 2), { status, headers: { ...HEADERS, "Cache-Control": cache } });

export async function GET(_request: Request, { params }: RouteContext<"/host/[id]/results.json">) {
  const { id } = await params;
  try {
    const found = isUuid(id) ? await getResultsFile(id) : null;
    if (!found) return reply({ error: "There's no results file for this event (it doesn't exist, was canceled, or its bracket hasn't started)." }, 404, "no-store");
    // A finished bracket rarely changes (a TO can still correct a result); a running one changes with every set.
    return reply(found.file, 200, found.finished ? "public, max-age=60, s-maxage=60, stale-while-revalidate=600" : "public, max-age=15, s-maxage=15, stale-while-revalidate=60");
  } catch (e) {
    console.error("results file failed", id, e instanceof Error ? e.message : e);
    return reply({ error: "Couldn't load the results right now. Try again in a minute." }, 503, "no-store");
  }
}
