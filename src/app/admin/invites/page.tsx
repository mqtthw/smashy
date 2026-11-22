import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import AdminTabs from "@/components/admin/AdminTabs";
import { isInviteOnly, listInviteCodes } from "@/lib/invites";
import { isSiteAdmin } from "@/lib/scenes";
import { getUserId } from "@/lib/supabase/server";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { toggleInviteDisabled, toggleInviteOnly } from "../actions";
import MakeInviteForm from "./MakeInviteForm";
import InviteQR from "@/components/InviteQR";

export const metadata: Metadata = { title: "Invites", robots: { index: false } };

async function Invites() {
  if (!(await isSiteAdmin(await getUserId()))) notFound();
  const [inviteOnly, codes] = await Promise.all([isInviteOnly(), listInviteCodes()]);
  return (
    <div className="flex flex-col gap-6">
      <AdminTabs active="invites" />

      <section className="card flex flex-col gap-2 p-4 text-sm">
        <h2 className="font-bold">Private beta</h2>
        <p className="text-muted">
          {inviteOnly
            ? "Invite-only is ON: new people need a code to make a profile. Anyone can still browse as a guest."
            : "Invite-only is OFF: anyone 13+ can join."}
        </p>
        <form action={toggleInviteOnly.bind(null, !inviteOnly)}>
          <button className={`btn btn-sm ${inviteOnly ? "btn-outline" : "btn-primary"}`}>{inviteOnly ? "Open sign-ups to everyone" : "Turn invite-only back on"}</button>
        </form>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">Make an invite</h2>
        <MakeInviteForm />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">Codes ({codes.length})</h2>
        {codes.length === 0 && <p className="text-sm text-muted">No codes yet.</p>}
        <ul className="flex flex-col gap-2">
          {codes.map((c) => (
            <li key={c.code} className={`card flex flex-wrap items-center gap-3 p-3 text-sm ${c.disabled ? "opacity-60" : ""}`}>
              <span className="font-mono font-bold">{c.code}</span>
              <span className="min-w-0 flex-1 truncate text-muted">
                {c.note ?? "No note"} · used {c.uses} of {c.maxUses}
                {c.disabled ? " · turned off" : c.uses >= c.maxUses ? " · used up" : ""}
                {c.joined && c.joined.length > 0 && (
                  <span className="block truncate">
                    Joined:{" "}
                    {c.joined.map((h, i) => (
                      <span key={h}>
                        {i > 0 && ", "}
                        <Link href={`/u/${h}`} className="hover:underline">@{h}</Link>
                      </span>
                    ))}
                  </span>
                )}
              </span>
              {!c.disabled && c.uses < c.maxUses && <InviteQR code={c.code} usesLeft={c.maxUses - c.uses} />}
              <form action={toggleInviteDisabled.bind(null, c.code, !c.disabled)}>
                <button className={`btn btn-sm ${c.disabled ? "btn-outline" : "btn-ghost"}`}>{c.disabled ? "Turn on" : "Turn off"}</button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default function AdminInvitesPage() {
  return (
    <section className="flex flex-col gap-4 p-4">
      <header className="pt-2">
        <Link href="/profile" className="text-sm text-muted hover:text-foreground">← Profile</Link>
        <h1 className="mt-2 text-2xl font-bold">Site admin</h1>
      </header>
      <Suspense fallback={<CardListSkeleton />}>
        <Invites />
      </Suspense>
    </section>
  );
}
