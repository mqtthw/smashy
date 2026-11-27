// The tech-chase trainer: the Arcade's reflex game (round 946). Played entirely in the browser; the page
// itself is fixed and reads nothing.
import type { Metadata } from "next";
import Link from "next/link";
import { ArcadeBanner, GAME_LOOK } from "@/components/arcade/ArcadeArt";
import TechChase from "@/components/arcade/TechChase";
import { T } from "@/lib/i18n/client";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("history.arcade.tech.title"), description: "A free browser reaction game inspired by Super Smash Bros. Melee's tech chase: read how they get up, chase with A and D, grab with Space." };
}

export default function TechChasePage() {
  return (
    <section className="flex flex-col gap-4 p-4">
      <Link href="/arcade" className="text-sm text-muted hover:text-foreground"><T k="history.arcade.back" /></Link>
      <ArcadeBanner look={GAME_LOOK.tech} />
      <TechChase />
    </section>
  );
}
