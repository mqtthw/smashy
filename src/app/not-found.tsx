import type { Metadata } from "next";
import Link from "next/link";
import { T } from "@/lib/i18n/client";

export const metadata: Metadata = { title: "Page not found" };

/** Where a visitor with a broken link most likely wanted to go (round 806): the guest home page's main places. */
const PLACES = [
  { href: "/events", k: "ui.guest.t.events" },
  { href: "/search?tab=players", k: "ui.guest.t.players" },
  { href: "/history", k: "ui.guest.t.history" },
  { href: "/games", k: "ui.guest.t.characters" },
] as const;

export default function NotFound() {
  return (
    <div className="px-4 py-16 text-center">
      <h1 className="text-title font-bold"><T k="ui.notFound.title" /></h1>
      <p className="mt-2 text-muted"><T k="ui.notFound.body" /></p>
      <div className="mt-6 flex justify-center">
        <Link href="/" className="btn btn-md btn-primary">
          <T k="ui.error.home" />
        </Link>
      </div>
      <nav className="mt-6 flex flex-wrap justify-center gap-2">
        {PLACES.map((p) => (
          <Link key={p.href} href={p.href} className="chip">
            <T k={p.k} />
          </Link>
        ))}
      </nav>
    </div>
  );
}
