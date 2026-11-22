import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signInPath } from "@/lib/returnTo";
import { Suspense } from "react";
import { getUserId } from "@/lib/supabase/server";
import RequestSceneForm from "./form";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { LangProvider, T } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("ui.title.requestScene") };
}

async function Gate() {
  if (!(await getUserId())) redirect(signInPath("/scenes/request"));
  return (
    <LangProvider lang={await getLang()}>
      <RequestSceneForm />
    </LangProvider>
  );
}

export default function RequestScenePage() {
  return (
    <section className="mx-auto flex max-w-md flex-col gap-5 p-6">
      <header>
        <Link href="/scenes" className="text-sm text-muted hover:text-foreground"><T k="media.scenes.backToScenes" /></Link>
        <h1 className="mt-2 text-2xl font-bold"><T k="media.req.title" /></h1>
        <p className="text-muted">
          <T k="media.req.intro" />
        </p>
      </header>
      <Suspense fallback={<PageSkeleton />}>
        <Gate />
      </Suspense>
    </section>
  );
}
