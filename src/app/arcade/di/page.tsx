// The Arcade's Melee trainers (round 950). Played entirely in the browser; the page itself is fixed and reads nothing.
import type { Metadata } from "next";
import Link from "next/link";
import DiSurvival from "@/components/arcade/DiSurvival";
import { T } from "@/lib/i18n/client";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("history.arcade.di.title"), description: "A free browser trainer for directional influence in Super Smash Bros. Melee: hold a direction to bend the launch and survive hits that kill, flown with the game's real knockback maths." };
}

export default function Page() {
  return (
    <section className="flex flex-col gap-4 p-4">
      <Link href="/arcade" className="text-sm text-muted hover:text-foreground"><T k="history.arcade.back" /></Link>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold"><T k="history.arcade.di.title" /></h1>
        <p className="text-sm text-muted"><T k="history.arcade.di.blurb" /></p>
      </header>
      <DiSurvival />
    </section>
  );
}
