import LocalTime from "@/components/ui/LocalTime";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment, Suspense, cache, type ReactNode } from "react";
import PostCard from "@/components/feed/PostCard";
import PostComposer from "@/components/feed/PostComposer";
import GameBadge from "@/components/GameBadge";
import RulesetView from "@/components/scenes/RulesetView";
import { unixNow } from "@/lib/format";
import { GAMES } from "@/lib/games";
import { getRulesetDiscussion } from "@/lib/posts";
import { getAllRulesets, getRuleset, isSceneAdmin } from "@/lib/scenes";
import { getUserId } from "@/lib/supabase/server";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { LangProvider, T } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";
import { signInPath } from "@/lib/returnTo";

/** A phrase with one {placeholder} filled by a React node (a link): pass MARK as its value. */
const MARK = "\u0001";
function withNode(text: string, node: ReactNode) {
  return <>{text.split(/(\u0001)/).map((part, i) => (part === MARK ? <Fragment key={i}>{node}</Fragment> : part))}</>;
}

// One read per page view (round 732): the page's title and the page itself ask for the same data, and
// Smashy's time-limited database calls aren't de-duplicated by Next, so each used to run twice.
const rulesetOnce = cache((id: string) => getRuleset(id));

export async function generateMetadata({ params }: PageProps<"/rulesets/[id]">): Promise<Metadata> {
  const { id } = await params;
  const r = await rulesetOnce(id).catch(() => null);
  return r ? { title: r.name, description: `${r.sceneName} ${GAMES[r.game].short} ruleset (v${r.latest?.version ?? 1}).` } : { title: "Ruleset not found" };
}


async function RulesetDetails({ params, searchParams }: Pick<PageProps<"/rulesets/[id]">, "params" | "searchParams">) {
  const [{ id }, { v }] = await Promise.all([params, searchParams]);
  const [userId, t, lang] = await Promise.all([getUserId(), getT(), getLang()]);
  const ruleset = await rulesetOnce(id);
  if (!ruleset || !ruleset.latest) notFound();

  const shown = ruleset.versions.find((x) => String(x.version) === v) ?? ruleset.latest;
  const isLatest = shown.version === ruleset.latest.version;
  const [canEdit, others, discussion] = await Promise.all([
    isSceneAdmin(ruleset.sceneId, userId),
    getAllRulesets(ruleset.game),
    getRulesetDiscussion(ruleset.id, userId),
  ]);
  const compareTargets = others.filter((o) => o.id !== ruleset.id && o.latest);
  const now = unixNow();

  return (
    <LangProvider lang={lang}>
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{ruleset.name}</h1>
          <GameBadge game={ruleset.game} />
        </div>
        <p className="text-sm text-muted">
          <Link href={`/scenes/${ruleset.sceneSlug}`} className="hover:text-foreground">{t("browse.ruleset.scene", { scene: ruleset.sceneName })}</Link> · {t("browse.ruleset.version", { n: shown.version })}
          {" · "}{t("browse.ruleset.published")} <LocalTime iso={shown.publishedAt} style="eventDate" />
          {shown.publishedBy && ` ${t("browse.ruleset.by", { name: shown.publishedBy })}`}
        </p>
        {!isLatest && (
          <p className="mt-2 rounded-lg bg-surface p-3 text-sm">
            {t("browse.ruleset.olderVersion")} <Link href={`/rulesets/${ruleset.id}`} className="text-brand">{t("browse.ruleset.seeCurrent", { n: ruleset.latest.version })}</Link>
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          {isLatest && (
            <Link href={`/rulesets/${ruleset.id}/strike`} className="btn btn-sm btn-primary">
              {t("browse.ruleset.strikeForSet")}
            </Link>
          )}
          {canEdit && isLatest && (
            <Link href={`/rulesets/${ruleset.id}/edit`} className="btn btn-sm btn-inverse">
              {t("browse.ruleset.publishChange")}
            </Link>
          )}
        </div>
      </header>

      <RulesetView game={ruleset.game} rules={shown.rules} notes={shown.notes} />

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">{t("browse.ruleset.compare")}</h2>
        {compareTargets.length === 0 ? (
          <p className="text-sm text-muted">{t("browse.ruleset.noOthers", { game: GAMES[ruleset.game].short })}</p>
        ) : (
          <form action="/rulesets/compare" className="flex flex-wrap items-center gap-2 text-sm">
            <input type="hidden" name="a" value={shown.id} />
            <span>{t("browse.ruleset.compareWith")}</span>
            <select name="b" className="field px-2 py-1">
              {compareTargets.map((o) => (
                <option key={o.id} value={o.latest!.id}>{o.sceneName}: {o.name}</option>
              ))}
            </select>
            <button className="btn btn-sm btn-outline">{t("browse.ruleset.showDifferences")}</button>
          </form>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">{t("browse.ruleset.history")}</h2>
        <ol className="divide-y divide-line card text-sm">
          {ruleset.versions.map((ver, i) => {
            const previous = ruleset.versions[i + 1];
            return (
              <li key={ver.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
                <Link href={`/rulesets/${ruleset.id}?v=${ver.version}`} className={`font-semibold ${ver.version === shown.version ? "text-brand" : ""}`}>
                  v{ver.version}
                </Link>
                <span className="text-muted"><LocalTime iso={ver.publishedAt} style="eventDate" /></span>
                <span className="min-w-0 flex-1">{ver.changelog ?? ""}</span>
                {previous && (
                  <Link href={`/rulesets/compare?a=${previous.id}&b=${ver.id}`} className="text-xs text-muted underline">
                    {t("browse.ruleset.whatChanged")}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section className="flex flex-col">
        <h2 className="mb-2 font-bold">{t("browse.ruleset.discussion")}</h2>
        <p className="mb-2 text-sm text-muted">{t("browse.ruleset.discussionHint")}</p>
        <div className="card">
          {userId ? (
            <PostComposer rulesetId={ruleset.id} placeholder={t("browse.ruleset.feedbackPlaceholder")} />
          ) : (
            <p className="border-b border-line px-4 py-3 text-sm text-muted">
              {withNode(t("browse.ruleset.joinToDiscuss", { link: MARK }), <Link href={signInPath(`/rulesets/${id}`)} className="text-brand">{t("browse.joinSmashy")}</Link>)}
            </p>
          )}
          {discussion.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">{t("browse.ruleset.noDiscussion")}</p>
          ) : (
            <div className="flex flex-col divide-y divide-line">
              {discussion.map((p) => <div key={p.id}><PostCard post={p} now={now} viewerId={userId} /></div>)}
            </div>
          )}
        </div>
      </section>
    </div>
    </LangProvider>
  );
}

export default function RulesetPage(props: PageProps<"/rulesets/[id]">) {
  return (
    <section className="flex flex-col gap-4 p-4">
      <Link href="/scenes" className="pt-2 text-sm text-muted hover:text-foreground"><T k="browse.ruleset.backScenes" /></Link>
      <Suspense fallback={<PageSkeleton />}>
        <RulesetDetails params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
}
