// The Arcade's Melee trainers (round 950). Played entirely in the browser; the page itself is fixed and reads nothing.
import type { Metadata } from "next";
import Link from "next/link";
import Powershield from "@/components/arcade/Powershield";
import { T } from "@/lib/i18n/client";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("history.arcade.ps.title"), description: "A free browser trainer for Super Smash Bros. Melee's powershield: raise your shield in the two-frame window to reflect a laser." };
}

export default function Page() {
  return (
    <section className="flex flex-col gap-4 p-4">
      <Link href="/arcade" className="text-sm text-muted hover:text-foreground"><T k="history.arcade.back" /></Link>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold"><T k="history.arcade.ps.title" /></h1>
        <p className="text-sm text-muted"><T k="history.arcade.ps.blurb" /></p>
      </header>
      <Powershield />
    </section>
  );
}
