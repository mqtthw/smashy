import { isRegion, regionName } from "@/lib/regions";
import { getViewerRegion } from "@/lib/viewerRegion";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import GameBadge from "@/components/GameBadge";
import { getActiveScenes, getMyPendingScenes } from "@/lib/scenes";
import { getUserId } from "@/lib/supabase/server";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { LangProvider, T } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Scenes & rulesets",
  description: "Local smash scenes and the rulesets they play by.",
};

async function SceneList({ searchParams }: { searchParams: PageProps<"/scenes">["searchParams"] }) {
  const userId = await getUserId();
  const [all, pending, params, myRegion, t, lang] = await Promise.all([
    getActiveScenes(),
    userId ? getMyPendingScenes(userId) : Promise.resolve([]),
    searchParams,
    getViewerRegion(userId),
    getT(),
    getLang(),
  ]);
  // Scenes made before regions store a US state code ("TX").
  const regionOf = (r: string) => (isRegion(r) ? r : isRegion(`US-${r}`) ? `US-${r}` : null);
  const near = all.filter((s) => regionOf(s.region) === myRegion);
  const scenes = [...near, ...all.filter((s) => regionOf(s.region) !== myRegion)];

  return (
    <LangProvider lang={lang}>
    <div className="flex flex-col gap-4">
      {params.requested && (
        <p className="rounded-lg bg-surface p-3 text-sm">{t("media.scenes.requested")}</p>
      )}
      {pending.map((s) => (
        <div key={s.id} className="rounded-2xl border border-dashed border-line p-4 text-sm">
          <b>{s.name}</b> <span className="text-muted">· {t(s.status === "rejected" ? "media.scenes.notApproved" : "media.scenes.waiting")}</span>
        </div>
      ))}

      {near.length === 0 && (
        <p className="rounded-lg bg-surface p-3 text-sm">
          {t("media.scenes.noneNear", { region: regionName(myRegion) })} {t(userId ? "media.scenes.requestBelow" : "media.scenes.joinToRequest")}
        </p>
      )}
      {scenes.length === 0 ? (
        <p className="text-muted">{t("media.scenes.none")}</p>
      ) : (
        <ul className="divide-y divide-line card">
          {scenes.map((s) => (
            <li key={s.id}>
              <Link href={`/scenes/${s.slug}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface">
                <div className="min-w-0">
                  <p className="font-bold">{s.name}</p>
                  <p className="truncate text-sm text-muted">
                    {s.cities.join(", ")}
                    {regionOf(s.region) && ` · ${regionName(regionOf(s.region))}`}
                    {regionOf(s.region) === myRegion && <span className="ml-1 rounded-full bg-brand/10 px-1.5 text-xs font-semibold text-brand">{t("media.scenes.nearYou")}</span>}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">{s.games.map((g) => <GameBadge key={g} game={g} />)}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {userId ? (
        <Link href="/scenes/request" className="self-start btn btn-md btn-outline">
          {t("media.scenes.requestNew")}
        </Link>
      ) : (
        <p className="text-sm text-muted">
          {t("media.scenes.runOne")} <Link href="/signin" className="text-brand">{t("media.scenes.join")}</Link> {t("media.scenes.toRequest")}
        </p>
      )}
    </div>
    </LangProvider>
  );
}

export default function ScenesPage(props: PageProps<"/scenes">) {
  return (
    <section className="flex flex-col gap-4 p-4">
      <header className="pt-2">
        <Link href="/events" className="text-sm text-muted hover:text-foreground"><T k="media.scenes.back" /></Link>
        <h1 className="mt-2 text-2xl font-bold"><T k="media.scenes.title" /></h1>
        <p className="text-muted">
          <T k="media.scenes.intro" />
        </p>
      </header>
      <Suspense fallback={<CardListSkeleton />}>
        <SceneList searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
