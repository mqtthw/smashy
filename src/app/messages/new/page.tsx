import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signInPath } from "@/lib/returnTo";
import { Suspense } from "react";
import { getMessageablePeople } from "@/lib/messages";
import { getUserId } from "@/lib/supabase/server";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import NewChat from "./NewChat";
import { LangProvider, T } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("ui.title.newMessage"), robots: { index: false } };
}

async function Picker() {
  if (!(await getUserId())) redirect(signInPath("/messages/new"));
  return (
    <LangProvider lang={await getLang()}>
      <NewChat mutuals={await getMessageablePeople("")} />
    </LangProvider>
  );
}

export default function NewMessagePage() {
  return (
    <section className="flex flex-col gap-4 p-4">
      <header className="flex flex-col gap-1">
        <Link href="/messages" className="text-meta text-muted hover:text-foreground"><T k="play.msg.backToMessages" /></Link>
        <h1 className="text-2xl font-bold"><T k="play.msg.new" /></h1>
        <p className="text-sm text-muted"><T k="play.msg.newIntro" /></p>
      </header>
      <Suspense fallback={<CardListSkeleton />}>
        <Picker />
      </Suspense>
    </section>
  );
}
