import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import HostEventForm from "@/components/host/HostEventForm";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { getHostedEvent } from "@/lib/hostedEvents";
import { getAllRulesets } from "@/lib/scenes";
import { getUserId } from "@/lib/supabase/server";
import { LangProvider } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";
import { signInPath } from "@/lib/returnTo";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("ui.title.editEvent"), robots: { index: false } };
}

async function Form({ params }: { params: PageProps<"/host/[id]/edit">["params"] }) {
  const { id } = await params;
  const userId = await getUserId();
  if (!userId) redirect(signInPath(`/host/${id}/edit`));
  const [event, rulesets, t, lang] = await Promise.all([getHostedEvent(id), getAllRulesets().catch(() => []), getT(), getLang()]);
  if (!event || event.hostId !== userId) notFound();
  if (!["open", "closed"].includes(event.status)) redirect(`/host/${id}`);
  // An extra bracket of another event: its own short name, and no "where" (it's where the main event is).
  const main = event.parentId ? await getHostedEvent(event.parentId) : null;
  return (
    <LangProvider lang={lang}>
      <Link href={`/host/${id}`} className="text-sm text-muted hover:text-foreground">← {event.name}</Link>
      <h1 className="text-2xl font-bold">{t(main ? "hostsetup.edit.bracket" : "hostsetup.edit.event")}</h1>
      <HostEventForm
        event={event}
        main={main ? { id: main.id, name: main.name, startsAt: main.startsAt } : undefined}
        defaultGame={event.game}
        rulesets={rulesets.filter((r) => r.latest).map((r) => ({ id: r.id, name: r.name, sceneName: r.sceneName, game: r.game }))}
      />
    </LangProvider>
  );
}

export default function EditHostedEventPage(props: PageProps<"/host/[id]/edit">) {
  return (
    <section className="flex flex-col gap-4 p-4">
      <Suspense fallback={<PageSkeleton />}>
        <Form params={props.params} />
      </Suspense>
    </section>
  );
}
