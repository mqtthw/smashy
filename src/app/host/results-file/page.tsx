// "The results file": a short page for people who build ranking sites and other tools, explaining
// the public results file every bracket hosted on Smashy has. Public and static (no data), so it
// can be sent to a tool's maintainer along with a link to a real finished bracket.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { pageMeta } from "@/lib/siteMeta";
import { getT } from "@/lib/i18n/server";
import NewTab from "@/components/ui/NewTab";

export const metadata: Metadata = pageMeta(
  "The results file for ranking tools",
  "Every bracket hosted on Smashy has a public results file in the Open Bracket Format: players, seeds, placements and every set, readable by any ranking site.",
);

const EXAMPLE = `{
  "version": "v1.0",
  "event": {
    "name": "Tuesday Night Melee 12",
    "date": "2026-11-10",
    "gameName": "Super Smash Bros. Melee",
    "tournamentStructure": "double-elim",
    "numberEntrants": 23,
    "originURL": "https://…/host/<event id>",
    "other": { "source": "Smashy", "status": "completed" }
  },
  "entrants": [
    { "entrantID": "…", "entrantTag": "Bjorn", "initialSeed": 1, "finalPlacement": 1,
      "other": { "smashyHandle": "bjornfox" } }
  ],
  "sets": [
    { "setID": "…", "entrant1ID": "…", "entrant2ID": "…", "status": "completed",
      "entrant1Result": "win", "entrant2Result": "lose",
      "entrant1Score": 2, "entrant2Score": 1,
      "setFormat": "bestof3", "roundID": "Winners Semi-Final" }
  ]
}`;

const FACTS = [
  ["hostsetup.rf.whereT", "hostsetup.rf.where"],
  ["hostsetup.rf.whenT", "hostsetup.rf.when"],
  ["hostsetup.rf.whoT", "hostsetup.rf.who"],
  ["hostsetup.rf.freshT", "hostsetup.rf.fresh"],
] as const;

const RULES = ["hostsetup.rf.r1", "hostsetup.rf.r2", "hostsetup.rf.r3", "hostsetup.rf.r4", "hostsetup.rf.r5", "hostsetup.rf.r6", "hostsetup.rf.r7", "hostsetup.rf.r8"] as const;

async function ResultsFile() {
  const t = await getT();
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-6 p-4">
      <header className="flex flex-col gap-2">
        <Link href="/host/about" className="text-sm text-muted hover:text-foreground">{t("hostsetup.rf.back")}</Link>
        <h1 className="text-2xl font-bold leading-tight">{t("hostsetup.rf.title")}</h1>
        <p className="text-muted">
          {t("hostsetup.rf.introBefore")}{" "}
          <a href="https://github.com/openbracketformat/openbracketformat" target="_blank" rel="noopener noreferrer" className="link">Open Bracket Format<NewTab /></a>{" "}
          {t("hostsetup.rf.introAfter")}
        </p>
      </header>

      <section aria-labelledby="basics" className="flex flex-col gap-2">
        <h2 id="basics" className="font-bold">{t("hostsetup.rf.basics")}</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {FACTS.map(([title, text]) => (
            <li key={title} className="card flex flex-col gap-1 p-3">
              <span className="font-semibold">{t(title)}</span>
              <span className="text-sm text-muted">{t(text)}</span>
            </li>
          ))}
        </ul>
        <p className="font-mono text-sm">/host/&lt;event id&gt;/results.json</p>
      </section>

      <section aria-labelledby="shape" className="flex flex-col gap-2">
        <h2 id="shape" className="font-bold">{t("hostsetup.rf.shape")}</h2>
        <p className="text-sm text-muted">{t("hostsetup.rf.shortened")}</p>
        <pre className="overflow-x-auto rounded-xl border border-line bg-surface p-3 font-mono text-meta leading-5">{EXAMPLE}</pre>
      </section>

      <section aria-labelledby="rules" className="flex flex-col gap-2">
        <h2 id="rules" className="font-bold">{t("hostsetup.rf.rules")}</h2>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm">
          {RULES.map((r) => (
            <li key={r}>{t(r)}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="why" className="card flex flex-col gap-2 p-4">
        <h2 id="why" className="font-bold">{t("hostsetup.rf.why")}</h2>
        <p className="text-sm">
          {t("hostsetup.rf.why1")}
        </p>
        <p className="text-sm text-muted">{t("hostsetup.rf.why2")}</p>
      </section>

      <div className="flex flex-wrap gap-2">
        <Link href="/host/demo" className="btn btn-md btn-outline">{t("hostsetup.rf.demo")}</Link>
        <Link href="/host/about" className="btn btn-md btn-ghost">{t("hostsetup.rf.about")}</Link>
      </div>
    </article>
  );
}

// Reads the reader's language, so it's built per visit (inside Suspense, as the page shell needs).
export default function ResultsFilePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ResultsFile />
    </Suspense>
  );
}
