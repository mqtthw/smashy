// The characters a player used at a major (Smash history, step H5), as small stock icons, most played
// first; a character without an icon shows its name. From the sets start.gg recorded.
import type { GameKey } from "@/lib/games";
import { stockIconUrl } from "@/lib/mainBadge";
import { startggCharacterKey } from "@/lib/majorSets";

export default function CharacterStocks({ game, names, max = 3, size = 16 }: { game: GameKey; names: string[]; max?: number; size?: number }) {
  const shown = names.slice(0, max);
  if (!shown.length) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 align-middle" title={names.join(", ")}>
      {shown.map((name) => {
        const src = stockIconUrl({ game, character: startggCharacterKey(name) });
        return src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={name} src={src} alt={name} width={size} height={size} style={{ width: size, height: size }} />
        ) : (
          <span key={name} className="text-meta text-muted">{name}</span>
        );
      })}
    </span>
  );
}
