import { mediaBlocks, type PostMediaItem } from "@/lib/postMedia";
import PostImages from "./PostImages";
import PostVideoPlayer from "./PostVideoPlayer";

/** A post's photos and videos in their order: photos next to each other share a grid, each video gets its own player. */
export default function PostMedia({ media }: { media: PostMediaItem[] }) {
  if (!media.length) return null;
  return (
    <>
      {mediaBlocks(media).map((b, i) =>
        b.kind === "images" ? <PostImages key={i} images={b.images} /> : <PostVideoPlayer key={i} video={b.video} />,
      )}
    </>
  );
}
