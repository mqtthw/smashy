// The Arcade: small games made from Smash history's saved results (Matthew, 2026-11-26: something to come
// back for, for people who care less about data). No sign-in, nothing saved on the server. Round 945: the
// tiles know this browser's record (today's puzzle, the streak), and the page points to the community's own
// Smash games too.
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import ArcadeHub from "@/components/arcade/ArcadeHub";
import NewTab from "@/components/ui/NewTab";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { dayNumber } from "@/lib/arcade";
import { unixNow } from "@/lib/format";
import { T } from "@/lib/i18n/client";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("history.arcade.title"), description: "Small free games made from Super Smash Bros. tournament history: guess the major from its top 8, guess the player, higher or lower, and who won this set." };
}

async function Tiles() {
  await connection(); // today's puzzle number
  return <ArcadeHub day={dayNumber(unixNow() * 1000)} />;
}

export default function ArcadePage() {
  return (
    <section className="flex flex-col gap-5 p-4">
      {/* The hero inside ArcadeHub carries the name in big letters; this is the page's heading for screen readers. */}
      <h1 className="sr-only"><T k="history.arcade.title" /></h1>
      <Suspense fallback={<CardListSkeleton count={4} />}>
        <Tiles />
      </Suspense>
      {/* Other people's Smash games (Matthew, round 945: "lets also link to smashdle"). Smashy links to the
          community's work rather than copying it. */}
      <section aria-labelledby="arcade-other" className="flex flex-col gap-2">
        <h2 id="arcade-other" className="font-bold"><T k="history.arcade.other.title" /></h2>
        <a href="https://smashdle.net/" target="_blank" rel="noopener noreferrer" className="arcade-tile card flex items-start gap-4 p-4" style={{ "--tile": "#c58bff" } as React.CSSProperties}>
          <span aria-hidden="true" className="arcade-glyph">S</span>
          <span className="flex min-w-0 flex-col gap-1">
            <span className="text-lg font-bold">Smashdle ↗︎<NewTab /></span>
            <span className="text-sm text-muted"><T k="history.arcade.other.smashdle" /></span>
            <span className="text-meta text-muted"><T k="history.arcade.other.note" /></span>
          </span>
        </a>
      </section>
    </section>
  );
}
