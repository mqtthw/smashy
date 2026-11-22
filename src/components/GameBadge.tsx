import { GAMES, type GameKey } from "@/lib/games";

const colors: Record<GameKey, string> = {
  melee: "bg-melee/15 text-melee",
  ultimate: "bg-ultimate/15 text-ultimate",
  pplus: "bg-pplus/15 text-pplus",
  smash64: "bg-smash64/15 text-smash64",
  brawl: "bg-brawl/15 text-brawl",
  smash4: "bg-smash4/15 text-smash4",
};

export default function GameBadge({ game, entrants }: { game: GameKey; entrants?: number | null }) {
  return (
    <span className={`badge ${colors[game]}`}>
      {GAMES[game].short}
      {entrants ? <span className="font-normal opacity-80">· {entrants}</span> : null}
    </span>
  );
}
