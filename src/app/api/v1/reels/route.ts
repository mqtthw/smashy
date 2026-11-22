// Reels clips (round 712): Twitch clips and YouTube Shorts from Smash channels, as Smashy saved them.
// sort=new (default): newest first. sort=top: most viewed in the last `days` (default 7, up to 30).
// Videos members attach to their own posts aren't included. Paged with limit (up to 50) and offset.
import { isGameKey } from "@/lib/games";
import { API_REEL_COLUMNS, apiError, apiFailed, apiJson, apiReel, type ApiReelRow } from "@/lib/publicApi";
import { createGuestClient } from "@/lib/supabase/guest";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const game = params.get("game");
  const sort = params.get("sort") ?? "new";
  const days = Number(params.get("days") ?? 7);
  const limit = Number(params.get("limit") ?? 20);
  const offset = Number(params.get("offset") ?? 0);
  if (game !== null && !isGameKey(game)) return apiError(400, "Unknown game. See /api/v1/games for the keys.");
  if (sort !== "new" && sort !== "top") return apiError(400, "sort must be new or top.");
  if (!Number.isInteger(days) || days < 1 || days > 30) return apiError(400, "days must be between 1 and 30.");
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) return apiError(400, "limit must be between 1 and 50.");
  if (!Number.isInteger(offset) || offset < 0 || offset > 1000) return apiError(400, "offset must be between 0 and 1000.");
  try {
    let q = createGuestClient().from("reels").select(API_REEL_COLUMNS).eq("low_quality", false);
    if (game) q = q.eq("game", game);
    q = sort === "top"
      ? q.gt("created_at", new Date(Date.now() - days * 86400e3).toISOString()).order("view_count", { ascending: false }).order("created_at", { ascending: false })
      : q.order("created_at", { ascending: false });
    const { data, error } = await q.range(offset, offset + limit); // one extra, to know if there's more
    if (error) throw error;
    const rows = (data ?? []) as ApiReelRow[];
    return apiJson({ game, sort, ...(sort === "top" ? { days } : {}), offset, hasMore: rows.length > limit, reels: rows.slice(0, limit).map(apiReel) });
  } catch (e) {
    return apiFailed("reels", e);
  }
}
