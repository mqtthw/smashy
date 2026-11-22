import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import RulesetEditor from "@/components/scenes/RulesetEditor";
import { getRuleset, isSceneAdmin } from "@/lib/scenes";
import { getUserId } from "@/lib/supabase/server";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { LangProvider } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("ui.title.publishChange") };
}

async function Editor({ params }: Pick<PageProps<"/rulesets/[id]/edit">, "params">) {
  const { id } = await params;
  const [userId, t, lang] = await Promise.all([getUserId(), getT(), getLang()]);
  const ruleset = await getRuleset(id);
  if (!ruleset?.latest || !(await isSceneAdmin(ruleset.sceneId, userId))) notFound();
  return (
    <LangProvider lang={lang}>
      <Link href={`/rulesets/${ruleset.id}`} className="pt-2 text-sm text-muted hover:text-foreground">← {ruleset.name}</Link>
      <h1 className="text-2xl font-bold">{t("browse.ruleset.publishChange")}</h1>
      <p className="text-muted">
        {t("browse.ruleset.createsVersion", { next: ruleset.latest.version + 1, n: ruleset.latest.version })}
      </p>
      <RulesetEditor mode="publish" rulesetId={ruleset.id} game={ruleset.game} rules={ruleset.latest.rules} notes={ruleset.latest.notes} />
    </LangProvider>
  );
}

export default function EditRulesetPage(props: PageProps<"/rulesets/[id]/edit">) {
  return (
    <section className="flex flex-col gap-4 p-4">
      <Suspense fallback={<PageSkeleton />}>
        <Editor params={props.params} />
      </Suspense>
    </section>
  );
}
