import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import RulesetEditor from "@/components/scenes/RulesetEditor";
import { getScene, isSceneAdmin } from "@/lib/scenes";
import { getUserId } from "@/lib/supabase/server";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { LangProvider, T } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("ui.title.newRuleset") };
}

async function Editor({ params }: Pick<PageProps<"/scenes/[slug]/rulesets/new">, "params">) {
  const { slug } = await params;
  const userId = await getUserId();
  const data = await getScene(slug);
  if (!data || !(await isSceneAdmin(data.scene.id, userId))) notFound();
  const [t, lang] = await Promise.all([getT(), getLang()]);
  return (
    <LangProvider lang={lang}>
      <h1 className="text-2xl font-bold">{t("media.scene.newTitle", { name: data.scene.name })}</h1>
      <p className="text-muted">{t("media.scene.newIntro")}</p>
      <RulesetEditor mode="create" sceneId={data.scene.id} games={data.scene.games.length ? data.scene.games : ["melee", "ultimate", "pplus"]} />
    </LangProvider>
  );
}

export default function NewRulesetPage(props: PageProps<"/scenes/[slug]/rulesets/new">) {
  return (
    <section className="flex flex-col gap-4 p-4">
      <Link href=".." className="pt-2 text-sm text-muted hover:text-foreground"><T k="media.scene.backToScene" /></Link>
      <Suspense fallback={<PageSkeleton />}>
        <Editor params={props.params} />
      </Suspense>
    </section>
  );
}
