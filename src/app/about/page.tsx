// "What is Smashy?": a short page for someone who has never seen the site, to share in a group chat
// or link from the home page. Public and static (no data). It only says what the site does today,
// and every card goes to the real thing, most of which works without an account.
import type { Metadata } from "next";
import Link from "next/link";
import Scoreboard from "@/components/host/Scoreboard";
import StageDiagram from "@/components/strike/StageDiagram";
import { T } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/core";
import { pageMeta } from "@/lib/siteMeta";
import { DISCORD_INVITE } from "@/lib/contact";
import GetTheApp from "@/components/GetTheApp";

export const metadata: Metadata = pageMeta(
  "What is Smashy?",
  "A free home for people who play competitive Super Smash Bros.: find tournaments, follow brackets on your phone, strike stages, learn your character and meet your scene.",
);

type Card = { key: string; href: string };

/** Open to anyone, no account. (Seven cards: the last one sits alone on a wide screen, which is fine.) Phrases: ui.about.c.<key>, <key>Text, <key>Go. */
const TRY_NOW: Card[] = [
  { key: "events", href: "/events" },
  { key: "strike", href: "/strike" },
  { key: "demo", href: "/host/demo" },
  { key: "lookup", href: "/search?tab=players" },
  { key: "learn", href: "/games" },
  { key: "rules", href: "/scenes" },
  { key: "clips", href: "/reels" },
];
const cardKey = (c: Card, part: "" | "Text" | "Go") => `ui.about.c.${c.key}${part}` as MessageKey;

/** What signing in adds. */
const WITH_ACCOUNT: { text: MessageKey }[] = [
  { text: "ui.about.w.signup" },
  { text: "ui.about.w.startgg" },
  { text: "ui.about.w.profile" },
  { text: "ui.about.w.social" },
];

const SAMPLE_STAGES = ["Battlefield", "Final Destination", "Yoshi's Story"];

export default function AboutPage() {
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-6 p-4">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold leading-tight"><T k="ui.about.title" /></h1>
        <p className="text-muted">
          <T k="ui.about.intro" />
        </p>
        <div className="mt-1 flex flex-wrap gap-2">
          <Link href="/events" className="btn btn-md btn-primary btn-hero">
            <T k="ui.about.findEvents" />
          </Link>
          <Link href="/signin" className="btn btn-md btn-outline">
            <T k="ui.about.join" />
          </Link>
        </div>
        <p className="text-meta text-muted"><T k="ui.about.free" /></p>
      </header>

      <section aria-labelledby="try-now" className="flex flex-col gap-2">
        <h2 id="try-now" className="font-bold"><T k="ui.about.tryNow" /></h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {TRY_NOW.map((c) => (
            <li key={c.key}>
              <Link href={c.href} className="card flex h-full gap-3 p-3 hover:bg-surface">
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="font-semibold"><T k={cardKey(c, "")} /></span>
                  <span className="text-sm text-muted"><T k={cardKey(c, "Text")} /></span>
                  <span className="mt-auto text-sm font-semibold text-brand"><T k={cardKey(c, "Go")} /></span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="a-set" className="flex flex-col gap-2">
        <h2 id="a-set" className="font-bold"><T k="ui.about.aSet" /></h2>
        <p className="text-sm text-muted">
          <T k="ui.about.aSetText" />
        </p>
        {/* The same scoreboard the set pages use, with sample names. Not live: there's nothing to tap. */}
        <Scoreboard label={<T k="ui.about.sampleLabel" />} status="live" left={{ name: "Alice", score: 1 }} right={{ name: "Dan", score: 1 }}>
          <span className="text-sm text-muted"><T k="ui.about.samplePick" /></span>
        </Scoreboard>
        <span id="sample-stages" hidden>
          <T k="ui.about.sampleStages" />
        </span>
        <ul className="grid grid-cols-3 gap-2" aria-labelledby="sample-stages">
          {SAMPLE_STAGES.map((stage) => (
            <li key={stage} className="flex flex-col items-center gap-1 rounded-xl border-2 border-line-strong px-2 pt-2 pb-2.5 text-center text-sm font-semibold">
              <StageDiagram name={stage} className="h-12 w-24" />
              <span className="leading-tight">{stage}</span>
            </li>
          ))}
        </ul>
        <Link href="/host/demo" className="link self-start text-sm">
          <T k="ui.about.demoLink" />
        </Link>
      </section>

      <section aria-labelledby="with-account" className="flex flex-col gap-2">
        <h2 id="with-account" className="font-bold"><T k="ui.about.withAccount" /></h2>
        <ul className="card divide-y divide-line">
          {WITH_ACCOUNT.map((w) => (
            <li key={w.text} className="flex gap-3 px-4 py-3 text-sm">
              <span><T k={w.text} /></span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="for-tos" className="card flex flex-col gap-2 p-4">
        <h2 id="for-tos" className="font-bold"><T k="ui.about.runLocal" /></h2>
        <p className="text-sm text-muted">
          <T k="ui.about.runLocalText" />
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/host/about" className="btn btn-md btn-outline">
            <T k="ui.about.hostingFor" />
          </Link>
          <Link href="/host/demo" className="btn btn-md btn-ghost">
            <T k="ui.about.tryDemo" />
          </Link>
        </div>
      </section>

      <GetTheApp title className="card p-4" />

      <section aria-labelledby="discord" className="card flex flex-col gap-2 p-4">
        <h2 id="discord" className="font-bold"><T k="ui.about.discordTitle" /></h2>
        <p className="text-sm text-muted"><T k="ui.about.discordBody" /></p>
        <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer" className="btn btn-md btn-outline self-start">
          <T k="ui.about.discordJoin" /> ↗︎
        </a>
        <p className="mt-2 text-sm text-muted">
          <T k="ui.about.api" /> <Link href="/developers" className="link"><T k="ui.about.apiLink" /></Link>
        </p>
      </section>

      <footer className="flex flex-col gap-1 text-meta text-muted">
        <p><T k="ui.about.nintendo" /></p>
        <p>
          <Link href="/privacy" className="link">
            <T k="ui.about.privacy" />
          </Link>
          {" · "}
          <Link href="/terms" className="link">
            <T k="ui.about.terms" />
          </Link>
        </p>
      </footer>
    </article>
  );
}
