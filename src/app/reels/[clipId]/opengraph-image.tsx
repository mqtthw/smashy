// Link preview for a Reels clip: the clip's own thumbnail behind its title and channel.
// Read as a guest, so hidden clips and blocked channels get the generic card.
import { GAMES, isGameKey } from "@/lib/games";
import { BRAND, clip, fetchImage, fitSize, GAME_COLOR, MUTED, OG_SIZE, OG_TYPE, renderOg, siteCard } from "@/lib/ogCard";
import { createGuestClient, hasSupabase } from "@/lib/supabase/guest";

export const alt = "A clip on Smashy Reels";
export const size = OG_SIZE;
export const contentType = OG_TYPE;

type Row = { title: string; game: string; channel_login: string; channel_name: string | null; view_count: number; thumbnail_url: string | null };

export default async function Image({ params }: { params: Promise<{ clipId: string }> }) {
  const clipId = decodeURIComponent((await params).clipId);
  if (!/^[\w-]{1,120}$/.test(clipId) || !hasSupabase()) return siteCard();
  const { data } = await createGuestClient()
    .from("reels")
    .select("title, game, channel_login, channel_name, view_count, thumbnail_url")
    .eq("clip_id", clipId)
    .maybeSingle();
  const reel = data as Row | null;
  if (!reel) return siteCard();

  const game = isGameKey(reel.game) ? reel.game : null;
  const title = clip(reel.title || "Untitled clip", 90);
  const views = new Intl.NumberFormat("en-US", { notation: "compact" }).format(reel.view_count);

  return renderOg({
    label: [game ? GAMES[game].short : null, "Clip"].filter(Boolean).join(" · "),
    accent: game ? GAME_COLOR[game] : BRAND,
    background: await fetchImage(reel.thumbnail_url),
    children: (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", flex: 1, gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {/* Play button */}
          <div style={{ display: "flex", width: 76, height: 76, borderRadius: 76, background: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center" }}>
            <svg width="32" height="36" viewBox="0 0 32 36" style={{ marginLeft: 6 }}>
              <path d="M0 0 L32 18 L0 36 Z" fill="#0f1419" />
            </svg>
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "#d6d9dc" }}>{`${reel.channel_name ?? reel.channel_login} · ${views} views`}</div>
        </div>
        <div style={{ display: "flex", fontSize: fitSize(title, [[40, 64], [70, 54], [90, 48]]), lineHeight: 1.2, color: "#ffffff" }}>{title}</div>
        <div style={{ display: "flex", fontSize: 26, color: MUTED }}>Watch and discuss on Smashy Reels</div>
      </div>
    ),
  });
}
