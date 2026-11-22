import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient, getUserId } from "@/lib/supabase/server";
import { PageSkeleton } from "@/components/ui/Skeleton";
import DeleteAccountForm from "./form";
import { LangProvider, T } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("ui.title.deleteAccount"), robots: { index: false } };
}

async function Content() {
  const userId = await getUserId();
  if (!userId) redirect("/signin");
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("handle").eq("id", userId).maybeSingle();
  if (!profile) redirect("/welcome");
  return (
    <LangProvider lang={await getLang()}>
      <DeleteAccountForm handle={profile.handle} />
    </LangProvider>
  );
}

export default function DeleteAccountPage() {
  return (
    <section className="mx-auto flex max-w-xl flex-col gap-4 p-6">
      <header className="flex flex-col gap-1">
        <Link href="/profile" className="text-meta text-muted hover:text-foreground"><T k="people.delete.back" /></Link>
        <h1 className="text-2xl font-bold"><T k="people.delete.title" /></h1>
      </header>
      <div className="card flex flex-col gap-2 p-4 text-sm">
        <p className="font-semibold"><T k="people.delete.lead" /></p>
        <ul className="list-disc pl-5 text-muted">
          <li><T k="people.delete.item1" /></li>
          <li><T k="people.delete.item2" /></li>
          <li><T k="people.delete.item3" /></li>
          <li><T k="people.delete.item4" /></li>
        </ul>
        <p className="text-muted"><T k="people.delete.scenes" /></p>
        <p className="text-muted"><T k="people.delete.noUndo" /></p>
      </div>
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </section>
  );
}
