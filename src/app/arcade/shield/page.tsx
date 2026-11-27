// Which is safer on shield? (round 968), an Ultimate knowledge quiz. Played entirely in the browser; the page reads nothing.
import type { Metadata } from "next";
import Link from "next/link";
import FrameQuiz from "@/components/arcade/FrameQuiz";
import { T } from "@/lib/i18n/client";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("history.arcade.fq.shield.title"), description: "A free Super Smash Bros. Ultimate quiz: two moves hit a shield. Which leaves its user less behind? Ten questions from the frame data." };
}

export default function Page() {
  return (
    <section className="flex flex-col gap-4 p-4">
      <Link href="/arcade" className="text-sm text-muted hover:text-foreground"><T k="history.arcade.back" /></Link>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold"><T k="history.arcade.fq.shield.title" /></h1>
        <p className="text-sm text-muted"><T k="history.arcade.fq.shield.blurb" /></p>
      </header>
      <FrameQuiz kind="shield" />
    </section>
  );
}
