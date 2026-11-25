// Admin → Suggestions (round 653): what people sent from "Help build Smashy" (/help). Newest first; mark
// each one done (acted on) or dismissed. Admin pages are English only, like the rest of /admin.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import AdminTabs from "@/components/admin/AdminTabs";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { getOpenSuggestions } from "@/lib/communitySuggestions";
import { GAMES } from "@/lib/games";
import { isSiteAdmin } from "@/lib/scenes";
import { getUserId } from "@/lib/supabase/server";
import { closeCommunitySuggestion } from "../actions";

export const metadata: Metadata = { title: "Suggestions admin", robots: { index: false } };

const KIND = { resource: "Character resource", local: "Missing local", history: "Smash history", feedback: "Feedback" } as const;

async function SuggestionsAdmin() {
  if (!(await isSiteAdmin(await getUserId()))) notFound();
  const open = await getOpenSuggestions();
  return (
    <div className="flex flex-col gap-4">
      <AdminTabs active="suggestions" />
      <p className="text-sm text-muted">
        From <Link href="/help" className="link">Help build Smashy</Link>. Only admins see these. Contacts are for replying only.
      </p>
      {open.length === 0 && <p className="text-sm text-muted">Nothing waiting.</p>}
      <ul className="flex flex-col gap-2">
        {open.map((s) => (
          <li key={s.id} className="card flex flex-col gap-2 p-3 text-sm">
            <p className="flex flex-wrap items-center gap-2 text-meta text-muted">
              <span className="font-semibold text-foreground">{KIND[s.kind]}</span>
              {s.game && <span>{GAMES[s.game].short}</span>}
              {s.character && <span>· {s.character}</span>}
              <span>· {new Date(s.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</span>
              <span>· {s.fromMember ? "member" : "guest"}</span>
            </p>
            {s.link && (
              <a href={s.link} target="_blank" rel="noopener noreferrer nofollow" className="break-all font-semibold text-brand hover:underline">
                {s.link} ↗︎
              </a>
            )}
            {s.details && <p className="whitespace-pre-line break-words">{s.details}</p>}
            {s.contact && <p className="text-meta text-muted">Reply to: <span className="break-all">{s.contact}</span></p>}
            <div className="flex gap-2">
              <form action={closeCommunitySuggestion.bind(null, s.id, "done")}>
                <button className="btn btn-sm btn-primary">Done</button>
              </form>
              <form action={closeCommunitySuggestion.bind(null, s.id, "dismissed")}>
                <button className="btn btn-sm btn-outline">Dismiss</button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminSuggestionsPage() {
  return (
    <section className="flex flex-col gap-4 p-4">
      <header className="pt-2">
        <Link href="/profile" className="text-sm text-muted hover:text-foreground">← Profile</Link>
        <h1 className="mt-2 text-2xl font-bold">Site admin</h1>
      </header>
      <Suspense fallback={<CardListSkeleton />}>
        <SuggestionsAdmin />
      </Suspense>
    </section>
  );
}
