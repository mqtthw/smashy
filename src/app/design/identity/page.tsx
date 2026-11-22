// Mockups only: the "Full identity" design direction, for Matthew to say yes or no to. Three screens
// (home, events, a profile) drawn with made-up content next to how they look today. Nothing here is
// used by the real screens; the display font is loaded for this page alone. Not indexed.
import type { Metadata } from "next";
import { Barlow_Condensed } from "next/font/google";
import Link from "next/link";
import Icon from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Design mockups: Full identity", robots: { index: false, follow: false } };

// A condensed, heavy italic face in the style of tournament graphics. A stand-in: the final choice is open.
const display = Barlow_Condensed({ weight: ["700", "800"], style: ["italic"], subsets: ["latin"], display: "swap" });

const GAME = { melee: "bg-melee", ultimate: "bg-ultimate", pplus: "bg-pplus" } as const;
type Game = keyof typeof GAME;

/** A phone-sized frame with a caption. */
function Phone({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <figcaption className="text-meta font-semibold uppercase tracking-wide text-muted">{label}</figcaption>
      <div className="flex flex-col gap-3 overflow-hidden rounded-3xl border border-line-strong bg-background p-3">{children}</div>
    </figure>
  );
}

/** Games won as stock-style dots: filled for a win, hollow for what's left. */
function Stocks({ won, of, align = "left" }: { won: number; of: number; align?: "left" | "right" }) {
  return (
    <span className={`flex gap-1 ${align === "right" ? "justify-end" : ""}`} role="img" aria-label={`${won} of ${of} games`}>
      {Array.from({ length: of }, (_, i) => (
        <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < won ? "bg-brand" : "border-[1.5px] border-muted"}`} />
      ))}
    </span>
  );
}

function Band({ game, kicker, title, sub }: { game: Game; kicker: string; title: string; sub?: string }) {
  return (
    <div className={`${GAME[game]} rounded-2xl px-3 py-3 text-white [print-color-adjust:exact]`}>
      <p className="text-meta font-semibold uppercase tracking-wide opacity-90">{kicker}</p>
      <p className={`${display.className} text-3xl font-extrabold uppercase leading-none`}>{title}</p>
      {sub && <p className="mt-1 text-meta opacity-90">{sub}</p>}
    </div>
  );
}

function EventRowToday({ game, name, when }: { game: string; name: string; when: string }) {
  return (
    <div className="card flex items-center justify-between gap-2 p-3">
      <div className="min-w-0">
        <p className="truncate font-semibold">{name}</p>
        <p className="text-meta text-muted">{when}</p>
      </div>
      <span className="badge bg-surface-2 text-muted">{game}</span>
    </div>
  );
}

function EventRowNew({ game, label, name, when, live = false }: { game: Game; label: string; name: string; when: string; live?: boolean }) {
  return (
    <div className="flex overflow-hidden rounded-2xl border border-line">
      <span className={`${GAME[game]} w-2 shrink-0 [print-color-adjust:exact]`} aria-hidden="true" />
      <div className="flex min-w-0 flex-1 items-center justify-between gap-2 p-3">
        <div className="min-w-0">
          <p className={`${display.className} truncate text-2xl font-bold uppercase leading-none`}>{name}</p>
          <p className="mt-1 text-meta text-muted">
            {label} · {when}
          </p>
        </div>
        {live && <span className="badge shrink-0 bg-brand text-on-brand">Live</span>}
      </div>
    </div>
  );
}

export default function IdentityMockupsPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-6">
      <header className="flex flex-col gap-2">
        <Link href="/design" className="text-sm text-muted hover:text-foreground">← Design system</Link>
        <h1 className="text-2xl font-bold">Mockups: the &ldquo;Full identity&rdquo; direction</h1>
        <p className="text-muted">
          Pictures only. Nothing here is live, and the content is made up. Each pair shows a screen as it is today and as it could be with three ideas applied everywhere: each game&apos;s color on its pages, a bolder headline
          face, and stock-style dots for games won.
        </p>
        <p className="text-meta text-muted">The headline face is a stand-in (Barlow Condensed). If you like the direction, the face, how much color, and where the dots go are all still open.</p>
      </header>

      <section aria-labelledby="m-home" className="flex flex-col gap-3">
        <h2 id="m-home" className="font-bold">1. Home</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Phone label="Today">
            <p className="text-xl font-bold leading-tight">The home of the Smash community</p>
            <p className="text-sm text-muted">Find tournaments near you, follow brackets, learn your character and meet the players in your scene.</p>
            <span className="btn btn-md btn-primary self-start">Join Smashy</span>
            <div className="card flex gap-3 p-3">
              <Icon name="calendar" className="mt-0.5 text-xl text-brand" />
              <span className="text-sm">
                <b className="block">Events near you</b>
                <span className="text-muted">Tournaments, weeklies and majors, with live brackets.</span>
              </span>
            </div>
          </Phone>
          <Phone label="Full identity">
            <p className={`${display.className} text-5xl font-extrabold uppercase leading-[0.9]`}>
              The home of <span className="text-brand">Smash</span>
            </p>
            <p className="text-sm text-muted">Tournaments near you, live brackets, your character, your scene.</p>
            <span className="btn btn-md btn-primary self-start">Join Smashy</span>
            <Band game="melee" kicker="Live now · Melee" title="Tuesday Night Melee 12" sub="Winners semis · 23 players" />
            <div className="grid grid-cols-3 gap-2 text-center text-meta font-semibold text-white">
              <span className="rounded-xl bg-melee py-2 [print-color-adjust:exact]">Melee</span>
              <span className="rounded-xl bg-ultimate py-2 [print-color-adjust:exact]">Ultimate</span>
              <span className="rounded-xl bg-pplus py-2 [print-color-adjust:exact]">P+</span>
            </div>
          </Phone>
        </div>
      </section>

      <section aria-labelledby="m-events" className="flex flex-col gap-3">
        <h2 id="m-events" className="font-bold">2. Events</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Phone label="Today">
            <p className="text-xl font-bold">Events</p>
            <EventRowToday game="Melee" name="Tuesday Night Melee 12" when="Tonight 7:00 PM · San Antonio" />
            <EventRowToday game="Ultimate" name="Power Grid 07" when="Wed 8:00 PM · Plano" />
            <EventRowToday game="P+" name="Plus Side Weekly" when="Thu 7:30 PM · Austin" />
          </Phone>
          <Phone label="Full identity">
            <p className={`${display.className} text-4xl font-extrabold uppercase leading-none`}>Events</p>
            <EventRowNew game="melee" label="Melee" name="Tuesday Night Melee 12" when="Tonight 7:00 PM · San Antonio" live />
            <EventRowNew game="ultimate" label="Ultimate" name="Power Grid 07" when="Wed 8:00 PM · Plano" />
            <EventRowNew game="pplus" label="P+" name="Plus Side Weekly" when="Thu 7:30 PM · Austin" />
          </Phone>
        </div>
      </section>

      <section aria-labelledby="m-profile" className="flex flex-col gap-3">
        <h2 id="m-profile" className="font-bold">3. A player&apos;s profile, and a set</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Phone label="Today">
            <div className="flex items-center gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-surface-2 text-xl font-bold">B</span>
              <div>
                <p className="text-lg font-bold">Bjorn</p>
                <p className="text-meta text-muted">@bjornfox · San Antonio</p>
              </div>
            </div>
            <p className="text-sm">Fox main. Working on my ledge game.</p>
            <p className="text-meta text-muted">Sets on Smashy: 14 won, 6 lost</p>
            <div className="board flex items-center justify-between gap-3 p-3">
              <span className="font-bold">Bjorn</span>
              <span className="font-mono text-2xl font-bold">2–1</span>
              <span className="font-bold text-muted">Flo</span>
            </div>
          </Phone>
          <Phone label="Full identity">
            <div className="-mx-3 -mt-3 bg-melee px-3 pb-8 pt-3 text-white [print-color-adjust:exact]">
              <p className="text-meta font-semibold uppercase tracking-wide opacity-90">Melee · Fox</p>
            </div>
            <div className="-mt-10 flex items-end gap-3">
              <span className="grid h-16 w-16 place-items-center rounded-full border-4 border-background bg-surface-2 text-xl font-bold">B</span>
              <div className="pb-1">
                <p className={`${display.className} text-4xl font-extrabold uppercase leading-none`}>Bjorn</p>
                <p className="text-meta text-muted">@bjornfox · San Antonio</p>
              </div>
            </div>
            <p className="text-sm">Fox main. Working on my ledge game.</p>
            <div className="flex gap-2 text-center">
              <span className="flex-1 rounded-xl bg-surface py-2">
                <b className={`${display.className} block text-3xl font-extrabold leading-none`}>14</b>
                <span className="text-meta text-muted">sets won</span>
              </span>
              <span className="flex-1 rounded-xl bg-surface py-2">
                <b className={`${display.className} block text-3xl font-extrabold leading-none`}>6</b>
                <span className="text-meta text-muted">sets lost</span>
              </span>
            </div>
            <div className="board grid grid-cols-[1fr_auto_1fr] items-center gap-3 p-3">
              <div className="flex flex-col gap-1">
                <span className={`${display.className} text-2xl font-extrabold uppercase leading-none`}>Bjorn</span>
                <Stocks won={2} of={2} />
              </div>
              <span className={`${display.className} text-xl font-bold uppercase text-muted`}>vs</span>
              <div className="flex flex-col items-end gap-1">
                <span className={`${display.className} text-2xl font-extrabold uppercase leading-none text-muted`}>Flo</span>
                <Stocks won={1} of={2} align="right" />
              </div>
            </div>
          </Phone>
        </div>
      </section>

      <section className="card flex flex-col gap-2 p-4">
        <h2 className="font-bold">What saying yes would mean</h2>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
          <li>A second typeface for headlines and names across the app (one more font to load).</li>
          <li>Game color used as blocks and bands, not only as small badges. Pages for a game take on its color.</li>
          <li>Stock dots could replace the big score on scoreboards, or sit under it. Today&apos;s big number stays readable from further away.</li>
          <li>It would be done screen by screen over several rounds, starting where you choose.</li>
        </ul>
      </section>
    </div>
  );
}
