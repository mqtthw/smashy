// "Your first night": a checklist for a TO running their first bracket on Smashy, from making the
// event to posting results. Public and static (no data), printable, and written to match the names
// of the buttons on the host's event page.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import PrintButton from "@/components/host/PrintButton";
import Icon, { type IconName } from "@/components/ui/Icon";
import { T } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/core";
import { getT } from "@/lib/i18n/server";
import { pageMeta } from "@/lib/siteMeta";

export const metadata: Metadata = pageMeta(
  "Your first night running a bracket on Smashy",
  "A checklist for tournament organizers: before the day, at the door, during the bracket and after, with the buttons to press on Smashy.",
);

// The phrases are in src/lib/i18n/sections/hostsetup.*.ts.
const PHASES: { icon: IconName; title: MessageKey; steps: MessageKey[] }[] = [
  {
    icon: "calendar",
    title: "hostsetup.guide.before",
    steps: [
      "hostsetup.guide.before.1",
      "hostsetup.guide.before.2",
      "hostsetup.guide.before.3",
      "hostsetup.guide.before.4",
      "hostsetup.guide.before.5",
      "hostsetup.guide.before.6",
      "hostsetup.guide.before.7",
    ],
  },
  {
    icon: "pin",
    title: "hostsetup.guide.door",
    steps: ["hostsetup.guide.door.1", "hostsetup.guide.door.2", "hostsetup.guide.door.3", "hostsetup.guide.door.4", "hostsetup.guide.door.5"],
  },
  {
    icon: "trophy",
    title: "hostsetup.guide.during",
    steps: [
      "hostsetup.guide.during.1",
      "hostsetup.guide.during.2",
      "hostsetup.guide.during.3",
      "hostsetup.guide.during.4",
      "hostsetup.guide.during.5",
      "hostsetup.guide.during.6",
    ],
  },
  {
    icon: "megaphone",
    title: "hostsetup.guide.after",
    steps: ["hostsetup.guide.after.1", "hostsetup.guide.after.2", "hostsetup.guide.after.3", "hostsetup.guide.after.4", "hostsetup.guide.after.5"],
  },
];

const TROUBLE: [MessageKey, MessageKey][] = [
  ["hostsetup.guide.trouble.seeding", "hostsetup.guide.trouble.seedingFix"],
  ["hostsetup.guide.trouble.phone", "hostsetup.guide.trouble.phoneFix"],
  ["hostsetup.guide.trouble.disagree", "hostsetup.guide.trouble.disagreeFix"],
  ["hostsetup.guide.trouble.leave", "hostsetup.guide.trouble.leaveFix"],
];

/** The print button, labelled in the visitor's language (its label is plain text, so it's read on the server). */
async function PrintChecklist() {
  const t = await getT();
  return <PrintButton label={t("hostsetup.guide.print")} />;
}

export default function HostGuidePage() {
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-6 p-4 print:max-w-none print:gap-4 print:p-0">
      <header className="flex flex-col gap-2">
        <Link href="/host/about" className="text-sm text-muted hover:text-foreground print:hidden"><T k="hostsetup.guide.back" /></Link>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold leading-tight"><T k="hostsetup.guide.title" /></h1>
          <span className="print:hidden">
            <Suspense fallback={null}>
              <PrintChecklist />
            </Suspense>
          </span>
        </div>
        <p className="text-muted"><T k="hostsetup.guide.intro" /></p>
      </header>

      {PHASES.map((phase) => (
        <section key={phase.title} aria-labelledby={`phase-${phase.icon}`} className="flex flex-col gap-2 break-inside-avoid">
          <h2 id={`phase-${phase.icon}`} className="flex items-center gap-2 font-bold">
            <Icon name={phase.icon} className="text-xl text-brand" /> <T k={phase.title} />
          </h2>
          <ul className="flex flex-col gap-2">
            {phase.steps.map((step) => (
              <li key={step} className="flex gap-3 text-sm">
                <span aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 rounded border border-line-strong" />
                <span><T k={step} /></span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section aria-labelledby="trouble" className="card flex flex-col gap-2 p-4 break-inside-avoid print:border-0 print:p-0">
        <h2 id="trouble" className="font-bold"><T k="hostsetup.guide.trouble" /></h2>
        <dl className="flex flex-col gap-2 text-sm">
          {TROUBLE.map(([problem, fix]) => (
            <div key={problem}>
              <dt className="font-semibold"><T k={problem} /></dt>
              <dd className="text-muted"><T k={fix} /></dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="flex flex-wrap gap-2 print:hidden">
        <Link href="/host/new" className="btn btn-md btn-primary"><T k="hostsetup.guide.host" /></Link>
        <Link href="/host/demo" className="btn btn-md btn-outline"><T k="hostsetup.guide.tryDemo" /></Link>
      </div>
    </article>
  );
}
