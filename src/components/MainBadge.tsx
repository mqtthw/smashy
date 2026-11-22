"use client";
// A client component so its label follows the visitor's language; server pages can still use it (plain-data props).
import { characterName, type Main } from "@/lib/characters";
import { GAMES } from "@/lib/games";
import { mainCode, stockIconUrl } from "@/lib/mainBadge";
import { useT } from "@/lib/i18n/client";

const CODE_COLORS: Record<Main["game"], string> = {
  melee: "bg-melee/15 text-melee",
  ultimate: "bg-ultimate/15 text-ultimate",
  pplus: "bg-pplus/15 text-pplus",
  smash64: "bg-smash64/15 text-smash64",
  brawl: "bg-brawl/15 text-brawl",
  smash4: "bg-smash4/15 text-smash4",
};

/**
 * A player's main, next to their name: their stock icon, or a small code badge when there's none (Project+).
 * Hidden for viewers who turned main icons off (the "main-badge" class; see globals.css).
 */
export default function MainBadge({ main, size = "sm" }: { main: Main | null; size?: "sm" | "md" }) {
  const t = useT();
  if (!main) return null;
  const label = t("people.mains", { character: characterName(main.game, main.character) ?? main.character, game: GAMES[main.game].short });
  const icon = stockIconUrl(main);
  const px = size === "md" ? 24 : 18;
  if (icon) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={icon} alt={label} title={label} width={px} height={px} className="main-badge inline-block shrink-0 align-middle" style={{ width: px, height: px }} />;
  }
  return (
    <span title={label} aria-label={label} className={`main-badge inline-flex shrink-0 items-center rounded px-1 align-middle font-mono text-[10px] font-bold leading-4 ${CODE_COLORS[main.game]}`}>
      {mainCode(main)}
    </span>
  );
}
