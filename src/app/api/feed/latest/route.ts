// When the newest public posts were made (round 748), for the "N new posts" button on a guest's Feed.
// A guest's browser used to download the whole Supabase library after a minute and count rows itself
// every minute; now it asks this instead. The answer is the same for every guest, so Vercel's network
// keeps it for a minute: the database is asked about once a minute per game tab, however many guests
// have the Feed open. Only times are returned (no post ids or text), as a guest could see them.
import { FEED_GAMES } from "@/lib/postConstants";
import { createGuestClient } from "@/lib/supabase/guest";

const KEEP = "public, max-age=30, s-maxage=60, stale-while-revalidate=120";

export async function GET(request: Request) {
  const game = new URL(request.url).searchParams.get("game");
  if (game !== null && !(FEED_GAMES as readonly string[]).includes(game)) return Response.json({ at: [] }, { status: 400, headers: { "Cache-Control": "no-store" } });
  // The same posts the Feed's own count used: top-level posts, not clip, set or ruleset talk.
  let q = createGuestClient().from("feed_items").select("at").eq("kind", "post").is("ruleset_id", null).is("set_ref_id", null).is("reel_clip_id", null);
  if (game) q = q.eq("game", game);
  const { data, error } = await q.order("at", { ascending: false }).limit(20);
  if (error) return Response.json({ at: [] }, { status: 503, headers: { "Cache-Control": "no-store" } });
  return Response.json({ at: (data ?? []).map((r) => r.at).filter(Boolean) }, { headers: { "Cache-Control": KEEP } });
}
