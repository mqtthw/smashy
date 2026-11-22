// One Reels clip by its id (round 712): a Twitch clip slug or a YouTube video id.
import { API_REEL_COLUMNS, apiError, apiFailed, apiJson, apiReel, type ApiReelRow } from "@/lib/publicApi";
import { createGuestClient } from "@/lib/supabase/guest";

export async function GET(_request: Request, { params }: RouteContext<"/api/v1/reels/[clipId]">) {
  const { clipId } = await params;
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(clipId)) return apiError(400, "That isn't a clip id.");
  try {
    const { data, error } = await createGuestClient().from("reels").select(API_REEL_COLUMNS).eq("clip_id", clipId).maybeSingle();
    if (error) throw error;
    if (!data) return apiError(404, "No such clip (or it was taken down).");
    return apiJson({ reel: apiReel(data as ApiReelRow) });
  } catch (e) {
    return apiFailed("reel", e);
  }
}
