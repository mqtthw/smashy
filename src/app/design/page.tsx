import type { Metadata } from "next";
import GameBadge from "@/components/GameBadge";
import Logo from "@/components/Logo";
import { YourSetCard } from "@/components/host/MySetButton";
import Scoreboard, { BoardPill } from "@/components/host/Scoreboard";
import Icon, { ICON_NAMES } from "@/components/ui/Icon";
import Avatar from "@/components/ui/Avatar";
import TabBar from "@/components/ui/TabBar";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { CardListSkeleton, FeedSkeleton, ScoreboardSkeleton, SetSkeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = { title: "Design system", robots: { index: false, follow: false } };

// The living reference for Smashy's look. Everything here uses the real tokens and classes
// from globals.css, so if this page looks right, the app does too.

const COLORS: { group: string; tokens: [name: string, use: string][] }[] = [
  {
    group: "Neutrals",
    tokens: [
      ["background", "Page"],
      ["surface", "Hover, quiet panels"],
      ["surface-2", "Selected, avatar disc"],
      ["line", "Dividers, card borders"],
      ["line-strong", "Inputs, outline buttons"],
      ["muted", "Timestamps, counts"],
      ["foreground", "Text"],
    ],
  },
  {
    group: "Brand and meaning",
    tokens: [
      ["brand", "Flame red: main actions"],
      ["like", "Liked heart"],
      ["repost", "Reposted"],
      ["success", "Saved, approved"],
      ["warning", "Needs attention"],
      ["danger", "Errors, delete"],
      ["player-2", "Second player, when two take turns"],
    ],
  },
  {
    group: "Games",
    tokens: [
      ["melee", "Melee"],
      ["ultimate", "Ultimate"],
      ["pplus", "Project+"],
    ],
  },
  {
    group: "Scoreboard",
    tokens: [["board", "The panel behind a set"]],
  },
];

const TYPE: [cls: string, label: string, sample: string][] = [
  ["font-display text-2xl font-black", "Page title · 24/32 Source Sans 3 Bold (every h1 gets this)", "Events"],
  ["text-display font-bold", "Display · 31/36 bold", "Texas Smash Weekly"],
  ["text-title font-bold", "Title · 20/24 bold", "Saturday Night Smash #42"],
  ["text-body", "Body · 15/20", "Took a set off a Fox for the first time. Ledge-hopped Fair is the answer."],
  ["text-meta text-muted", "Meta · 13/16 muted", "@bjornfox · 2h · San Antonio"],
  ["font-mono text-meta", "Mono · numbers and codes", "Netplay code 1A2B-3C4D · 3 stock · 8:00"],
];

const SPACING: [px: number, cls: string, use: string][] = [
  [4, "1", "Icon to count"],
  [8, "2", "Between chips"],
  [12, "3", "Avatar to text, post rows"],
  [16, "4", "Page gutter, card padding"],
  [24, "6", "Between sections"],
  [32, "8", "Page top on forms"],
];

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-b border-line px-4 py-6">
      <div>
        <h2 className="text-title font-bold">{title}</h2>
        {note && <p className="mt-1 text-meta text-muted">{note}</p>}
      </div>
      {children}
    </section>
  );
}

