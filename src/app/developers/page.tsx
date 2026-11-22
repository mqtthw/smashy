// Docs for Smashy's public API (round 708). In English, like the privacy policy and terms: it's for
// developers, and the API's answers are English field names anyway.
import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import NewTab from "@/components/ui/NewTab";
import { API_LIMITS } from "@/lib/apiLimit";
import { DISCORD_INVITE } from "@/lib/contact";
import { pageMeta } from "@/lib/siteMeta";

export const metadata: Metadata = pageMeta(
  "Smashy public API",
  "A free, read-only API for Super Smash Bros. tournaments, brackets, Smash history, community rulesets and clips. No key needed.",
);

type Endpoint = { path: string; what: string; params?: string };

const ENDPOINTS: { title: string; items: Endpoint[] }[] = [
  {
    title: "Basics",
    items: [
      { path: "/api/v1", what: "Every endpoint, with an example address for each." },
      { path: "/api/v1/games", what: "The games Smashy follows and their keys (melee, ultimate, pplus, smash64, brawl, smash4)." },
      { path: "/api/v1/regions", what: "Region codes for the events endpoint: US states (US-TX), Canadian provinces (CA-ON) and countries (JP)." },
    ],
  },
  {
    title: "Tournaments",
    items: [
      { path: "/api/v1/events", params: "region (default US-TX), game", what: "Upcoming in-person tournaments in a region, soonest first, from start.gg. Smashy's saved lists refresh every few hours; a region nobody has opened lately can come back empty." },
      { path: "/api/v1/events/{slug}", what: "One tournament by its start.gg slug (genesis-x4), with its Smash brackets, venue and streams." },
    ],
  },
  {
    title: "Brackets run on Smashy",
    items: [
      { path: "/api/v1/brackets", params: "game", what: "Upcoming brackets hosted on Smashy." },
      { path: "/api/v1/brackets/{id}", what: "One bracket's details: format, best-of, entrants, status, host." },
      { path: "/api/v1/brackets/{id}/results", what: "Players, seeds, placements and every set, in the Open Bracket Format (the format ranking sites read)." },
    ],
  },
  {
    title: "Smash history",
    items: [
      { path: "/api/v1/majors", params: "year (1999 to now), game", what: "A year's finished majors, newest first." },
      { path: "/api/v1/majors/upcoming", what: "Majors happening now and coming up." },
      { path: "/api/v1/majors/{slug}", what: "One major's brackets with the top 8 (and characters where known) and standings to 64th where saved." },
      { path: "/api/v1/head-to-head", params: "year (2017 to now), game (default melee), player (a start.gg player id)", what: "The year's top players at majors and their sets against each other. Sets are filled in over time, so majorsWithSets says how many of the year's majors are counted so far." },
    ],
  },
  {
    title: "Rulesets",
    items: [
      { path: "/api/v1/rulesets", params: "game", what: "Community rulesets made by scenes on Smashy, each with its latest version." },
      { path: "/api/v1/rulesets/{id}", what: "One ruleset with every published version, newest first." },
    ],
  },
  {
    title: "Reels",
    items: [
      { path: "/api/v1/reels", params: "game, sort (new or top), days (1 to 30, for top), limit (up to 50), offset", what: "Twitch clips and YouTube Shorts from Smash channels, newest or most viewed. Each has a link to the clip on Twitch or YouTube and its page on Smashy. Videos members post themselves aren't included." },
      { path: "/api/v1/reels/{clipId}", what: "One clip by its Twitch clip slug or YouTube video id." },
    ],
  },
];

const EXAMPLE = `fetch("https://smashy.gg/api/v1/events?region=US-CA&game=melee")
  .then((r) => r.json())
  .then(({ tournaments }) => {
    for (const t of tournaments) console.log(t.startAt, t.name, t.url);
  });`;

export default function DevelopersPage() {
  return (
    <LegalPage title="Smashy public API" updated="November 22, 2026">
      <p>
        A free, read-only API for tournaments, brackets, Smash history, community rulesets and Reels clips. There&apos;s no key and
        no sign-up: call it from a website, an app, a bot or a script. Answers are JSON, and any website may call it
        from the browser.
      </p>
      <p>
        It shows exactly what a signed-out visitor sees on smashy.gg, and nothing more. Players&apos; accounts, posts
        and messages aren&apos;t in it, teen profiles never are, and players who asked not to be listed in Smash
        history are left out there too.
      </p>

      <h2>Try it</h2>
      <p>
        Open <a href="/api/v1" className="link">smashy.gg/api/v1</a> in your browser to see every endpoint. In
        JavaScript:
      </p>
      <pre className="overflow-x-auto rounded-xl bg-surface p-3 font-mono text-xs leading-relaxed">{EXAMPLE}</pre>

      {ENDPOINTS.map((group) => (
        <section key={group.title} className="flex flex-col gap-2">
          <h2>{group.title}</h2>
          <ul className="flex flex-col gap-2">
            {group.items.map((e) => (
              <li key={e.path}>
                <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs">GET {e.path}</code>
                {e.params && <span className="text-muted"> · options: {e.params}</span>}
                <br />
                {e.what}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <h2>Limits and fair use</h2>
      <ul>
        <li>Each internet address can make {API_LIMITS.general} calls a minute ({API_LIMITS.startgg} a minute for single tournaments, which may need a start.gg lookup). Past that you get a 429 answer: wait a minute.</li>
        <li>Clips stay on Twitch and YouTube: show them with those sites&apos; own players or link to them, and credit the channel.</li>
        <li>Answers are kept for a few minutes (history for an hour), so calling more often than that won&apos;t give you newer data.</li>
        <li>Tournament data comes from start.gg. If you need lots of it, use <a href="https://developer.start.gg/" target="_blank" rel="noopener noreferrer" className="link">start.gg&apos;s own API<NewTab /></a>.</li>
        <li>Please say where the data comes from (&ldquo;from Smashy&rdquo; with a link) and don&apos;t present it as your own.</li>
        <li>This is version 1. If something has to change in a way that would break apps, it will come as /api/v2, and v1 keeps working for a while.</li>
      </ul>

      <h2>Errors</h2>
      <p>
        Errors come back as <code className="font-mono text-xs">{`{ "error": "..." }`}</code> with the usual status:
        400 for a bad option, 404 when something doesn&apos;t exist, 429 when you&apos;re over the limit, and 503 when
        something Smashy relies on is down for a moment.
      </p>

      <h2>Ideas and help</h2>
      <p>
        Want something that isn&apos;t here yet? Tell us in the <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer" className="link">Smashy Discord<NewTab /></a>.
        Smashy is open source, so you can also read how each endpoint works or suggest changes
        on <a href="https://github.com/mqtthw/smashy" target="_blank" rel="noopener noreferrer" className="link">GitHub<NewTab /></a>.
        See also the <Link href="/about" className="link">about page</Link>.
      </p>
    </LegalPage>
  );
}
