import Link from "next/link";
import type { Reel } from "@/lib/reels";
import { T } from "@/lib/i18n/client";

/**
 * A sideways row of the top clips, each opening in Reels. `bleed` lets the row run to the screen
 * edges inside a padded parent; `as` is the heading level (h3 when it sits under another heading).
 */
export default function ClipStrip({ reels, headingId, bleed = false, as: Heading = "h2" }: { reels: Reel[]; headingId: string; bleed?: boolean; as?: "h2" | "h3" }) {
  if (reels.length === 0) return null;
  const edge = bleed ? "" : "px-4";
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <div className={`flex items-baseline justify-between ${edge}`}>
        <Heading id={headingId} className="font-bold"><T k="feed.clips.title" /></Heading>
        <Link href="/reels" className="text-sm font-semibold text-brand"><T k="feed.clips.watch" /></Link>
      </div>
      <ul className={`scroll-fade flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] ${bleed ? "-mx-4 px-4" : "px-4"}`}>
        {reels.map((r) => (
          <li key={r.clipId} className="w-32 shrink-0">
            <Link href={`/reels/${encodeURIComponent(r.clipId)}`} className="group flex flex-col gap-1">
              <span className="relative block aspect-[3/4] overflow-hidden rounded-xl bg-neutral-900">
                {r.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" aria-hidden="true" />
                <span className="absolute bottom-1.5 left-2 right-2 line-clamp-2 text-xs font-semibold leading-tight text-white">{r.title || <T k="feed.clips.clip" />}</span>
                <span className="absolute right-1.5 top-1.5 rounded-full bg-black/60 px-1.5 text-[10px] font-semibold text-white">▶</span>
              </span>
              <span className="truncate text-meta text-muted">{r.channelName ?? r.channelLogin}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
