import Link from "next/link";
import CharacterIcon from "@/components/CharacterIcon";
import { CHARACTERS } from "@/lib/characters";
import type { GameKey } from "@/lib/games";
import { T } from "@/lib/i18n/client";

/**
 * Every matchup for a character, each opening its page of guides, VODs and discussions. Opponents
 * with guides, VODs or discussions come first (with how many); the rest are folded away. No ratings.
 */
export default function MatchupGrid({ game, character, name, counts }: { game: GameKey; character: string; name: string; counts: Map<string, number> }) {
  const others = CHARACTERS[game].filter((c) => c.key !== character);
  const withStuff = others.filter((c) => counts.get(c.key)).sort((a, b) => (counts.get(b.key) ?? 0) - (counts.get(a.key) ?? 0));
  const rest = others.filter((c) => !counts.get(c.key));
  const tile = (c: { key: string; name: string }) => (
    <li key={c.key}>
      <Link href={`/games/${game}/${character}/vs/${c.key}`} className="flex items-center gap-2 rounded-lg border border-line px-2 py-1.5 text-sm hover:bg-surface">
        <CharacterIcon game={game} character={c.key} size={22} />
        <span className="min-w-0 flex-1 truncate"><T k="media.vsName" values={{ name: c.name }} /></span>
        {counts.get(c.key) ? <span className="text-meta text-muted">{counts.get(c.key)}</span> : null}
      </Link>
    </li>
  );
  return (
    <section aria-labelledby="matchups" className="flex flex-col gap-2">
      <h2 id="matchups" className="font-bold"><T k="media.mu.title" /></h2>
      <p className="text-sm text-muted"><T k="media.mu.intro" values={{ name }} /></p>
      {withStuff.length > 0 && <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">{withStuff.map(tile)}</ul>}
      <details className="group">
        <summary className="cursor-pointer text-sm font-semibold text-brand">
          {withStuff.length ? <T k="media.mu.more" values={{ n: rest.length }} /> : <T k="media.mu.pick" values={{ n: others.length }} />}
        </summary>
        <ul className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">{rest.map(tile)}</ul>
      </details>
    </section>
  );
}
