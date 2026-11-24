import type { Metadata } from "next";
import Link from "next/link";
import { GAMES, LEGACY_GAME_KEYS, MAIN_GAME_KEYS } from "@/lib/games";
import { CHARACTERS } from "@/lib/characters";
import { T } from "@/lib/i18n/client";

export const metadata: Metadata = {
  title: "Smash Bros. character guides and resources",
  description: "Guides, combo videos, matchup notes, tech, and frame data for Melee, Ultimate, and Project+, organized by character.",
};

export default function GamesHubPage() {
  return (
    <section className="flex flex-col gap-4 p-4">
      <header className="pt-2">
        <h1 className="text-2xl font-bold"><T k="media.games.title" /></h1>
        <p className="text-muted">
          <T k="media.games.intro" />
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-3">
        {MAIN_GAME_KEYS.map((g) => (
          <Link key={g} href={`/games/${g}`} className="card p-4 hover:bg-surface">
            <p className="text-lg font-bold">{GAMES[g].short}</p>
            <p className="text-sm text-muted"><T k="media.games.characters" values={{ n: CHARACTERS[g].length }} /></p>
          </Link>
        ))}
      </div>
      <section aria-labelledby="more-games" className="flex flex-col gap-2">
        <h2 id="more-games" className="text-meta font-semibold uppercase tracking-wide text-muted"><T k="media.games.more" /></h2>
        <div className="flex flex-wrap gap-2">
          {LEGACY_GAME_KEYS.map((g) => (
            <Link key={g} href={`/games/${g}`} className="btn btn-md btn-outline">
              {GAMES[g].short} <span className="font-normal text-muted">· {CHARACTERS[g].length}</span>
            </Link>
          ))}
        </div>
      </section>
      <Link href="/search" className="self-start text-sm text-brand"><T k="media.games.search" /></Link>
    </section>
  );
}
