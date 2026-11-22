import Link from "next/link";
import GameBadge from "@/components/GameBadge";
import { MajorDates, MajorPlace } from "@/components/majors/MajorText";
import { majorPlace } from "@/lib/majorText";
import { getMajors, type Major } from "@/lib/majors";
import { T } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/core";

/**
 * Majors to follow: the ones running now (their page opens the live bracket in one tap) and the
 * next few coming up, so the Brackets page always has something to open.
 */
export default async function MajorsBrackets() {
  const { live, upcoming } = await getMajors().catch(() => ({ live: [] as Major[], upcoming: [] as Major[] }));
  const soon = upcoming.slice(0, 4);
  if (!live.length && !soon.length) return null;
  return (
    <>
      {live.length > 0 && <MajorList id="majors-live" title="browse.majors.liveNow" majors={live} cta="browse.bracketArrow" />}
      {soon.length > 0 && <MajorList id="majors-soon" title="browse.majors.comingUp" majors={soon} cta="browse.detailsArrow" />}
    </>
  );
}

/** `title` and `cta` are phrase keys (this part is built ahead of time, so <T> shows them in the visitor's language). */
function MajorList({ id, title, majors, cta }: { id: string; title: MessageKey; majors: Major[]; cta: MessageKey }) {
  return (
    <section className="flex flex-col gap-2" aria-labelledby={id}>
      <h2 id={id} className="font-bold"><T k={title} /></h2>
      <ul className="card divide-y divide-line">
        {majors.map((m) => (
          <li key={m.slug}>
            <Link href={`/events/${m.slug}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface">
              <span className="flex shrink-0 flex-col gap-1">
                {m.games.slice(0, 2).map((g) => <GameBadge key={g} game={g} />)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{m.name}</span>
                <span className="block truncate text-meta text-muted">
                  {!m.live && <MajorDates m={m} />}
                  {!m.live && majorPlace(m) ? " · " : null}
                  <MajorPlace m={m} />
                  {(!m.live || majorPlace(m)) && m.entrants ? " · " : null}
                  {m.entrants ? <T k="browse.entrants" values={{ n: m.entrants }} /> : null}
                </span>
              </span>
              <span className="shrink-0 text-meta font-semibold text-brand"><T k={cta} /></span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
