import type { Metadata } from "next";
import { Suspense } from "react";
import OpenLinkForm from "./OpenLinkForm";
import { RecentBracketsList } from "@/components/brackets/RecentBrackets";
import PastFinder from "@/components/brackets/PastFinder";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import LiveOnSmashy from "./LiveOnSmashy";
import { T } from "@/lib/i18n/client";

export const metadata: Metadata = {
  title: "Smash Bros. brackets: open any bracket, find past tournaments",
  description: "Fast brackets for any start.gg or parry.gg event, brackets running live on Smashy, and a finder for finished tournaments by region, game, year and size.",
};

/**
 * Every way to a bracket on one page (round 854, Matthew: "Open any bracket" and "Past tournaments" felt
 * redundant as separate pages): paste a link, the ones you opened lately, brackets running on Smashy
 * now, and the past-tournament finder (it was /events/past, which now redirects here). The majors and
 * online-today lists that used to sit here are on Events and in the side column already.
 */
export default function BracketsPage(props: PageProps<"/brackets">) {
  return (
    <section className="flex flex-col gap-5 p-4">
      <header className="pt-2">
        <h1 className="text-2xl font-bold"><T k="browse.brackets.title" /></h1>
        <p className="text-muted">
          <T k="browse.brackets.intro" />
        </p>
      </header>
      <OpenLinkForm />
      <RecentBracketsList />
      <Suspense fallback={null}>
        <LiveOnSmashy />
      </Suspense>
      <Suspense fallback={<CardListSkeleton count={3} />}>
        <PastFinder searchParams={props.searchParams} />
      </Suspense>
      <p className="text-meta text-muted">
        <T k="browse.brackets.footer" />
      </p>
    </section>
  );
}
