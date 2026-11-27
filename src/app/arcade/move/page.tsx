// One of the Arcade's Melee knowledge quizzes (round 955). Played entirely in the browser; the page reads nothing.
import type { Metadata } from "next";
import Link from "next/link";
import FrameQuiz from "@/components/arcade/FrameQuiz";
import { T } from "@/lib/i18n/client";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("history.arcade.fq.move.title"), description: "A free Super Smash Bros. Melee and Ultimate quiz: a move shown as its frames (startup, active, recovery). Which move is it?" };
}

export default function Page() {
  return (
    <section className="flex flex-col gap-4 p-4">
      <Link href="/arcade" className="text-sm text-muted hover:text-foreground"><T k="history.arcade.back" /></Link>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold"><T k="history.arcade.fq.move.title" /></h1>
        <p className="text-sm text-muted"><T k="history.arcade.fq.move.blurb" /></p>
      </header>
      <FrameQuiz kind="move" />
    </section>
  );
}
