import CopyResults from "@/components/host/CopyResults";
import { podiumPlacements, type Podium as PodiumData } from "@/lib/brackets/podium";
import { resultsText, type ResultsWords } from "@/lib/resultsText";
import type { SetPlayer } from "@/lib/brackets/types";
import { T } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/core";
import PlaceMark from "@/components/ui/PlaceMark";

const tag = (p: SetPlayer) => (
  <span className="min-w-0 truncate font-semibold">
    {p.prefix && <span className="font-normal text-muted">{p.prefix} </span>}
    {p.name}
  </span>
);

/**
 * "Top 3" strip for a finished bracket. `words`: the copied text's title and "full bracket" line in
 * the reader's language (from the page, which reads it on the server). `standings`: the event's
 * places beyond the Top 3 when known (start.gg), so "Copy results" pastes a Top 8.
 */
export default function Podium({ podium, name, url, words, standings }: { podium: PodiumData; name: string; url: string; words?: ResultsWords; standings?: { place: number; tag: string; prefix?: string | null }[] }) {
  const placements = standings?.length ? standings.map((s, i) => ({ id: String(i), place: s.place, tag: s.prefix ? `${s.prefix} | ${s.tag}` : s.tag })) : podiumPlacements(podium);
  const text = resultsText(name, placements, (id) => placements.find((p) => p.id === id)?.tag ?? null, url, standings?.length ? 8 : 3, words);
  const rows: [MessageKey, number, SetPlayer][] = [["event.place.first", 1, podium.first], ["event.place.nd", 2, podium.second]];
  if (podium.third) rows.push(["event.place.rd", 3, podium.third]);
  // Places 4 to 8 when the event's standings are known (start.gg), under the medals: two columns read
  // down the left one first, like the Top 8 picture.
  const rest = (standings ?? []).filter((s) => s.place > 3 && s.place <= 8);
  return (
    <section aria-labelledby="podium-top3" className="mx-4 mb-3 card p-3">
      <h2 id="podium-top3" className="mb-1.5 text-meta font-semibold uppercase tracking-wide text-muted">{rest.length ? <T k="event.pic.top" values={{ n: 3 + rest.length }} /> : <T k="browse.podium.top3" />}</h2>
      <ol className="flex flex-col gap-1">
        {rows.map(([place, n, p]) => (
          <li key={n} className="flex min-w-0 items-center gap-2">
            <PlaceMark place={n} />
            <span className="sr-only"><T k={place} values={{ n }} />:</span>
            {tag(p)}
          </li>
        ))}
      </ol>
      {rest.length > 0 && (
        <ol className="mt-1.5 grid grid-flow-col grid-cols-2 gap-x-4 gap-y-1 border-t border-line pt-1.5 text-sm" style={{ gridTemplateRows: `repeat(${Math.ceil(rest.length / 2)}, auto)` }}>
          {rest.map((s, i) => (
            <li key={i} className="flex min-w-0 items-center gap-2">
              <PlaceMark place={s.place} size="sm" />
              <span className="min-w-0 truncate">{s.prefix && <span className="text-muted">{s.prefix} </span>}{s.tag}</span>
            </li>
          ))}
        </ol>
      )}
      <div className="mt-2">
        <CopyResults text={text} />
      </div>
    </section>
  );
}