export default function DesignPage() {
  return (
    <div>
      <header className="flex flex-col gap-4 border-b border-line px-4 py-6">
        <h1>
          <Logo className="text-5xl" label="Smashy design system" />
        </h1>
        <p className="max-w-prose text-muted">
          How Smashy looks: Frutiger Aero, the glossy Y2K look. In the app icon&apos;s colors: a blush-white glow by day and deep oxblood with ember glows at night, frosted glass panels, glossy flame-red buttons for the main actions, the icon&apos;s black outline (day) or white band (night) for selections, one color per game, and an oxblood scoreboard for sets being played.
          Every piece below is live and follows the theme you pick.
        </p>
        <ThemeToggle />
        <a href="/design/identity" className="link text-sm">Mockups: the &ldquo;Full identity&rdquo; direction (not live) →</a>
      </header>

      <Section title="Color" note="Use the token name in a class: bg-surface, text-muted, border-line, text-danger.">
        {COLORS.map((g) => (
          <div key={g.group} className="flex flex-col gap-2">
            <h3 className="text-meta font-semibold uppercase tracking-wide text-muted">{g.group}</h3>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {g.tokens.map(([name, use]) => (
                <li key={name} className="card flex items-center gap-3 p-2">
                  <span className="h-9 w-9 shrink-0 rounded-lg border border-line" style={{ background: `var(--${name})` }} />
                  <span className="min-w-0">
                    <code className="block truncate font-mono text-meta font-semibold">{name}</code>
                    <span className="block truncate text-meta text-muted">{use}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Section>

      <Section title="Type" note="Source Sans 3 (a humanist sans in the spirit of Frutiger) for text and titles, Geist Mono for codes and numbers.">
        <ul className="flex flex-col gap-4">
          {TYPE.map(([cls, label, sample]) => (
            <li key={label} className="flex flex-col gap-1">
              <span className="text-meta text-muted">{label}</span>
              <span className={cls}>{sample}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Spacing and shape" note="Tailwind's 4px steps. Pills for buttons and tags, 16px corners for cards, 8px for inputs.">
        <ul className="flex flex-col gap-2">
          {SPACING.map(([px, cls, use]) => (
            <li key={px} className="flex items-center gap-3 text-meta">
              <code className="w-14 shrink-0 font-mono">{cls} · {px}</code>
              <span className="h-3 shrink-0 rounded-full bg-brand" style={{ width: px * 2 }} />
              <span className="text-muted">{use}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-3">
          <span className="btn btn-md btn-outline">Pill · rounded-full</span>
          <span className="card px-4 py-2">Card · rounded-2xl</span>
          <span className="field">Input · rounded-lg</span>
        </div>
      </Section>

      <Section title="Buttons" note='Always three classes: btn, a size, a tone. Example: className="btn btn-md btn-primary".'>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-md btn-primary">Post</button>
          <button type="button" className="btn btn-md btn-inverse">Follow</button>
          <button type="button" className="btn btn-md btn-outline">Edit profile</button>
          <button type="button" className="btn btn-md btn-ghost">Cancel</button>
          <button type="button" className="btn btn-md btn-danger">Delete</button>
          <button type="button" className="btn btn-md btn-primary" disabled>Posting…</button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-sm btn-primary">Small</button>
          <button type="button" className="btn btn-md btn-primary">Medium</button>
          <button type="button" className="btn btn-lg btn-primary">Large</button>
          <button type="button" className="btn btn-lg btn-primary btn-hero">Sign up</button>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-meta">
          <dt className="font-semibold">primary</dt><dd className="text-muted">The main action: glossy flame-red jelly.</dd>
          <dt className="font-semibold">hero</dt><dd className="text-muted">Add to primary for the one big action on a page (Sign up, See the results): a stronger glow.</dd>
          <dt className="font-semibold">inverse</dt><dd className="text-muted">Follow, Sign in: glossy black by day, glossy pearl at night.</dd>
          <dt className="font-semibold">outline</dt><dd className="text-muted">Secondary actions next to a primary one: a glass button.</dd>
          <dt className="font-semibold">ghost</dt><dd className="text-muted">Toolbar actions and Cancel.</dd>
          <dt className="font-semibold">danger</dt><dd className="text-muted">Delete, Remove, Unfollow on hover.</dd>
        </dl>
      </Section>

      <Section title="Form fields" note='className="field" on inputs, text areas and dropdowns. Errors use text-danger under the form.'>
        <div className="flex max-w-sm flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-meta font-semibold">Tag</span>
            <input id="design-tag" className="field" placeholder="Your player tag" defaultValue="Bjorn" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-meta font-semibold">Main game</span>
            <select id="design-game" className="field" defaultValue="melee">
              <option value="melee">Melee</option>
              <option value="ultimate">Ultimate</option>
              <option value="pplus">Project+</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-meta font-semibold">Bio</span>
            <textarea id="design-bio" className="field" rows={2} placeholder="Mains, region, what you're working on" />
          </label>
          <p className="text-meta text-danger">That tag is taken. Try adding your city.</p>
        </div>
      </Section>

      <Section title="Chips and badges" note='Chips pick options (className="chip" around a hidden radio). Badges label things (className="badge" plus a color).'>
        <fieldset className="flex flex-wrap gap-2">
          <legend className="sr-only">Example chips</legend>
          {["Neutral", "Edgeguarding", "Ledge tech", "Punish game"].map((c, i) => (
            <label key={c} className="chip">
              <input id={`design-chip-${i}`} type="checkbox" className="sr-only" defaultChecked={i === 0} />
              {c}
            </label>
          ))}
        </fieldset>
        <div className="flex flex-wrap items-center gap-2">
          <GameBadge game="melee" entrants={48} />
          <GameBadge game="ultimate" />
          <GameBadge game="pplus" />
          <span className="badge bg-brand/10 text-brand">3 open</span>
          <span className="badge bg-success/10 text-success">Approved</span>
          <span className="badge bg-warning/15 text-warning">Pending</span>
          <span className="badge border border-line font-normal">Teen account</span>
          <span className="badge bg-surface-2 text-muted">Coming soon</span>
        </div>
      </Section>

      <Section
        title="Scoreboard"
        note='A set, wherever it shows: <Scoreboard> from components/host on className="board". The board is dark in both themes, and inside it the ordinary classes (text-muted, btn-inverse, btn-outline) take dark values. Notices around a set ("your next set is waiting on…") stay on ordinary cards.'
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Scoreboard label="Winners Semi-Final · Best of 3" status="live" statusText="Game 2" left={{ name: "Bjorn", score: 1 }} right={{ name: "Flo", score: 0 }} />
          <Scoreboard label="Set F · Best of 3" status="final" left={{ name: "Bjorn", score: 2 }} right={{ name: "xXDarkSephirothMaster9000Xx_TX", score: 1 }} winner={1} />
          <Scoreboard label="Set K · Best of 5" status="waiting" left={{ name: "Bjorn" }} right={{ name: <span className="font-semibold text-muted">Winner of H</span> }} />
          <YourSetCard opponent="Flo" setup="Setup 3" reported={false} />
          <YourSetCard opponent="Flo" setup={null} reported />
        </div>
        <div className="board flex flex-wrap items-center gap-2 p-3">
          <BoardPill status="live" />
          <BoardPill status="ready" />
          <BoardPill status="reported" />
          <BoardPill status="waiting" />
          <BoardPill status="final" />
        </div>
      </Section>

      <Section title="Icons" note="<Icon name=…> from components/ui: line icons in the color and size of the text around them. Use these instead of emoji, which look different on every phone.">
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {ICON_NAMES.map((name) => (
            <li key={name} className="card flex items-center gap-2 p-2">
              <Icon name={name} className="text-xl" />
              <code className="truncate font-mono text-meta">{name}</code>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Tabs" note="<TabBar> from components/ui. Bold label and a short red bar under the active tab.">
        <div className="card overflow-hidden">
          <TabBar
            label="Example tabs"
            active="melee"
            tabs={[
              { key: "all", label: "All", href: "/design" },
              { key: "melee", label: "Melee", href: "/design" },
              { key: "ultimate", label: "Ultimate", href: "/design" },
              { key: "pplus", label: "P+", href: "/design" },
            ]}
          />
        </div>
      </Section>

      <Section title="Post" note="Avatar, name row, body, action row. 16px gutter, 12px between avatar and text, divider between posts.">
        <article className="card flex gap-3 p-4">
          <Avatar name="Bjorn" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-x-1 text-body">
              <span className="font-bold">Bjorn</span>
              <span className="text-muted">@bjornfox · 2h</span>
              <GameBadge game="melee" />
            </div>
            <p>
              Finally beat my Marth demon at SA Melee Monday. Shield drop to up-B was the whole set.{" "}
              <span className="link">#SSBM_FOX</span>
            </p>
            <div className="mt-1 flex gap-8 text-meta text-muted">
              <span>4 replies</span>
              <span className="text-repost">2 reposts</span>
              <span className="text-like">18 likes</span>
            </div>
          </div>
        </article>
        <div className="flex items-center gap-3">
          <Avatar name="Bjorn" size="sm" />
          <Avatar name="Bjorn" size="md" />
          <Avatar name="Bjorn" size="lg" />
          <span className="text-meta text-muted">Avatar sizes: sm, md, lg</span>
        </div>
      </Section>

      <Section title="Loading placeholders" note="components/ui/Skeleton: Feed, CardList, People, Profile, Bracket, Set, Scoreboard, Clip, Page. Use as a Suspense fallback in the shape of what's coming.">
        <div className="overflow-hidden card">
          <FeedSkeleton count={2} label="Example: loading posts" />
        </div>
        <CardListSkeleton count={1} label="Example: loading cards" />
        <div className="overflow-hidden card">
          <SetSkeleton />
          <ScoreboardSkeleton />
        </div>
      </Section>

      <Section title="Brand">
        <div className="flex flex-wrap items-end gap-6">
          <Logo className="text-6xl" />
          <Logo markOnly className="text-6xl" />
        </div>
        <p className="text-meta text-muted">
          Wordmark in heavy serif capitals with a flame fill, a white band and a dark outline, and a diagonal cross through the S. It is drawn artwork (no font), so it looks the same on light and dark.
        </p>
      </Section>
    </div>
  );
}
