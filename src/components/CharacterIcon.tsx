import type { GameKey } from "@/lib/games";
import { pixelArtIcon, stockIconUrl } from "@/lib/mainBadge";

/** A character's stock icon (for character lists and pages). Nothing if that game has no icons. */
export default function CharacterIcon({ game, character, size = 24 }: { game: GameKey; character: string; size?: number }) {
  const src = stockIconUrl({ game, character });
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" aria-hidden="true" width={size} height={size} loading="lazy" className="shrink-0" style={{ width: size, height: size, imageRendering: pixelArtIcon(src, size) ? "pixelated" : undefined }} />;
}
