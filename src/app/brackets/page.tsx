import type { Metadata } from "next";
import { Suspense } from "react";
import OpenLinkForm from "./OpenLinkForm";
import { RecentBracketsList } from "@/components/brackets/RecentBrackets";
import LiveOnSmashy from "./LiveOnSmashy";
import MajorsBrackets from "./MajorsBrackets";
import OnlineToday from "./OnlineToday";
import { T } from "@/lib/i18n/client";

export const metadata: Metadata = {
  title: "Live Smash Bros. brackets",
  description: "Fast brackets for any start.gg or parry.gg event, majors live now, and brackets running live on Smashy. Comment on sets and share them.",
};

export default function BracketsPage() {
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
      <Suspense fallback={null}>
        <MajorsBrackets />
      </Suspense>
      <Suspense fallback={null}>
        <OnlineToday />
      </Suspense>
      <p className="text-meta text-muted">
        <T k="browse.brackets.footer" />
      </p>
    </section>
  );
}
