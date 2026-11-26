// Suggest a missing major for Smash history (docs/archive-plan.md, step A4). A site admin reviews it
// before it shows; the viewer's own suggestions are listed with where they stand.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { T } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/core";
import { getT } from "@/lib/i18n/server";
import { majorHref } from "@/lib/handMajors";
import { getMyMoments, type Moment } from "@/lib/historyMoments";
import { getMySuggestions, type SuggestionStatus } from "@/lib/majorSuggestions";
import { pageMeta } from "@/lib/siteMeta";
import { getUserId } from "@/lib/supabase/server";
import SuggestForm from "./SuggestForm";

export const metadata: Metadata = pageMeta("Suggest for Smash history", "Suggest a Super Smash Bros. major or moment that is missing from Smash history on Smashy.", { robots: { index: false } });

const STATUS: Record<SuggestionStatus, MessageKey> = {
  pending: "history.suggest.status.pending",
  approved: "history.suggest.status.approved",
  rejected: "history.suggest.status.rejected",
};

async function Suggest({ searchParams }: { searchParams: PageProps<"/history/suggest">["searchParams"] }) {
  const sp = await searchParams;
  const initialKind = sp.kind === "moment" || sp.kind === "manual" ? sp.kind : "link";
  const userId = await getUserId();
  const t = await getT();
  if (!userId) {
    return (
      <Link href={`/signin?next=${encodeURIComponent("/history/suggest")}`} className="btn btn-md btn-primary self-start">
        {t("history.suggest.signIn")}
      </Link>
    );
  }
  const [majors, moments] = await Promise.all([getMySuggestions(userId).catch(() => []), getMyMoments(userId).catch((): Moment[] => [])]);
  // Majors first, then moments (each list newest first).
  const mine = [
    ...majors.map((s) => ({ id: s.id, title: s.title, status: s.status, href: s.status === "approved" && s.majorSlug ? majorHref(s.majorSlug) : null})),
    ...moments.map((m) => ({ id: m.id, title: m.title, status: m.status, href: m.status === "approved" ? `/history?year=${m.day.slice(0, 4)}` : null})),
  ];
  return (
    <>
      <SuggestForm initialKind={initialKind} />
      {mine.length > 0 && (
        <section aria-labelledby="my-suggestions" className="flex flex-col gap-2">
          <h2 id="my-suggestions" className="font-bold">{t("history.suggest.mine")}</h2>
          <ul className="card divide-y divide-line">
            {mine.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="min-w-0 flex-1 truncate">
                  {s.href ? (
                    <Link href={s.href} className="font-semibold hover:underline">{s.title}</Link>
                  ) : (
                    <span className="font-semibold">{s.title}</span>
                  )}
                </span>
                <span className={`shrink-0 text-meta ${s.status === "approved" ? "text-success" : "text-muted"}`}>{t(STATUS[s.status])}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export default function SuggestMajorPage(props: PageProps<"/history/suggest">) {
  return (
    <section className="flex flex-col gap-4 p-4">
      <Link href="/history" className="text-sm text-muted hover:text-foreground"><T k="history.major.back" /></Link>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold"><T k="history.suggest.title" /></h1>
        <p className="text-sm text-muted"><T k="history.suggest.intro" /></p>
      </header>
      <Suspense fallback={<CardListSkeleton count={2} />}>
        <Suggest searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
