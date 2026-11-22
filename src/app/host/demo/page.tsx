// "Try a bracket": a made-up 8-player event anyone can play through without an account, from both
// the player's side and the TO's side. Public and static; the bracket itself runs in the browser
// (components/host/demo/DemoEvent.tsx) and nothing is saved.
import type { Metadata } from "next";
import Link from "next/link";
import DemoEvent from "@/components/host/demo/DemoEvent";
import { T } from "@/lib/i18n/client";
import { pageMeta } from "@/lib/siteMeta";

// Static (like /host/about) so the page is built ahead of time; the words below follow the reader's language.
export const metadata: Metadata = pageMeta(
  "Try a bracket on Smashy",
  "Play through a made-up 8-player bracket without an account: strike stages and report scores as a player, then run it from the TO's screen.",
);

export default function HostDemoPage() {
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
      <header className="flex flex-col gap-2">
        <Link href="/host/about" className="text-sm text-muted hover:text-foreground"><T k="hostsetup.demo.back" /></Link>
        <h1 className="text-2xl font-bold leading-tight"><T k="hostsetup.demo.title" /></h1>
        <p className="text-muted">
          <T k="hostsetup.demo.intro" />
        </p>
        <p className="text-meta text-muted"><T k="hostsetup.demo.nothingSaved" /></p>
      </header>
      <DemoEvent />
    </article>
  );
}
