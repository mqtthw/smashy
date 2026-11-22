// "Run your weekly on Smashy": what hosting an event here gives a tournament organizer, in plain
// words, and an honest list of when start.gg is still the better tool. Public and static (no data),
// so it can be shared with a TO who has never seen Smashy.
import type { Metadata } from "next";
import Link from "next/link";
import Icon, { type IconName } from "@/components/ui/Icon";
import { T } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/core";
import { pageMeta } from "@/lib/siteMeta";

export const metadata: Metadata = pageMeta(
  "Run your weekly on Smashy",
  "Free brackets for Smash locals and netplay events: sign-ups, check-in, stage strikes on players' phones, scores reported by players, setups, a stream overlay and results.",
);

// The phrases are in src/lib/i18n/sections/hostsetup.*.ts.
const FEATURES: { icon: IconName; title: MessageKey; text: MessageKey; href?: string }[] = [
  { icon: "clipboard", title: "hostsetup.about.signups.title", text: "hostsetup.about.signups.text" },
  { icon: "trophy", title: "hostsetup.about.brackets.title", text: "hostsetup.about.brackets.text" },
  { icon: "phone", title: "hostsetup.about.phones.title", text: "hostsetup.about.phones.text" },
  { icon: "video", title: "hostsetup.about.stream.title", text: "hostsetup.about.stream.text" },
  { icon: "globe", title: "hostsetup.about.online.title", text: "hostsetup.about.online.text" },
  { icon: "user", title: "hostsetup.about.help.title", text: "hostsetup.about.help.text" },
  { icon: "megaphone", title: "hostsetup.about.over.title", text: "hostsetup.about.over.text" },
  { icon: "repeat", title: "hostsetup.about.startgg.title", text: "hostsetup.about.startgg.text" },
  { icon: "chart", title: "hostsetup.about.seasons.title", text: "hostsetup.about.seasons.text", href: "/seasons" },
  { icon: "chat", title: "hostsetup.about.discord.title", text: "hostsetup.about.discord.text", href: "/host/discord" },
];

const NIGHT: MessageKey[] = [
  "hostsetup.about.night.1",
  "hostsetup.about.night.2",
  "hostsetup.about.night.3",
  "hostsetup.about.night.4",
  "hostsetup.about.night.5",
  "hostsetup.about.night.6",
  "hostsetup.about.night.7",
];

const NOT_YET: MessageKey[] = [
  "hostsetup.about.notYet.money",
  "hostsetup.about.notYet.size",
  "hostsetup.about.notYet.rankings",
];

export default function HostAboutPage() {
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-6 p-4">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold leading-tight"><T k="hostsetup.about.title" /></h1>
        <p className="text-muted">
          <T k="hostsetup.about.intro" />
        </p>
        <div className="mt-1 flex flex-wrap gap-2">
          <Link href="/host/demo" className="btn btn-md btn-primary"><T k="hostsetup.about.tryDemo" /></Link>
          <Link href="/host/new" className="btn btn-md btn-outline"><T k="hostsetup.about.host" /></Link>
        </div>
        <p className="text-meta text-muted">
          <T k="hostsetup.about.free" />{" "}
          <Link href="/about" className="link">
            <T k="hostsetup.about.forPlayers" />
          </Link>
          <T k="common.period" />
        </p>
      </header>

      <section aria-labelledby="what-you-get" className="flex flex-col gap-2">
        <h2 id="what-you-get" className="font-bold"><T k="hostsetup.about.whatYouGet" /></h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <li key={f.title}>
              {(() => {
                const inner = (
                  <>
                    <Icon name={f.icon} className="mt-0.5 text-2xl text-brand" />
                    <span className="min-w-0">
                      <span className="block font-semibold"><T k={f.title} />{f.href ? " →" : ""}</span>
                      <span className="block text-sm text-muted"><T k={f.text} /></span>
                    </span>
                  </>
                );
                return f.href ? <Link href={f.href} className="card flex h-full gap-3 p-3 hover:bg-surface">{inner}</Link> : <div className="card flex h-full gap-3 p-3">{inner}</div>;
              })()}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="how-a-night-goes" className="flex flex-col gap-2">
        <h2 id="how-a-night-goes" className="font-bold"><T k="hostsetup.about.night" /></h2>
        <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
          {NIGHT.map((k) => (
            <li key={k}><T k={k} /></li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="when-startgg" className="card flex flex-col gap-2 p-4">
        <h2 id="when-startgg" className="font-bold"><T k="hostsetup.about.startggBetter" /></h2>
        <p className="text-sm text-muted"><T k="hostsetup.about.startggIntro" /></p>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
          {NOT_YET.map((k) => (
            <li key={k}><T k={k} /></li>
          ))}
        </ul>
        <p className="text-sm text-muted">
          <T k="hostsetup.about.both" />
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        <Link href="/host/new" className="btn btn-md btn-primary"><T k="hostsetup.about.host" /></Link>
        <Link href="/host/demo" className="btn btn-md btn-outline"><T k="hostsetup.about.tryDemo" /></Link>
        <Link href="/rulesets" className="btn btn-md btn-ghost"><T k="hostsetup.about.rulesets" /></Link>
        <Link href="/host/guide" className="btn btn-md btn-ghost"><T k="hostsetup.about.checklist" /></Link>
        <Link href="/host/results-file" className="btn btn-md btn-ghost"><T k="hostsetup.about.resultsFile" /></Link>
      </div>
    </article>
  );
}
