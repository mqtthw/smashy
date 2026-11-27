// Guess the major: the Arcade's daily puzzle. Everyone gets the same major on a UTC day, picked from the
// majors with a full top 8 and a known size.
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import GuessMajor from "@/components/arcade/GuessMajor";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { dayNumber, majorOptions, majorPuzzlePool, pickDaily } from "@/lib/arcade";
import { arcadeMajors } from "@/lib/arcadeData";
import { unixNow } from "@/lib/format";
import { GAMES } from "@/lib/games";
import { majorHref } from "@/lib/handMajors";
import { T } from "@/lib/i18n/client";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("history.arcade.major.title"), description: "A daily Super Smash Bros. puzzle: a real major's top 8 with the tournament hidden. Five tries to name it." };
}

async function Puzzle() {
  await connection(); // today's puzzle
  const majors = await arcadeMajors().catch(() => null);
  const day = dayNumber(unixNow() * 1000);
  const pick = majors ? pickDaily(majorPuzzlePool(majors), day) : null;
  if (!majors || !pick) return <p className="card p-4 text-sm text-muted"><T k="history.arcade.unavailable" /></p>;
  const options = majorOptions(majors, pick.game);
  const answer = options.find((o) => o.slug === pick.slug)!;
  return <GuessMajor day={day} gameLabel={GAMES[pick.game].short} top8={pick.top8} answer={answer} answerHref={majorHref(pick.slug)} options={options} />;
}

export default function GuessMajorPage() {
  return (
    <section className="flex flex-col gap-4 p-4">
      <Link href="/arcade" className="text-sm text-muted hover:text-foreground"><T k="history.arcade.back" /></Link>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold"><T k="history.arcade.major.title" /></h1>
        <p className="text-sm text-muted"><T k="history.arcade.major.blurb" /></p>
      </header>
      <Suspense fallback={<CardListSkeleton count={2} />}>
        <Puzzle />
      </Suspense>
    </section>
  );
}
