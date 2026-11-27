// Higher or lower: the Arcade's endless game, played in the browser as a chain of famous players (major wins,
// top 8s) and big majors (entrants), from Smash history's saved results.
import type { Metadata } from "next";
import Link from "next/link";
import { ArcadeBanner, GAME_LOOK } from "@/components/arcade/ArcadeArt";
import { connection } from "next/server";
import { Suspense } from "react";
import GameChips from "@/components/arcade/GameChips";
import HigherLower from "@/components/arcade/HigherLower";
import { GAME_KEYS, isGameKey } from "@/lib/games";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { hlMajorCards, hlStart } from "@/lib/arcade";
import { arcadeHlPlayers, arcadeMajors } from "@/lib/arcadeData";
import { T } from "@/lib/i18n/client";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("history.arcade.hl.title"), description: "Super Smash Bros. players' major wins and top 8s, and majors' entrants: is the next one higher or lower? Keep your streak going." };
}

async function Game({ searchParams }: { searchParams: PageProps<"/arcade/higher-lower">["searchParams"] }) {
  const sp = await searchParams;
  const game = isGameKey(sp.game) ? sp.game : null;
  await connection(); // a different first pair each visit
  const [majors, players] = await Promise.all([arcadeMajors().catch(() => null), arcadeHlPlayers(game ? [game] : GAME_KEYS).catch(() => null)]);
  const pool = [...hlMajorCards((majors ?? []).filter((m) => !game || m.game === game)), ...(players ?? [])];
  const first = hlStart(pool, Math.random);
  return (
    <>
      <GameChips base="/arcade/higher-lower" game={game} />
      {/* The key starts the game afresh when the filter changes. */}
      {first ? <HigherLower key={game ?? "all"} pool={pool} first={first} /> : <p className="card p-4 text-sm text-muted"><T k="history.arcade.unavailable" /></p>}
    </>
  );
}

export default function HigherLowerPage(props: PageProps<"/arcade/higher-lower">) {
  return (
    <section className="flex flex-col gap-4 p-4">
      <Link href="/arcade" className="text-sm text-muted hover:text-foreground"><T k="history.arcade.back" /></Link>
      <ArcadeBanner look={GAME_LOOK.hl} />
      <Suspense fallback={<CardListSkeleton count={2} />}>
        <Game searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
