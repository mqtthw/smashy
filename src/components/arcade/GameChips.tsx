// The Arcade's game filter (round 956, Matthew: "The games should be separable by game but leave it on all smash
// titles by default"): a row of links, "All games" first, for the games made from Smash history's results.
import Link from "next/link";
import { GAME_KEYS, GAMES, type GameKey } from "@/lib/games";
import { T } from "@/lib/i18n/client";

export default function GameChips({ base, game }: { base: string; game: GameKey | null }) {
  return (
    <nav className="flex flex-wrap gap-2">
      <Link href={base} aria-current={!game ? "page" : undefined} className="chip py-1"><T k="history.allGames" /></Link>
      {GAME_KEYS.map((g) => (
        <Link key={g} href={`${base}?game=${g}`} aria-current={game === g ? "page" : undefined} className="chip py-1">{GAMES[g].short}</Link>
      ))}
    </nav>
  );
}
