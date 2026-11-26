import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import GameBadge from "@/components/GameBadge";
import StageStriker from "@/components/strike/StageStriker";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { STAGES } from "@/lib/rulesetFields";
import { getRuleset } from "@/lib/scenes";
import { rulesFromRuleset } from "@/lib/striking";
import { LangProvider } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";

export async function generateMetadata({ params }: PageProps<"/rulesets/[id]/strike">): Promise<Metadata> {
  const { id } = await params;
  const r = await getRuleset(id).catch(() => null);
  return r ? { title: `Strike stages: ${r.name}`, description: `Stage striking for a ${r.sceneName} ${r.game} set, on your phone.` } : { title: "Ruleset not found" };
}

async function Striker({ params }: { params: PageProps<"/rulesets/[id]/strike">["params"] }) {
  const { id } = await params;
  const [ruleset, t, lang] = await Promise.all([getRuleset(id).catch(() => null), getT(), getLang()]);
  if (!ruleset?.latest) notFound();
  const raw = ruleset.latest.rules as Record<string, unknown>;
  return (
    <LangProvider lang={lang}>
      <header className="flex flex-col gap-1">
        <Link href={`/rulesets/${ruleset.id}`} className="text-sm text-muted hover:text-foreground">← {ruleset.name}</Link>
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold">{t("browse.events.strikeStages")} <GameBadge game={ruleset.game} /></h1>
        <p className="text-sm text-muted">{t("browse.ruleset.strikeHint", { scene: ruleset.sceneName, n: ruleset.latest.version })}</p>
      </header>
      <StageStriker
        rules={rulesFromRuleset(raw, STAGES[ruleset.game])}
        gentlemans={raw.gentlemans === true}
        allStages={STAGES[ruleset.game]}
        rulesetName={t("browse.ruleset.sceneRules", { scene: ruleset.sceneName })}
        longFrom={typeof raw.best_of_top_from === "string" && raw.best_of_top_from.trim() ? raw.best_of_top_from.trim().slice(0, 40) : null}
        storageKey={`${ruleset.id}-v${ruleset.latest.version}`}
      />
    </LangProvider>
  );
}

export default function StrikePage(props: PageProps<"/rulesets/[id]/strike">) {
  return (
    <section className="flex flex-col gap-4 p-4">
      <Suspense fallback={<PageSkeleton />}>
        <Striker params={props.params} />
      </Suspense>
    </section>
  );
}
