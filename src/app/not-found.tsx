import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Page not found" };

/** Where a visitor with a broken link most likely wanted to go (round 806): the guest home page's main places. */
const PLACES = [
  { href: "/events", k: "ui.guest.t.events" },
  { href: "/search?tab=players", k: "ui.guest.t.players" },
  { href: "/history", k: "ui.guest.t.history" },
  { href: "/games", k: "ui.guest.t.characters" },
] as const;

/**
 * Round 907 (checklist.design's 404 list): a search box, for when the visitor knows what they were after, and a
 * way to tell Smashy about the broken link, beside the way home and the main places.
 */
async function NotFoundBody() {
  const t = await getT();
  return (
    <div className="px-4 py-16 text-center">
      <h1 className="text-title font-bold">{t("ui.notFound.title")}</h1>
      <p className="mt-2 text-muted">{t("ui.notFound.body")}</p>
      <form action="/search" method="get" role="search" className="mx-auto mt-6 flex max-w-sm gap-2">
        <input type="search" name="q" aria-label={t("feed.search")} placeholder={t("ui.notFound.searchPlaceholder")} className="field min-w-0 flex-1" />
        <button type="submit" className="btn btn-md btn-outline">{t("feed.search")}</button>
      </form>
      <div className="mt-4 flex justify-center">
        <Link href="/" className="btn btn-md btn-primary">{t("ui.error.home")}</Link>
      </div>
      <nav className="mt-6 flex flex-wrap justify-center gap-2">
        {PLACES.map((p) => (
          <Link key={p.href} href={p.href} className="chip">{t(p.k)}</Link>
        ))}
      </nav>
      <p className="mt-6 text-sm text-muted">
        <Link href="/help" className="link">{t("ui.notFound.report")}</Link>
      </p>
    </div>
  );
}

/** In Suspense: the words follow the visitor's language, read from a cookie. */
export default function NotFound() {
  return (
    <Suspense fallback={<div className="px-4 py-16" />}>
      <NotFoundBody />
    </Suspense>
  );
}
