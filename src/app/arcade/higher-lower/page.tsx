// Higher or lower: the Arcade's endless game, played in the browser from the list of majors with a known size.
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import GameChips from "@/components/arcade/GameChips";
import HigherLower from "@/components/arcade/HigherLower";
import { isGameKey } from "@/lib/games";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { hlPool, hlRound } from "@/lib/arcade";
import { arcadeMajors } from "@/lib/arcadeData";
import { T } from "@/lib/i18n/client";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("history.arcade.hl.title"), description: "Two Super Smash Bros. majors: which had more entrants, or which came first? Keep your streak going." };
}

async function Game({ searchParams }: { searchParams: PageProps<"/arcade/higher-lower">["searchParams"] }) {
  const sp = await searchParams;
  const game = isGameKey(sp.game) ? sp.game : null;
  await connection(); // a different first pair each visit
  const pool = hlPool((await arcadeMajors().catch(() => null)) ?? []).filter((m) => !game || m.game === game);
  const first = hlRound(pool, Math.random);
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
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold"><T k="history.arcade.hl.title" /></h1>
        <p className="text-sm text-muted"><T k="history.arcade.hl.blurb" /></p>
      </header>
      <Suspense fallback={<CardListSkeleton count={2} />}>
        <Game searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
