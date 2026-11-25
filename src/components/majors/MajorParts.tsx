import Image from "next/image";
import LiveDot from "@/components/ui/LiveDot";
import Link from "next/link";
import GameBadge from "@/components/GameBadge";
import type { Major } from "@/lib/majors";
import Icon from "@/components/ui/Icon";
import { T } from "@/lib/i18n/client";
import { majorPlace } from "@/lib/majorText";
import { MajorDates, MajorPlace } from "./MajorText";

// Shared pieces for showing majors: the live banner on the feed and cards on the Events tab.

// Dates and places in any language: lib/majorText (MajorDates and MajorPlace write them in the visitor's).
export { majorDates, majorPlace } from "@/lib/majorText";

export { LiveDot };

/** Top-of-feed banner while majors are running. */
export function LiveMajorsBanner({ majors }: { majors: Major[] }) {
  if (majors.length === 0) return null;
  return (
    <section aria-labelledby="majors-now" className="flex flex-col gap-2 border-b border-line px-4 py-3">
      <h2 id="majors-now" className="sr-only"><T k="browse.majors.nowLabel" /></h2>
      {majors.map((m) => (
        <div key={m.slug} className="flex items-center gap-3 rounded-2xl border border-brand/40 bg-brand/5 p-3">
          {m.imageUrl ? (
            <Image src={m.imageUrl} alt="" width={44} height={44} className="shrink-0 rounded-xl border border-line" />
          ) : (
            <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-xl text-muted"><Icon name="trophy" /></span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <LiveDot />
              {m.games.map((g) => <GameBadge key={g} game={g} />)}
            </div>
            <p className="mt-0.5 truncate font-bold">{m.name}</p>
            <p className="truncate text-meta text-muted">
              <MajorPlace m={m} />
              {majorPlace(m) && m.entrants ? " · " : null}
              {m.entrants ? <T k="browse.entrants" values={{ n: m.entrants }} /> : null}
            </p>
          </div>
          <Link href={m.stream ? `/events/${m.slug}#watch` : `/events/${m.slug}`} className="btn btn-md btn-primary shrink-0">
            {m.stream ? <T k="browse.majors.watch" /> : <T k="browse.results" />}
          </Link>
        </div>
      ))}
    </section>
  );
}

/** Card for the Majors row on the Events tab. */
export function MajorCard({ m }: { m: Major }) {
  return (
    <Link href={`/events/${m.slug}`} className="card flex w-64 shrink-0 flex-col gap-2 p-3 hover:bg-surface">
      <div className="flex items-center gap-2">
        {m.imageUrl ? (
          <Image src={m.imageUrl} alt="" width={40} height={40} className="shrink-0 rounded-lg border border-line" />
        ) : (
          <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-lg text-muted"><Icon name="trophy" /></span>
        )}
        <div className="min-w-0">
          <p className="text-meta font-semibold uppercase tracking-wide text-brand">{m.live ? <T k="browse.majors.happeningNow" /> : <MajorDates m={m} />}</p>
          <p className="truncate text-meta text-muted"><MajorPlace m={m} fallback={<T k="browse.locationTba" />} /></p>
        </div>
      </div>
      <p className="line-clamp-2 font-bold leading-snug">{m.name}</p>
      <div className="mt-auto flex flex-wrap items-center gap-1.5">
        {m.live && <LiveDot />}
        {m.games.map((g) => <GameBadge key={g} game={g} />)}
        {m.entrants ? <span className="text-meta text-muted"><T k="browse.entrants" values={{ n: m.entrants }} /></span> : null}
      </div>
    </Link>
  );
}

/** Horizontal row of major cards (Events tab). */
export function MajorsRow({ majors }: { majors: Major[] }) {
  if (majors.length === 0) return null;
  return (
    <section aria-labelledby="majors-heading" className="flex flex-col gap-2 border-b border-line py-4">
      <div className="flex items-baseline justify-between px-4">
        <h2 id="majors-heading" className="text-title font-bold"><T k="browse.majors.title" /></h2>
        <span className="flex items-baseline gap-3 text-meta text-muted">
          <T k="browse.majors.worldwide" />
          <Link href="/pickem" className="font-semibold text-brand hover:underline"><T k="browse.majors.pickem" /></Link>
        </span>
      </div>
      <div className="scroll-fade flex gap-3 overflow-x-auto px-4 pb-1">
        {majors.map((m) => <MajorCard key={m.slug} m={m} />)}
      </div>
    </section>
  );
}
