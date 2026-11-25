import type { Metadata } from "next";
import Link from "next/link";
import { GAMES, LEGACY_GAME_KEYS, MAIN_GAME_KEYS } from "@/lib/games";
import { CHARACTERS } from "@/lib/characters";
import { T } from "@/lib/i18n/client";
import CharacterIcon from "@/components/CharacterIcon";
import { stockIconUrl } from "@/lib/mainBadge";
import type { GameKey } from "@/lib/games";

// A row of well-known faces on each game's card (round 832, Matthew picked "Character faces"): the cards
// were just a name and a count, so the page didn't look like character pages. Characters without an icon
// are skipped, and the rest of the roster fills in up to eight.
const FEATURED: Partial<Record<GameKey, string[]>> = {
  melee: ["fox", "falco", "marth", "sheik", "captain-falcon", "jigglypuff", "peach", "ice-climbers"],
  ultimate: ["mario", "link", "pikachu", "kirby", "cloud", "joker", "steve", "sonic"],
  pplus: ["fox", "marth", "wolf", "snake", "lucario", "ike", "mewtwo", "sonic"],
};

function faces(game: GameKey): string[] {
  const roster = CHARACTERS[game].map((c) => c.key);
  const order = [...(FEATURED[game] ?? []).filter((k) => roster.includes(k)), ...roster];
  return [...new Set(order)].filter((k) => stockIconUrl({ game, character: k })).slice(0, 8);
}

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
          <Link key={g} href={`/games/${g}`} className="card flex flex-col gap-2 p-4 hover:bg-surface">
            <span>
              <span className="block text-lg font-bold">{GAMES[g].short}</span>
              <span className="block text-sm text-muted"><T k="media.games.characters" values={{ n: CHARACTERS[g].length }} /></span>
            </span>
            <span className="flex h-7 flex-wrap gap-1.5 overflow-hidden">
              {faces(g).map((c) => <CharacterIcon key={c} game={g} character={c} size={28} />)}
            </span>
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
