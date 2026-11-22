import LocalTime from "@/components/ui/LocalTime";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import AdminTabs from "@/components/admin/AdminTabs";
import { findAccount, listSuspended, type AccountSummary } from "@/lib/accounts";
import { getHiddenPlayers } from "@/lib/playerIndex";
import { isSiteAdmin } from "@/lib/scenes";
import { getUserId } from "@/lib/supabase/server";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { suspendUser, unhideStartggPlayer, unsuspendUser } from "../actions";
import HidePlayerForm from "./HidePlayerForm";

export const metadata: Metadata = { title: "People", robots: { index: false } };


function AccountCard({ a, isAdmin }: { a: AccountSummary; isAdmin: boolean }) {
  return (
    <div className="card flex flex-col gap-2 p-4">
      <p>
        <Link href={`/u/${a.handle}`} className="font-bold hover:underline">{a.tag}</Link>{" "}
        <span className="text-muted">@{a.handle} · joined {<LocalTime iso={a.createdAt} style="date" />}</span>
      </p>
      {a.suspended ? (
        <>
          <p className="text-sm">
            <span className="badge bg-danger/10 font-semibold text-danger">Suspended</span>
            {a.suspendedAt && <> since <LocalTime iso={a.suspendedAt} style="date" /></>}
            {a.suspendedReason && `: ${a.suspendedReason}`}
          </p>
          <form action={unsuspendUser.bind(null, a.id)}>
            <button className="btn btn-sm btn-outline">Unsuspend</button>
          </form>
        </>
      ) : isAdmin ? (
        <p className="text-sm text-muted">Site admins can&apos;t be suspended here.</p>
      ) : (
        <form action={suspendUser.bind(null, a.id)} className="flex flex-wrap gap-2">
          <input name="reason" maxLength={300} placeholder="Reason (only admins see this)" aria-label="Reason" className="field min-w-0 flex-1 py-1.5" />
          <button className="btn btn-sm btn-danger">Suspend account</button>
        </form>
      )}
    </div>
  );
}

async function People({ searchParams }: { searchParams: PageProps<"/admin/people">["searchParams"] }) {
  if (!(await isSiteAdmin(await getUserId()))) notFound();
  const { handle } = await searchParams;
  const q = typeof handle === "string" ? handle.trim() : "";
  const [found, suspended, hiddenPlayers] = await Promise.all([q ? findAccount(q) : Promise.resolve(null), listSuspended(), getHiddenPlayers().catch(() => null)]);
  const foundIsAdmin = found ? await isSiteAdmin(found.id) : false;
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="font-bold">Find an account</h2>
        <form className="flex gap-2">
          <input name="handle" defaultValue={q} placeholder="@handle" aria-label="Handle" className="field min-w-0 flex-1 py-1.5" />
          <button className="btn btn-sm btn-outline">Find</button>
        </form>
        {q && !found && <p className="text-sm text-muted">No account with that handle.</p>}
        {found && <AccountCard a={found} isAdmin={foundIsAdmin} />}
        <p className="text-meta text-muted">
          Suspending stops someone signing in, and their current session ends within the hour. Their posts stay up; remove them in Reports if needed.
        </p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="font-bold">Suspended ({suspended.length})</h2>
        {suspended.length === 0 ? <p className="text-sm text-muted">Nobody is suspended.</p> : suspended.map((a) => <AccountCard key={a.id} a={a} isAdmin={false} />)}
      </section>
      <section className="flex flex-col gap-2" aria-labelledby="hidden-players">
        <h2 id="hidden-players" className="font-bold">Hidden from player lookup{hiddenPlayers ? ` (${hiddenPlayers.length})` : ""}</h2>
        <p className="text-meta text-muted">
          For a start.gg player who asks not to be listed. A hidden player doesn&apos;t show in Search &gt; Players and has no player page or head-to-head card. Their name still shows in brackets, which
          come straight from start.gg.
        </p>
        <HidePlayerForm />
        {hiddenPlayers === null ? (
          <p className="text-sm text-muted">The list couldn&apos;t be loaded right now.</p>
        ) : hiddenPlayers.length === 0 ? (
          <p className="text-sm text-muted">Nobody is hidden.</p>
        ) : (
          <ul className="card divide-y divide-line">
            {hiddenPlayers.map((p) => (
              <li key={p.playerId} className="flex flex-wrap items-center gap-2 px-4 py-2 text-sm">
                <span className="min-w-0 flex-1">
                  <b>{p.prefix ? `${p.prefix} | ` : ""}{p.tag}</b> <span className="text-muted">· start.gg player {p.playerId} · since <LocalTime iso={p.since} style="date" /></span>
                </span>
                <form action={unhideStartggPlayer.bind(null, p.playerId)}>
                  <button className="btn btn-sm btn-outline">List again</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function PeoplePage(props: PageProps<"/admin/people">) {
  return (
    <section className="flex flex-col gap-4 p-4">
      <header className="pt-2">
        <Link href="/profile" className="text-sm text-muted hover:text-foreground">← Profile</Link>
        <h1 className="mt-2 text-2xl font-bold">Site admin</h1>
      </header>
      <AdminTabs active="people" />
      <Suspense fallback={<CardListSkeleton />}>
        <People searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
