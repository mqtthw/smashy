import Link from "next/link";
import type { ClipItem } from "@/lib/clipsOfWeekData";
import Icon from "@/components/ui/Icon";
import { T } from "@/lib/i18n/client";

/**
 * "Clips of the week" at the top of the Feed (round 751): the most liked clips of the last 7 days, from
 * posts and from Reels (round 759), one per player or channel, each opening its post or Reels page. Nothing is shown in a week with no
 * liked clips.
 */
export default async function ClipsOfWeek({ clips: given }: { clips: ClipItem[] | Promise<ClipItem[]> }) {
  // The Feed starts the lookup itself, alongside its posts, and hands over the answer (or the lookup still
  // running, when it was slow), so this block arrives with the posts instead of pushing them down (round 811).
  const clips = await given;
  if (!clips.length) return null;
  return (
    <section aria-labelledby="clips-of-week" className="flex flex-col gap-2 border-b border-line px-4 py-3">
      <div>
        <h2 id="clips-of-week" className="font-bold"><Icon name="trophy" /> <T k="feed.clipsWeek.title" /></h2>
        <p className="text-meta text-muted"><T k="feed.clipsWeek.sub" /></p>
      </div>
      <ol className="flex flex-col gap-2">
        {clips.map((c, i) => (
          <li key={c.key}>
            <Link href={c.href} className="group flex items-center gap-3 rounded-xl p-1 hover:bg-surface">
              <span className="w-4 shrink-0 text-center text-sm font-bold text-muted" aria-hidden="true">{i + 1}</span>
              <span className="relative block h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-neutral-900">
                {c.picture && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.picture} alt="" loading="lazy" className="h-full w-full object-cover" />
                )}
                <span className="absolute inset-0 flex items-center justify-center text-white/90" aria-hidden="true">▶</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <span className="truncate">{c.tag}</span>
                  {c.handle && <span className="truncate font-normal text-muted">@{c.handle}</span>}
                </span>
                <span className="block truncate text-sm text-muted">{c.words || <T k="feed.clips.clip" />}</span>
              </span>
              <span className="shrink-0 text-sm font-semibold text-muted"><Icon name="heart" /> {c.likes}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
