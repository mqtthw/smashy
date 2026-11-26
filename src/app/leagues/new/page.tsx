// Start a league (step L1): name, game, where, when, how many weeks, playoffs.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getT } from "@/lib/i18n/server";
import { T } from "@/lib/i18n/client";
import { getUserId } from "@/lib/supabase/server";
import { NewLeagueForm } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("league.start") };
}

async function Form() {
  const [userId, t] = await Promise.all([getUserId(), getT()]);
  if (!userId) {
    return (
      <div className="card flex flex-col gap-3 p-4">
        <p>{t("league.new.signIn")}</p>
        <Link href="/signin?next=/leagues/new" className="btn btn-md btn-primary self-start">{t("signin.pageTitle")}</Link>
      </div>
    );
  }
  return <NewLeagueForm />;
}

export default function NewLeaguePage() {
  return (
    <section className="flex flex-col gap-4 p-4">
      <header>
        <Link href="/leagues" className="text-sm text-muted hover:underline">← <T k="league.title" /></Link>
        <h1 className="text-2xl font-bold"><T k="league.start" /></h1>
        <p className="text-sm text-muted"><T k="league.new.intro" /></p>
      </header>
      <Suspense fallback={null}>
        <Form />
      </Suspense>
    </section>
  );
}
