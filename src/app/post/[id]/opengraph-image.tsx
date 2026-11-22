// Link preview for a post: who wrote it and what they said.
// Read as a guest, so teen posts (signed-in only) and removed posts get the generic card instead,
// the same card as a post that doesn't exist (a preview never reveals that a teen posted).
import { GAMES, isGameKey } from "@/lib/games";
import { BRAND, clip, fitSize, GAME_COLOR, LetterAvatar, MUTED, OG_SIZE, OG_TYPE, NO_STORE, renderOg, SHORT_CARD, siteCard } from "@/lib/ogCard";
import { createGuestClient, hasSupabase } from "@/lib/supabase/guest";
import { isUuid } from "@/lib/siteMeta";
import { postImageForCard } from "@/lib/postImages";
import { POST_VIDEOS_BUCKET } from "@/lib/postVideoLinks";
import { clipPictureForCard, getClipPreview, twitchClipIdIn, withoutLinks } from "@/lib/postPreview";

export const alt = "A post on Smashy";
import { hideInlineSpoilers } from "@/lib/spoilerText";
export const size = OG_SIZE;
export const contentType = OG_TYPE;

type Row = {
  body: string;
  title: string | null;
  spoiler: boolean;
  game: string;
  parent_id: string | null;
  author: { tag: string; handle: string; home_city: string | null } | null;
  images: { path: string; position: number }[];
  videos: { poster_path: string | null }[];
};

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id) || !hasSupabase()) return siteCard();
  const { data, error } = await createGuestClient()
    .from("posts")
    .select("body, title, spoiler, game, parent_id, author:profiles!posts_author_id_fkey ( tag, handle, home_city ), images:post_images ( path, position ), videos:post_videos ( poster_path )")
    .eq("id", id)
    .is("removed_at", null)
    .maybeSingle();
  if (error) return siteCard(NO_STORE); // a busy database isn't "no such post" (round 634)
  const post = data as Row | null;
  if (!post?.author) return siteCard(SHORT_CARD);

  const game = isGameKey(post.game) ? post.game : null;
  const accent = game ? GAME_COLOR[game] : BRAND;
  // The first photo (read as a guest above, so only photos anyone may see) goes behind the words.
  const first = [...(post.images ?? [])].sort((a, b) => a.position - b.position)[0];
  // Spoilers stay hidden in link previews too (no text, no photo); ||hidden bits|| are blacked out.
  // A video post (no photos) uses the video's still picture; the guest read only sees finished videos.
  const poster = post.videos?.[0]?.poster_path ?? null;
  // A Twitch clip link and nothing of Smashy's own to show (round 459): the clip's picture and title.
  const clipId = !post.spoiler && !first && !poster && !post.title ? twitchClipIdIn(hideInlineSpoilers(post.body)) : null;
  const preview = clipId ? await getClipPreview(clipId) : null;
  const background = post.spoiler
    ? null
    : first
      ? await postImageForCard(first.path)
      : poster
        ? await postImageForCard(poster, POST_VIDEOS_BUCKET)
        : preview
          ? await clipPictureForCard(preview.thumbnail)
          : null;
  // Raw links read badly on the card: the words around them, else the clip's title.
  const words = post.spoiler ? "" : withoutLinks(hideInlineSpoilers(post.title ?? post.body));
  const text = post.spoiler ? "Spoiler: tap to read on Smashy" : preview ? (words || `${preview.title} · ${preview.channel}`) : words || hideInlineSpoilers(post.title ?? post.body);
  const body = clip(text, background ? 140 : 220);
  const where = [`@${post.author.handle}`, post.author.home_city].filter(Boolean).join(" · ");

  return renderOg({
    cacheControl: SHORT_CARD,
    label: [game ? GAMES[game].short : null, preview ? "Twitch clip" : post.parent_id ? "Reply" : "Post"].filter(Boolean).join(" · "),
    accent,
    background,
    children: (
      <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <LetterAvatar name={post.author.tag} size={88} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", fontSize: 44, color: "#ffffff" }}>{clip(post.author.tag, 30)}</div>
            <div style={{ display: "flex", fontSize: 28, color: MUTED }}>{where}</div>
          </div>
        </div>
        <div style={{ display: "flex", fontSize: fitSize(body, [[60, 60], [120, 50], [180, 42], [220, 38]]), lineHeight: 1.3, color: "#ffffff" }}>
          {body}
        </div>
      </div>
    ),
  });
}
