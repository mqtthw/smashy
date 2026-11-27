// The Arcade: small games made from Smash history's saved results (Matthew, 2026-11-26: something to come
// back for, for people who care less about data). No sign-in, nothing saved on the server.
import type { Metadata } from "next";
import Link from "next/link";
import type { MessageKey } from "@/lib/i18n/base";
import { T } from "@/lib/i18n/client";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("history.arcade.title"), description: "Small free games made from Super Smash Bros. tournament history: guess the major from its top 8, and higher or lower." };
}

const GAMES_LIST: { href: string; title: MessageKey; blurb: MessageKey; kind: MessageKey }[] = [
  { href: "/arcade/major", title: "history.arcade.major.title", blurb: "history.arcade.major.blurb", kind: "history.arcade.daily" },
  { href: "/arcade/player", title: "history.arcade.player.title", blurb: "history.arcade.player.blurb", kind: "history.arcade.daily" },
  { href: "/arcade/higher-lower", title: "history.arcade.hl.title", blurb: "history.arcade.hl.blurb", kind: "history.arcade.endless" },
  { href: "/arcade/sets", title: "history.arcade.sets.title", blurb: "history.arcade.sets.blurb", kind: "history.arcade.endless" },
];

export default function ArcadePage() {
  return (
    <section className="flex flex-col gap-4 p-4">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold"><T k="history.arcade.title" /></h1>
        <p className="text-sm text-muted"><T k="history.arcade.intro" /></p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2">
        {GAMES_LIST.map((g) => (
          <li key={g.href}>
            <Link href={g.href} className="card flex h-full flex-col gap-2 p-4 hover:bg-surface">
              <span className="badge self-start border border-line font-normal"><T k={g.kind} /></span>
              <span className="text-lg font-bold"><T k={g.title} /></span>
              <span className="text-sm text-muted"><T k={g.blurb} /></span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
