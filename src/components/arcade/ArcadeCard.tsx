// The Arcade's advert on the home page. Round 943 put a quiet row in the Feed, round 944 moved it to the
// right-hand column on wide screens; round 947 (Matthew: "This is boring and I probably wouldnt click …
// 'Arcade- smashy has games!' And the design should appeal to clicks") made it loud: the games' coloured
// glyphs bobbing in a row, "ARCADE" in the skin's slanted capitals on a hot gradient, and a button with a
// passing shine. No data of its own. `ArcadePromo` is the card; the default export is the Feed's copy, shown
// only where there's no right-hand column.
import Link from "next/link";
import { T } from "@/lib/i18n/client";

const GLYPHS: [string, string][] = [["8", "#ffd447"], ["?", "#ff6b5e"], ["↑↓", "#5ad1ff"], ["VS", "#7dff9a"], ["⚡", "#ffa040"]];

export function ArcadePromo({ className = "" }: { className?: string }) {
  return (
    <Link href="/arcade" className={`arcade-promo flex flex-col gap-2 p-4 ${className}`}>
      <span aria-hidden="true" className="flex items-center gap-2">
        {GLYPHS.map(([glyph, color], i) => (
          <span key={glyph} className="arcade-glyph arcade-mini" style={{ "--tile": color, animationDelay: `${i * 140}ms` } as React.CSSProperties}>{glyph}</span>
        ))}
      </span>
      <span className="arcade-promo-title"><T k="history.arcade.card.title" /></span>
      <span className="text-base font-bold"><T k="history.arcade.card.tag" /></span>
      <span className="text-sm opacity-90"><T k="history.arcade.card.text" /></span>
      <span className="arcade-promo-btn self-start"><T k="history.arcade.card.play" /> →</span>
    </Link>
  );
}

export default function ArcadeCard() {
  return <ArcadePromo className="m-3 xl:hidden" />;
}
