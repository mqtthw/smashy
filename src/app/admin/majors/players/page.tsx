// Admin: one player across tags (Smash history H2, docs/archive-plan.md). Names in results added by hand
// (Liquipedia's lists, before start.gg) linked to start.gg players, so careers and tallies run from a
// player's first major to now. Admin-confirmed only.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import AdminTabs from "@/components/admin/AdminTabs";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { GAMES, isGameKey } from "@/lib/games";
import { getUnlinkedNames, listNameLinks, safeToBulkLink } from "@/lib/playerLinks";
import { isSiteAdmin } from "@/lib/scenes";
import { getUserId } from "@/lib/supabase/server";
import { linkAllExactAction, unlinkNameAction } from "../../actions";
import LinkNameForm from "./LinkNameForm";

export const metadata: Metadata = { title: "Players across tags", robots: { index: false } };

const SHOWN = 60;

async function Players() {
  if (!(await isSiteAdmin(await getUserId()))) notFound();
  const [unlinked, links] = await Promise.all([getUnlinkedNames(), listNameLinks()]);
  const exact = unlinked.filter(safeToBulkLink).length;
  return (
    <div className="flex flex-col gap-6">
      <AdminTabs active="majors" />
      <section className="flex flex-col gap-2 text-sm">
        <h2 className="text-lg font-bold">Smash history: one player across tags</h2>
        <p className="text-muted">
          Results added by hand (before start.gg) name players without a start.gg id. Link each name to the player it is, so their
          player page, &quot;Top 8s at majors&quot; and the year tallies count it. A green suggestion is a player who placed at a major under
          the same name (capitals, spaces and dots ignored); a grey one is only someone on start.gg with that tag, often a different
          person (there are many &quot;Mango&quot;s), so check before linking. A name two people used in different games
          (Smash 4&apos;s &quot;ZeRo&quot;, Smash 64&apos;s &quot;Zero&quot;) can be linked once per game: pick the game next to the id. A different spelling (&quot;Mango&quot; and
          &quot;Mang0&quot;) needs the player pasted in. Only link when you&apos;re sure it&apos;s the same person.
        </p>
        <p>
          {unlinked.length} names not linked yet ({unlinked.reduce((n, u) => n + u.placings, 0)} placings); {links.length} linked.
        </p>
        {exact > 0 && (
          <form action={linkAllExactAction}>
            <button className="btn btn-md btn-outline">Link all {exact} names that match exactly one player seen at a major</button>
          </form>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="font-semibold">Not linked yet (most placings first)</h3>
        <ul className="flex flex-col gap-2">
          {unlinked.slice(0, SHOWN).map((n) => (
            <li key={n.key} className="card flex flex-col gap-2 p-3 text-sm">
              <p>
                <span className="font-semibold">{n.name}</span>
                <span className="text-muted"> · {n.games.map((g) => (isGameKey(g) ? GAMES[g].short : g)).join(", ")} · {n.placings} placing{n.placings === 1 ? "" : "s"}{n.suggestions.length > 1 ? ` · ${n.suggestions.length} possible players: check which` : ""}</span>
              </p>
              <LinkNameForm name={n.name} games={n.games} suggestions={n.suggestions} />
            </li>
          ))}
        </ul>
        {unlinked.length > SHOWN && <p className="text-sm text-muted">…and {unlinked.length - SHOWN} more with fewer placings.</p>}
      </section>

      {links.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="font-semibold">Linked</h3>
          <ul className="card divide-y divide-line text-sm">
            {links.map((l) => (
              <li key={l.key} className="flex items-center gap-3 px-3 py-2">
                <span className="min-w-0 flex-1 truncate">
                  {l.name}{l.game && isGameKey(l.game) ? ` (${GAMES[l.game].short} only)` : ""} → <Link href={`/players/${l.playerId}`} className="underline">{l.tag ?? `player ${l.playerId}`}</Link>
                </span>
                <form action={unlinkNameAction.bind(null, l.key)}><button className="btn btn-sm btn-ghost">Unlink</button></form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default function PlayersAcrossTagsPage() {
  return (
    <section className="flex flex-col gap-4 p-4">
      <header className="pt-2">
        <Link href="/admin/majors" className="text-sm text-muted hover:text-foreground">← Majors</Link>
        <h1 className="mt-2 text-2xl font-bold">Site admin</h1>
      </header>
      <Suspense fallback={<CardListSkeleton />}>
        <Players />
      </Suspense>
    </section>
  );
}
