import type { Metadata } from "next";
import Link from "next/link";
import { isSiteAdmin } from "@/lib/scenes";
import { notFound, redirect } from "next/navigation";
import { signInPath } from "@/lib/returnTo";
import { Suspense } from "react";
import HostEventForm from "@/components/host/HostEventForm";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { GAME_KEYS, type GameKey } from "@/lib/games";
import { getAllRulesets } from "@/lib/scenes";
import { getUserId } from "@/lib/supabase/server";
import { getEventsHostedBy, getHostedEvent } from "@/lib/hostedEvents";
import { getMyGames } from "@/lib/viewer";
import { LangProvider } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("ui.title.hostEvent"), robots: { index: false } };
}

async function Form({ searchParams }: { searchParams: PageProps<"/host/new">["searchParams"] }) {
  const userId = await getUserId();
  const { parent } = await searchParams;
  const mainId = typeof parent === "string" ? parent : "";
  if (!userId) redirect(signInPath(mainId ? `/host/new?parent=${encodeURIComponent(mainId)}` : "/host/new"));
  const [rulesets, myGames, mine, main, t, lang, admin] = await Promise.all([
    getAllRulesets().catch(() => []),
    getMyGames(userId),
    mainId ? Promise.resolve([]) : getEventsHostedBy(userId).catch(() => []),
    mainId ? getHostedEvent(mainId) : Promise.resolve(null),
    getT(),
    getLang(),
    isSiteAdmin(userId).catch(() => false),
  ]);
  const options = rulesets.filter((r) => r.latest).map((r) => ({ id: r.id, name: r.name, sceneName: r.sceneName, game: r.game }));
  if (mainId) {
    // An extra bracket (Redemption, a second game) for one of your own events.
    if (!main || main.hostId !== userId || main.parentId || main.removed || main.status === "canceled") notFound();
    return (
      <LangProvider lang={lang}>
        <Link href={`/host/${main.id}`} className="text-sm text-muted hover:text-foreground">← {main.name}</Link>
        <header>
          <h1 className="text-2xl font-bold">{t("hostsetup.new.addBracket")}</h1>
          <p className="text-sm text-muted">{t("hostsetup.new.addBracketIntro")}</p>
        </header>
        <HostEventForm
          main={{ id: main.id, name: main.name, startsAt: main.startsAt }}
          defaultGame={main.game}
          // Starts from the main event's settings: the same game, ruleset and set lengths, no check-in of its own.
          template={{ ...main, checkinMinutes: 0, description: null }}
          rulesets={options}
        />
      </LangProvider>
    );
  }
  // Start from the host's most recently created event (most hosts run the same kind of event each time).
  const last = [...mine].filter((e) => !e.removed).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const first = (myGames.find((g) => GAME_KEYS.includes(g as GameKey)) as GameKey | undefined) ?? "melee";
  return (
    <LangProvider lang={lang}>
      <Link href="/events" className="text-sm text-muted hover:text-foreground">{t("event.backToEvents")}</Link>
      <header>
        <h1 className="text-2xl font-bold">{t("hostsetup.new.title")}</h1>
        <p className="text-sm text-muted">{t("hostsetup.new.intro")} <Link href="/host/about" className="link">{t("hostsetup.new.howItWorks")}</Link> · <Link href="/host/demo" className="link">{t("hostsetup.new.tryDemo")}</Link></p>
      </header>
      <HostEventForm defaultGame={first} template={last} rulesets={options} canHostOfficial={admin} />
    </LangProvider>
  );
}

export default function NewHostedEventPage(props: PageProps<"/host/new">) {
  return (
    <section className="mx-auto flex max-w-xl flex-col gap-4 p-4">
      <Suspense fallback={<PageSkeleton />}>
        <Form searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
